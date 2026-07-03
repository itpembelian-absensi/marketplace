const { GoogleGenerativeAI } = require("@google/generative-ai");

// In-memory sessions for context and rate limiting
const sessions = {};

// Clean up old sessions every 10 mins
setInterval(() => {
  const now = Date.now();
  for (const phone in sessions) {
    if (now - sessions[phone].lastMessageAt > 30 * 60 * 1000) {
      delete sessions[phone]; // 30 min TTL
    }
  }
}, 10 * 60 * 1000);

async function handleWebhook({ req, res, getQuery, allQuery, runQuery }) {
  // Parse incoming webhook body
  const body = req.body;
  console.log("===============================");
  console.log("WEBHOOK INCOMING:", JSON.stringify(body));
  
  if (!body || !body.sender) {
    console.log("Ignored - missing sender");
    return res.status(200).json({ status: true, message: "Ignored - missing sender" });
  }

  // Get WhatsApp Bot Settings from DB to see if it's enabled
  let waSettings = null;
  try {
    const row = await getQuery("SELECT value FROM app_settings WHERE key = 'whatsapp_settings'");
    waSettings = row && row.value ? JSON.parse(row.value) : { enabled: false };
  } catch(e) {
    console.error("Error reading WA settings:", e);
  }

  console.log("WA Settings from DB:", waSettings);

  // If bot is disabled in admin, don't auto-reply
  if (!waSettings || !waSettings.enabled) {
    console.log("Bot is disabled, ignoring.");
    return res.status(200).json({ status: true, message: "Bot is disabled" });
  }

  const phone = body.sender;
  const message = (body.message || body.text || "").trim();
  
  // Ignore status broadcasts, empty payloads, and echoes from the device itself
  if (!phone || phone === "status@broadcast") {
    return res.status(200).json({ status: true, message: "Ignored status" });
  }
  if (body.device && phone.replace(/\D/g, "") === String(body.device).replace(/\D/g, "")) {
    return res.status(200).json({ status: true, message: "Ignored self-echo" });
  }
  if (!message) {
    return res.status(200).json({ status: true, message: "Ignored empty message" });
  }
  
  // Rate limiting per phone
  const now = Date.now();
  if (!sessions[phone]) {
    sessions[phone] = { messages: [], lastMessageAt: now, count: 0 };
  }
  const session = sessions[phone];
  
  // Reset rate limit every minute
  if (now - session.lastMessageAt > 60 * 1000) {
    session.count = 0;
  }
  session.lastMessageAt = now;
  session.count++;
  
  if (session.count > 15) { // max 15 msgs per minute
    return res.status(200).json({ status: true, message: "Rate limited" });
  }

  session.messages.push({ role: "user", content: message });
  if (session.messages.length > 6) session.messages.shift(); // Keep last 6 messages

  try {
    const aiResponse = await processWithGemini(message, phone, session.messages, { getQuery, allQuery });
    
    // Send response via Fonnte or other provider
    await sendFonnteMessage(phone, aiResponse, body.inboxid);
    
    // Save model response to session
    session.messages.push({ role: "model", content: aiResponse });
    
    // Log conversation to DB
    await runQuery(
      "INSERT INTO whatsapp_sessions (phone, message_in, message_out) VALUES (?, ?, ?)",
      [phone, message, aiResponse]
    ).catch(err => console.error("Failed to log WA session:", err));

    return res.status(200).json({ status: true, message: "Replied" });
  } catch (error) {
    console.error("WhatsApp Bot Error:", error);
    // Send a fallback message
    const fallback = waSettings.fallbackMessage || "Maaf, Sasa sedang mengalami gangguan teknis. Mohon tunggu sebentar ya.";
    await sendFonnteMessage(phone, fallback, body.inboxid);
    return res.status(200).json({ status: true, message: "Replied with fallback" });
  }
}

