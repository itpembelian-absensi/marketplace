const { GoogleGenerativeAI } = require("@google/generative-ai");

const STOP_WORDS = new Set([
  "yang", "untuk", "dengan", "dari", "pada", "ini", "itu", "apa", "berapa", "ada",
  "kah", "saya", "mau", "beli", "dong", "ya", "kak", "min", "halo", "hai", "hello",
  "tolong", "mohon", "bantu", "bisa", "minta", "info", "informasi", "produk",
  "barang", "harga", "stok", "stock", "fungsi", "kegunaan", "apakah", "bagaimana",
  "cara", "order", "pesan", "the", "and", "atau", "juga", "sudah", "belum",
]);

function formatRupiah(amount) {
  return `Rp ${Math.round(Number(amount) || 0).toLocaleString("id-ID")}`;
}

function finalPrice(price, discount) {
  const safePrice = Number(price) || 0;
  const safeDiscount = Math.min(95, Math.max(0, Math.round(Number(discount) || 0)));
  return Math.round((safePrice * (100 - safeDiscount)) / 100);
}

function extractKeywords(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .slice(0, 6);
}

function parseSizes(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatProduct(product) {
  const discount = Number(product.discount) || 0;
  const sale = finalPrice(product.price, discount);
  const priceText =
    discount > 0
      ? `${formatRupiah(sale)} (diskon ${discount}% dari ${formatRupiah(product.price)})`
      : formatRupiah(product.price);
  const sizes = parseSizes(product.sizes);
  const sizeText = sizes
    .map((item) => {
      const stock =
        Math.max(0, Number(item.stock_sjs) || 0) + Math.max(0, Number(item.stock_sjl) || 0);
      const sizePrice = finalPrice(item.price, discount);
      return `${item.size}: ${formatRupiah(sizePrice)}, stok ${stock}`;
    })
    .join("; ");
  const stock =
    Number(product.stock) ||
    Math.max(0, Number(product.stock_sjs) || 0) + Math.max(0, Number(product.stock_sjl) || 0);
  const description = String(product.description || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
  return [
    `- ${product.name} | kategori: ${product.category || "-"} / ${product.subcategory || "-"}`,
    `  Harga jual: ${priceText}`,
    `  Stok: ${stock}${sizeText ? ` | Varian: ${sizeText}` : ""}`,
    description ? `  Fungsi/deskripsi: ${description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function loadCompany(getQuery) {
  const info = {
    name: "PT SAHABAT JAYA SUKSES",
    tagline: "Your Board Solusions",
    about: "",
    email: "",
    phone: "",
    address: "",
  };
  try {
    const row = await getQuery("SELECT value FROM app_settings WHERE key = 'company_profile'");
    if (row?.value) Object.assign(info, JSON.parse(row.value));
  } catch {
    /* keep defaults */
  }
  return info;
}

async function loadShippingSummary(getQuery) {
  try {
    const row = await getQuery("SELECT value FROM app_settings WHERE key = 'shipping_settings'");
    const settings = row?.value ? JSON.parse(row.value) : {};
    const lines = [];
    if (settings.storeDelivery?.enabled !== false) {
      const perKm = Number(settings.storeDelivery?.perKmRate) || 0;
      const flat = Number(settings.storeDelivery?.flatFee) || 0;
      lines.push(
        perKm > 0
          ? `Kirim mobil toko: dihitung per km (min ${formatRupiah(flat)})`
          : `Kirim mobil toko: tarif flat ${formatRupiah(flat)}`
      );
    }
    if (settings.lalamove?.enabled !== false) lines.push("Lalamove tersedia");
    if (settings.gosend?.enabled !== false) lines.push("GoSend tersedia");
    return lines.join("; ") || "Ongkir dihitung di keranjang sesuai alamat pelanggan.";
  } catch {
    return "Ongkir dihitung di keranjang sesuai alamat pelanggan.";
  }
}

async function searchProducts(message, allQuery) {
  const keywords = extractKeywords(message);
  const selectSql =
    "SELECT id, name, category, subcategory, price, discount, description, stock, stock_sjs, stock_sjl, sizes FROM products";
  const found = new Map();

  const addRows = (rows) => {
    for (const row of rows || []) {
      if (row?.id && !found.has(row.id)) found.set(row.id, row);
    }
  };

  if (keywords.length) {
    for (const word of keywords) {
      const like = `%${word}%`;
      const rows = await allQuery(
        `${selectSql} WHERE name LIKE ? OR category LIKE ? OR subcategory LIKE ? OR description LIKE ? LIMIT 8`,
        [like, like, like, like]
      );
      addRows(rows);
      if (found.size >= 8) break;
    }
  }

  if (!found.size) {
    const latest = await allQuery(`${selectSql} ORDER BY id DESC LIMIT 6`);
    addRows(latest);
  }

  return Array.from(found.values()).slice(0, 8);
}

async function findOrder(message, getQuery) {
  const match = String(message || "").match(/(?:pesanan|order|invoice|#)\s*(\d{1,8})/i) || String(message || "").match(/\b(\d{4,8})\b/);
  if (!match) return "";
  const orderId = match[1];
  const order = await getQuery(
    "SELECT id, status, total, shipping_method, customer_name FROM orders WHERE id = ?",
    [orderId]
  );
  if (!order) return `Pesanan #${orderId} tidak ditemukan.`;
  return `Pesanan #${order.id}, pelanggan: ${order.customer_name}, status: ${order.status}, total: ${formatRupiah(order.total)}, kirim: ${order.shipping_method || "-"}.`;
}

function buildHistoryText(history) {
  return (Array.isArray(history) ? history : [])
    .slice(-8)
    .map((item) => {
      const role = item.role === "user" ? "Customer" : "Sasa";
      return `${role}: ${String(item.content || "").slice(0, 500)}`;
    })
    .join("\n");
}

async function answerCustomerQuestion({ message, history = [], getQuery, allQuery }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diisi di .env");
  }

  const text = String(message || "").trim().slice(0, 800);
  if (!text) {
    throw new Error("Pesan kosong.");
  }

  const [company, products, shipping, orderInfo] = await Promise.all([
    loadCompany(getQuery),
    searchProducts(text, allQuery),
    loadShippingSummary(getQuery),
    findOrder(text, getQuery),
  ]);

  const productBlock = products.length
    ? products.map(formatProduct).join("\n")
    : "Tidak ada produk yang cocok di katalog.";

  const modelCandidates = [
    process.env.GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ].filter(Boolean);

  const prompt = `Kamu adalah Sasa, AI customer service SEMENTARA untuk ${company.name} (${company.tagline || "toko online"}).
Tugasmu menjawab pertanyaan penjualan sambil menunggu CS manusia.

Profil toko:
- Nama: ${company.name}
- Tentang: ${company.about || "-"}
- Alamat: ${company.address || "-"}
- Telepon/WA: ${company.phone || "-"}
- Email: ${company.email || "-"}
- Pengiriman: ${shipping}

KATALOG PRODUK (satu-satunya sumber harga, stok, fungsi):
${productBlock}

${orderInfo ? `DATA PESANAN:\n${orderInfo}\n` : ""}
Riwayat singkat:
${buildHistoryText(history) || "(baru mulai)"}

Pesan pelanggan: "${text}"

Aturan ketat:
1. Jawab Bahasa Indonesia, ramah, singkat, seperti CS toko.
2. Hanya bahas penjualan di toko ini: produk, harga, diskon, stok, ukuran, fungsi/deskripsi, cara beli di website, ongkir, dan status pesanan jika datanya ada.
3. JANGAN mengarang harga, stok, atau spesifikasi. Jika tidak ada di KATALOG PRODUK, bilang belum ada di data dan tawarkan CS manusia.
4. Jika pertanyaan di luar penjualan (politik, medis, coding, dll), tolak sopan dan arahkan ke topik toko.
5. Sebut bahwa kamu AI yang jawab sementara; untuk transaksi/komplain rumit, lanjut ke CS manusia via WhatsApp.
6. Jangan minta data kartu kredit. Arahkan checkout ke website.
7. Format harga dengan Rp. Gunakan *teks* untuk penekanan penting.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;
  for (const modelName of [...new Set(modelCandidates)]) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const reply = String(result.response?.text() || "").trim();
      if (reply) return reply;
    } catch (error) {
      lastError = error;
      console.error("Gemini model failed:", modelName, error.message || error);
    }
  }
  if (lastError) {
    throw new Error("Sasa sedang sibuk. Silakan tanya lagi atau lanjut ke WhatsApp CS.");
  }
  return "Maaf, Sasa belum bisa menjawab sekarang. Silakan lanjut ke CS manusia via WhatsApp atau tanya lagi tentang produk dan harga di toko ini.";
}

module.exports = {
  answerCustomerQuestion,
};
