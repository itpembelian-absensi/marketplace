const { answerCustomerQuestion } = require("./cs-ai");

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
  return answerCustomerQuestion({
    message,
    history: contextMsgs,
    getQuery,
    allQuery,
  });
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