async function processWithGemini(message, phone, contextMsgs, { getQuery, allQuery }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  // 1. Get Company Info
  let companyInfo = {
    name: "PT SAHABAT JAYA SUKSES",
    tagline: "Your Board Solusions",
    email: "info@company.com",
    address: "(alamat perusahaan)"
  };
  try {
    const companyRow = await getQuery("SELECT value FROM app_settings WHERE key = 'company_profile'");
    if (companyRow && companyRow.value) {
      companyInfo = { ...companyInfo, ...JSON.parse(companyRow.value) };
    }
  } catch(e) {}

  // 2. Intent Detection using Gemini
  const intentPrompt = `
Analyze the user's message and determine the INTENT and any parameters.
User message: "${message}"

Available intents:
1. "SEARCH_PRODUCT" - if user is asking to find/buy a product, or asking about price/stock. Params: "query" (what they are looking for).
2. "CHECK_ORDER" - if user is asking about order status. Params: "order_id" (number).
3. "GENERAL" - for greetings, company info, or anything else.

Reply ONLY with a JSON object:
{"intent": "...", "params": {"query": "...", "order_id": null}}
`;

  let intentData = { intent: "GENERAL", params: {} };
  try {
     const intentResult = await model.generateContent(intentPrompt);
     const responseText = intentResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
     intentData = JSON.parse(responseText);
  } catch(e) {
     console.error("Intent parsing error", e);
  }

  let dbContext = "";

  // 3. Database Lookup based on Intent
  if (intentData.intent === "SEARCH_PRODUCT" && intentData.params.query) {
     const searchQuery = `%${intentData.params.query}%`;
     const products = await allQuery(
       "SELECT name, price, stock, stock_sjs, stock_sjl, category, description FROM products WHERE name LIKE ? OR category LIKE ? LIMIT 5", 
       [searchQuery, searchQuery]
     );
     if (products.length > 0) {
        dbContext = "Product search results from DB:\n" + products.map(p => 
          `- ${p.name} (Kategori: ${p.category})\n  Harga: Rp ${p.price}\n  Stok SJS: ${p.stock_sjs}, Stok SJL: ${p.stock_sjl}\n  Deskripsi Singkat: ${(p.description || "").substring(0, 50)}...`
        ).join("\n\n");
     } else {
        dbContext = "Produk yang dicari tidak ditemukan di database.";
     }
  } else if (intentData.intent === "CHECK_ORDER" && intentData.params.order_id) {
     const orderIdStr = String(intentData.params.order_id).replace(/\D/g, ''); // Extract numbers
     if (orderIdStr) {
       const order = await getQuery(
         "SELECT id, status, total, shipping_method, customer_name FROM orders WHERE id = ?", 
         [orderIdStr]
       );
       if (order) {
          dbContext = `Data Pesanan:\nOrder ID: #${order.id}\nNama Pelanggan: ${order.customer_name}\nStatus Pembayaran: ${order.status}\nTotal: Rp ${order.total}\nPengiriman: ${order.shipping_method}`;
       } else {
          dbContext = `Pesanan dengan ID #${orderIdStr} tidak ditemukan.`;
       }
     } else {
       dbContext = "User tidak memberikan ID pesanan yang valid.";
     }
  }

  // 4. Generate Final Response
  // Format context history
  const historyText = contextMsgs.map(m => `${m.role === 'user' ? 'Customer' : 'Sasa'}: ${m.content}`).join("\n");

  const prompt = `
Kamu adalah "Sasa", asisten virtual (customer service chatbot) yang ramah, sopan, dan sangat membantu untuk perusahaan bernama ${companyInfo.name} (${companyInfo.tagline}).
Informasi Perusahaan: Alamat: ${companyInfo.address}, Email: ${companyInfo.email}.

Berikut adalah riwayat percakapan singkat:
${historyText}

${dbContext ? `\nINFORMASI DARI DATABASE (Gunakan ini untuk menjawab pelanggan):\n${dbContext}\n` : ""}

Aturan Menjawab:
1. Jawab dalam Bahasa Indonesia yang ramah, sopan, dan kasual (seperti CS yang ramah). Gunakan emoji secukupnya.
2. JANGAN MEMBUAT-BUAT DATA! Jika pelanggan bertanya tentang stok atau harga produk, gunakan "INFORMASI DARI DATABASE" di atas. Jika produk tidak ditemukan di info tersebut, katakan mohon maaf produk tidak ditemukan.
3. JANGAN memberikan harga yang salah.
4. Jika pelanggan bertanya tentang pesanan, sampaikan status pesanan berdasarkan "INFORMASI DARI DATABASE".
5. Jika pesan pelanggan adalah salam pembuka, sapa kembali dengan ramah, sebutkan namamu "Sasa", dan tawarkan bantuan (misalnya cek ketersediaan barang atau cek status order).
6. Berikan jawaban yang singkat, padat, dan jelas (cocok untuk dibaca di WhatsApp). Gunakan format tebal (bold dengan *text*) untuk hal-hal penting seperti harga atau status.

Sekarang, buat balasan untuk pesan terakhir pelanggan: "${message}"
`;

  const finalResult = await model.generateContent(prompt);
  return finalResult.response.text();
}

async function sendFonnteMessage(phone, message, inboxid) {
  const token = process.env.FONNTE_API_TOKEN;
  if (!token) {
    console.log("[SIMULATION] WhatsApp message to", phone, ":", message);
    return; // Simulate if no token
  }
  
  try {
    let target = String(phone).replace(/\D/g, "");
    if (target.startsWith("0")) {
      target = "62" + target.substring(1);
    }

    const payload = {
      target,
      message,
      delay: "1",
    };
    if (inboxid) payload.inboxid = inboxid;

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    const json = await res.json();
    if (!json.status) {
      console.error("Fonnte Send Error:", json.reason || json.detail || json);
    } else {
      console.log("Fonnte message sent to", target);
    }
  } catch (error) {
    console.error("Fonnte Fetch Error:", error);
  }
}

module.exports = {
  handleWebhook
};
