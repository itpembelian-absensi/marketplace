require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client();
const {
  DEFAULT_SHIPPING_SETTINGS,
  mergeShippingSettings,
  getShippingOptions,
  calculateShippingQuote,
} = require("./lib/shipping");
const { ensurePictureDirs, isValidFolder, processUpload } = require("./lib/media");
const { handleWebhook } = require("./lib/whatsapp-bot");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-marketplace";
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "";
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";
const dbPath = path.join(__dirname, "data", "marketplace.db");
const db = new sqlite3.Database(dbPath);
const uploadDir = path.join(__dirname, "public", "picture");
const productUploadDir = path.join(__dirname, "public", "product");
const bannerUploadDir = path.join(__dirname, "public", "banner");
const profileUploadDir = path.join(__dirname, "public", "profile_pictures");
const qrisUploadDir = path.join(__dirname, "public", "qris");
const DEFAULT_LOGO_URL = "/logo-sjs.png";
const DEFAULT_COMPANY_PROFILE = {
  name: "PT SAHABAT JAYA SUKSES",
  tagline: "Your Board Solusions",
  about:
    "PT SAHABAT JAYA SUKSES berfokus pada penyediaan produk berkualitas untuk kebutuhan harian. Kami berkomitmen pada layanan yang cepat, aman, dan transparan.",
  vision: "Menjadi mitra terpercaya dalam penyediaan produk yang bernilai dan mudah diakses.",
  mission: "Memberikan pengalaman yang sederhana, cepat, dan aman melalui platform digital.",
  email: "info@company.com",
  phone: "08xx-xxxx-xxxx",
  address: "(isi alamat perusahaan)",
};

const DEFAULT_HOME_PAGE = {
  tagline: "Your Board Solusions",
  sectionTitle: "Satu tempat yang bikin #SemuaJadiSimple",
  slides: [
    {
      imageUrl: "",
      title: "Registrasi Gratis Biaya Admin!",
      subtitle:
        "Pengguna akan mendapatkan gratis biaya admin pada 10 pembelian pertama selama periode promo member berlangsung.*",
      ctaText: "Registrasi Member",
      ctaLink: "/register.html",
      footnote: "*Periode promo: ... - ... 2026",
    },
  ],
  features: Array.from({ length: 7 }, () => ({
    imageUrl: "",
    title: "",
    description: "",
    link: "",
  })),
  aboutSection: {
    stats: [
      { value: "1.000+", label: "Produk Terjual", icon: "box", style: "light" },
      { value: "500+", label: "Total Proyek", icon: "tools", style: "dark" },
      { value: "70+", label: "Rekan & Mitra", icon: "people", style: "light" },
    ],
    title: "Pengiriman Multi-Wilayah",
    subtitle: "Menjangkau pengiriman ke berbagai daerah di Indonesia",
    gallery: Array.from({ length: 4 }, () => ({ imageUrl: "" })),
  },
  footerSection: {
    newsletterTitle: "Jangan sampai ketinggalan informasi\n& promo dari kami!",
    emailPlaceholder: "Masukkan e-mail...",
    buttonText: "Kirim",
    socialLinks: [
      { platform: "instagram", url: "#" },
      { platform: "facebook", url: "#" },
      { platform: "tiktok", url: "#" },
    ],
    columns: [
      {
        title: "Bantuan Pengguna",
        links: [
          { label: "Cara Berbelanja", url: "#" },
          { label: "Pertanyaan Umum", url: "#" },
        ],
      },
      {
        title: "Kerja Sama & Kolaborasi",
        links: [
          { label: "Pembelian Retail", url: "#" },
          { label: "Kerja Sama Bisnis", url: "#" },
        ],
      },
      {
        title: "Kebijakan Kami",
        links: [
          { label: "Ketentuan Pengguna", url: "#" },
          { label: "Pengembalian Produk", url: "#" },
          { label: "Kebijakan Privasi", url: "#" },
          { label: "Ketentuan Pengiriman", url: "#" },
        ],
      },
    ],
    copyright: "Copyright © 2026 - PT Sahabat Jaya Sukses",
  },
};

function normalizeAboutSection(raw) {
  const defaults = DEFAULT_HOME_PAGE.aboutSection;
  const base = { ...defaults, ...(raw || {}) };
  const stats = Array.isArray(base.stats) && base.stats.length
    ? base.stats
    : defaults.stats;
  base.stats = stats.slice(0, 3).map((item, index) => ({
    ...(defaults.stats[index] || { value: "", label: "", icon: "box", style: "light" }),
    value: String(item?.value || "").trim(),
    label: String(item?.label || "").trim(),
    icon: String(item?.icon || "box").trim(),
    style: item?.style === "dark" ? "dark" : "light",
  }));
  while (base.stats.length < 3) {
    base.stats.push({ ...(defaults.stats[base.stats.length] || defaults.stats[0]) });
  }
  base.title = String(base.title || defaults.title).trim();
  base.subtitle = String(base.subtitle || defaults.subtitle).trim();
  const gallery = Array.isArray(base.gallery) && base.gallery.length ? base.gallery : defaults.gallery;
  base.gallery = gallery.slice(0, 4).map((item, index) => ({
    ...(defaults.gallery[index] || { imageUrl: "" }),
    imageUrl: String(item?.imageUrl || "").trim(),
  }));
  while (base.gallery.length < 4) {
    base.gallery.push({ imageUrl: "" });
  }
  return base;
}

const FOOTER_COLUMN_LINK_COUNTS = [2, 2, 4];

function normalizeFooterSection(raw) {
  const defaults = DEFAULT_HOME_PAGE.footerSection;
  const base = { ...defaults, ...(raw || {}) };
  base.newsletterTitle = String(base.newsletterTitle || defaults.newsletterTitle).trim();
  base.emailPlaceholder = String(base.emailPlaceholder || defaults.emailPlaceholder).trim();
  base.buttonText = String(base.buttonText || defaults.buttonText).trim();
  base.copyright = String(base.copyright || defaults.copyright).trim();

  const socialDefaults = defaults.socialLinks || [];
  const socialRaw = Array.isArray(base.socialLinks) && base.socialLinks.length ? base.socialLinks : socialDefaults;
  base.socialLinks = socialRaw.slice(0, 3).map((item, index) => ({
    ...(socialDefaults[index] || { platform: "instagram", url: "#" }),
    platform: String(item?.platform || socialDefaults[index]?.platform || "instagram").trim(),
    url: String(item?.url || "#").trim() || "#",
  }));
  while (base.socialLinks.length < 3) {
    base.socialLinks.push({ ...(socialDefaults[base.socialLinks.length] || { platform: "instagram", url: "#" }) });
  }

  const colDefaults = defaults.columns || [];
  const colRaw = Array.isArray(base.columns) && base.columns.length ? base.columns : colDefaults;
  base.columns = colRaw.slice(0, 3).map((col, colIndex) => {
    const defCol = colDefaults[colIndex] || { title: "", links: [] };
    const linkCount = FOOTER_COLUMN_LINK_COUNTS[colIndex] || 2;
    const linksRaw = Array.isArray(col?.links) && col.links.length ? col.links : defCol.links;
    const links = linksRaw.slice(0, linkCount).map((link, linkIndex) => ({
      ...(defCol.links[linkIndex] || { label: "", url: "#" }),
      label: String(link?.label || "").trim(),
      url: String(link?.url || "#").trim() || "#",
    }));
    while (links.length < linkCount) {
      links.push({ ...(defCol.links[links.length] || { label: "", url: "#" }) });
    }
    return {
      title: String(col?.title || defCol.title || "").trim(),
      links,
    };
  });
  while (base.columns.length < 3) {
    const idx = base.columns.length;
    const defCol = colDefaults[idx] || { title: "", links: [] };
    const linkCount = FOOTER_COLUMN_LINK_COUNTS[idx] || 2;
    const links = (defCol.links || []).slice(0, linkCount).map((link) => ({
      label: String(link?.label || "").trim(),
      url: String(link?.url || "#").trim() || "#",
    }));
    while (links.length < linkCount) {
      links.push({ label: "", url: "#" });
    }
    base.columns.push({ title: String(defCol.title || "").trim(), links });
  }
  return base;
}

function normalizeHomePage(raw, heroBanners) {
  const base = { ...DEFAULT_HOME_PAGE, ...(raw || {}) };
  if (!Array.isArray(base.slides) || !base.slides.length) {
    const migrated = [];
    if (heroBanners?.main?.imageUrl) migrated.push({ ...DEFAULT_HOME_PAGE.slides[0], ...heroBanners.main });
    base.slides = migrated.length ? migrated : DEFAULT_HOME_PAGE.slides;
  }
  if (!Array.isArray(base.features) || !base.features.length) {
    base.features = DEFAULT_HOME_PAGE.features;
  }
  base.features = base.features.map((item, index) => ({
    ...(DEFAULT_HOME_PAGE.features[index] || { imageUrl: "", title: "", description: "", link: "" }),
    imageUrl: String(item?.imageUrl || "").trim(),
    title: String(item?.title || "").trim(),
    description: String(item?.description || "").trim(),
    link: String(item?.link || "").trim(),
  }));
  base.slides = base.slides.map((slide) => ({
    imageUrl: String(slide?.imageUrl || "").trim(),
    title: String(slide?.title || "").trim(),
    subtitle: String(slide?.subtitle || "").trim(),
    ctaText: String(slide?.ctaText || "").trim(),
    ctaLink: String(slide?.ctaLink || "").trim(),
    footnote: String(slide?.footnote || "").trim(),
  }));
  base.aboutSection = normalizeAboutSection(base.aboutSection);
  base.footerSection = normalizeFooterSection(base.footerSection);
  return base;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
fs.mkdirSync(uploadDir, { recursive: true });
ensurePictureDirs();
fs.mkdirSync(productUploadDir, { recursive: true });
fs.mkdirSync(bannerUploadDir, { recursive: true });
fs.mkdirSync(profileUploadDir, { recursive: true });
fs.mkdirSync(qrisUploadDir, { recursive: true });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/shop", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "shop.html"));
});

const pictureMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
    ];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File harus berupa gambar (png/jpg/webp/gif) atau video slideshow (mp4/webm)."));
      return;
    }
    cb(null, true);
  },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `logo-${Date.now()}${ext || ".png"}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File harus berupa gambar (png/jpg/webp/svg)."));
      return;
    }
    cb(null, true);
  },
});

const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, productUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ".webp"}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File produk harus berupa gambar png/jpg/webp."));
      return;
    }
    cb(null, true);
  },
});

const bannerImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, bannerUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ".webp"}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for videos
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File banner harus berupa gambar (png/jpg/webp/gif) atau video (mp4/webm)."));
      return;
    }
    cb(null, true);
  },
});

const profileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ".webp"}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File gambar profil harus berupa png/jpg/webp."));
      return;
    }
    cb(null, true);
  },
});

const qrisImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, qrisUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `qris-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ".webp"}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File gambar QRIS harus berupa png/jpg/webp."));
      return;
    }
    cb(null, true);
  },
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function normalizeDiscount(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.min(95, Math.max(0, Math.round(num)));
}

function normalizeSizesPayload(sizes) {
  let list = sizes;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list)) return null;
  const cleaned = list
    .map((item) => ({
      size: String(item?.size || "").trim(),
      price: Math.round(Number(item?.price)),
      stock_sjs: Math.max(0, Number(item?.stock_sjs) || 0),
      stock_sjl: Math.max(0, Number(item?.stock_sjl) || 0),
    }))
    .filter((item) => item.size && item.price > 0);
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

function readStockFromPayload(payload) {
  const stockSjs = Number(payload.stockSjs ?? payload.stock_sjs) || 0;
  const stockSjl = Number(payload.stockSjl ?? payload.stock_sjl) || 0;
  return { stockSjs, stockSjl, stock: stockSjs + stockSjl };
}

function readPointsFromPayload(payload) {
  return Number(payload.pointsPerPurchase ?? payload.loyalty_points ?? payload.points_per_purchase) || 0;
}

function formatRupiahServer(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function parseProductSizes(productRow) {
  if (!productRow?.sizes) return [];
  try {
    const parsed = typeof productRow.sizes === "string" ? JSON.parse(productRow.sizes) : productRow.sizes;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSizeTotalStock(sizeItem) {
  return Math.max(0, Number(sizeItem?.stock_sjs) || 0) + Math.max(0, Number(sizeItem?.stock_sjl) || 0);
}

function sumSizesStock(parsedSizes) {
  let stockSjs = 0;
  let stockSjl = 0;
  for (const sizeItem of parsedSizes) {
    stockSjs += Math.max(0, Number(sizeItem.stock_sjs) || 0);
    stockSjl += Math.max(0, Number(sizeItem.stock_sjl) || 0);
  }
  return { stock: stockSjs + stockSjl, stockSjs, stockSjl };
}

function deductFromStockPools(stockSjs, stockSjl, qty) {
  let remaining = Math.max(0, Number(qty) || 0);
  const availableSjs = Math.max(0, Number(stockSjs) || 0);
  const availableSjl = Math.max(0, Number(stockSjl) || 0);
  let deductSjs = 0;
  let deductSjl = 0;

  if (availableSjs >= remaining) {
    deductSjs = remaining;
    remaining = 0;
  } else {
    deductSjs = availableSjs;
    remaining -= availableSjs;
    deductSjl = Math.min(availableSjl, remaining);
  }

  return {
    stockSjs: Math.max(0, availableSjs - deductSjs),
    stockSjl: Math.max(0, availableSjl - deductSjl),
    deductSjs,
    deductSjl,
  };
}

async function applyStockDeduction(productId, productRow, qty, sizeName = "") {
  const parsedSizes = parseProductSizes(productRow);
  const trimmedSize = String(sizeName || "").trim();

  if (parsedSizes.length > 0) {
    if (!trimmedSize) {
      throw new Error(`Ukuran wajib dipilih untuk produk "${productRow.name}".`);
    }
    const matchedSize = parsedSizes.find((item) => item.size === trimmedSize);
    if (!matchedSize) {
      throw new Error(`Ukuran "${trimmedSize}" tidak tersedia untuk produk "${productRow.name}".`);
    }
    const deducted = deductFromStockPools(matchedSize.stock_sjs, matchedSize.stock_sjl, qty);
    matchedSize.stock_sjs = deducted.stockSjs;
    matchedSize.stock_sjl = deducted.stockSjl;
    const totals = sumSizesStock(parsedSizes);
    await runQuery(
      `UPDATE products SET sizes = ?, stock = ?, stock_sjs = ?, stock_sjl = ? WHERE id = ?`,
      [JSON.stringify(parsedSizes), totals.stock, totals.stockSjs, totals.stockSjl, productId]
    );
    return { deductSjs: deducted.deductSjs, deductSjl: deducted.deductSjl, totalStock: totals.stock };
  }

  const deducted = deductFromStockPools(productRow.stock_sjs, productRow.stock_sjl, qty);
  const totals = {
    stock: deducted.stockSjs + deducted.stockSjl,
    stockSjs: deducted.stockSjs,
    stockSjl: deducted.stockSjl,
  };
  await runQuery(
    `UPDATE products SET stock = ?, stock_sjs = ?, stock_sjl = ? WHERE id = ?`,
    [totals.stock, totals.stockSjs, totals.stockSjl, productId]
  );
  return { deductSjs: deducted.deductSjs, deductSjl: deducted.deductSjl, totalStock: totals.stock };
}

async function withTransaction(callback) {
  await runQuery("BEGIN IMMEDIATE");
  try {
    const result = await callback();
    await runQuery("COMMIT");
    return result;
  } catch (error) {
    try {
      await runQuery("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}

function calculateFinalPrice(price, discount) {
  const safePrice = Number(price) || 0;
  const safeDiscount = normalizeDiscount(discount);
  return Math.round((safePrice * (100 - safeDiscount)) / 100);
}

async function setupDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const userColumns = await allQuery("PRAGMA table_info(users)");
  const hasRoleColumn = userColumns.some((col) => col.name === "role");
  if (!hasRoleColumn) {
    await runQuery("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    await runQuery("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''");
  }

  const hasProfilePicColumn = userColumns.some((col) => col.name === "profile_picture");
  if (!hasProfilePicColumn) {
    await runQuery("ALTER TABLE users ADD COLUMN profile_picture TEXT NOT NULL DEFAULT ''");
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL DEFAULT 'Umum',
      price INTEGER NOT NULL,
      rating REAL NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL
    )
  `);

  const productColumns = await allQuery("PRAGMA table_info(products)");
  const hasSubcategoryColumn = productColumns.some((col) => col.name === "subcategory");
  if (!hasSubcategoryColumn) {
    await runQuery(
      "ALTER TABLE products ADD COLUMN subcategory TEXT NOT NULL DEFAULT 'Umum'"
    );
    await runQuery(
      "UPDATE products SET subcategory = 'Umum' WHERE subcategory IS NULL OR subcategory = ''"
    );
  }

  const hasDiscountColumn = productColumns.some((col) => col.name === "discount");
  if (!hasDiscountColumn) {
    await runQuery("ALTER TABLE products ADD COLUMN discount INTEGER NOT NULL DEFAULT 0");
  }

  const hasWaPhoneColumn = productColumns.some((col) => col.name === "wa_phone");
  if (!hasWaPhoneColumn) {
    await runQuery("ALTER TABLE products ADD COLUMN wa_phone TEXT NOT NULL DEFAULT ''");
  }

  const hasStockColumn = productColumns.some((col) => col.name === "stock");
  if (!hasStockColumn) {
    await runQuery("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0");
  }

  const hasStockSjsColumn = productColumns.some((col) => col.name === "stock_sjs");
  if (!hasStockSjsColumn) {
    await runQuery("ALTER TABLE products ADD COLUMN stock_sjs INTEGER NOT NULL DEFAULT 0");
  }

  const hasStockSjlColumn = productColumns.some((col) => col.name === "stock_sjl");
  if (!hasStockSjlColumn) {
    await runQuery("ALTER TABLE products ADD COLUMN stock_sjl INTEGER NOT NULL DEFAULT 0");
  }

  const hasSizesColumn = productColumns.some((col) => col.name === "sizes");
  if (!hasSizesColumn) {
    await runQuery("ALTER TABLE products ADD COLUMN sizes TEXT");
  }

  const hasPointsColumn = productColumns.some((col) => col.name === "points_per_purchase");
  if (!hasPointsColumn) {
    await runQuery("ALTER TABLE products ADD COLUMN points_per_purchase INTEGER NOT NULL DEFAULT 0");
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS point_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      reward_type TEXT NOT NULL,
      reward_value INTEGER DEFAULT 0,
      points_required INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS user_points (
      user_id INTEGER PRIMARY KEY,
      total_points INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS user_point_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      points INTEGER NOT NULL,
      description TEXT,
      order_id INTEGER,
      reward_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS inventory_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT DEFAULT '',
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL,
      lng REAL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      message_in TEXT NOT NULL,
      message_out TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(category_id, name),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  const orderColumns = await allQuery("PRAGMA table_info(orders)");
  const hasFulfillmentColumn = orderColumns.some((col) => col.name === "fulfillment_entity");
  if (!hasFulfillmentColumn) {
    await runQuery("ALTER TABLE orders ADD COLUMN fulfillment_entity TEXT DEFAULT ''");
  }
  const orderColNames = orderColumns.map((c) => c.name);
  if (!orderColNames.includes("shipping_method")) {
    await runQuery("ALTER TABLE orders ADD COLUMN shipping_method TEXT DEFAULT ''");
  }
  if (!orderColNames.includes("shipping_fee")) {
    await runQuery("ALTER TABLE orders ADD COLUMN shipping_fee INTEGER NOT NULL DEFAULT 0");
  }
  if (!orderColNames.includes("products_subtotal")) {
    await runQuery("ALTER TABLE orders ADD COLUMN products_subtotal INTEGER NOT NULL DEFAULT 0");
  }
  if (!orderColNames.includes("shipping_meta")) {
    await runQuery("ALTER TABLE orders ADD COLUMN shipping_meta TEXT DEFAULT ''");
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      final_price INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  const orderItemColumns = await allQuery("PRAGMA table_info(order_items)");
  const hasSizeColumn = orderItemColumns.some((col) => col.name === "size");
  if (!hasSizeColumn) {
    await runQuery("ALTER TABLE order_items ADD COLUMN size TEXT DEFAULT ''");
  }

  if (SEED_ADMIN_EMAIL && SEED_ADMIN_PASSWORD) {
    const existingAdmin = await getQuery("SELECT id FROM users WHERE email = ?", [
      SEED_ADMIN_EMAIL,
    ]);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
      await runQuery(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, passwordHash, "admin"]
      );
    }
  }

  const existing = await getQuery("SELECT COUNT(*) AS count FROM products");
  if (existing.count > 0) {
    // Sync menu tables from existing products (one-time or incremental safe)
    const distinct = await allQuery(
      "SELECT DISTINCT category, subcategory FROM products ORDER BY category, subcategory"
    );
    for (const row of distinct) {
      const categoryName = row.category || "Lainnya";
      const subName = row.subcategory || "Umum";
      const catRow = await getQuery("SELECT id FROM categories WHERE name = ?", [
        categoryName,
      ]);
      let catId = catRow?.id;
      if (!catId) {
        const inserted = await runQuery("INSERT INTO categories (name) VALUES (?)", [
          categoryName,
        ]);
        catId = inserted.lastID;
      }

      const subRow = await getQuery(
        "SELECT id FROM subcategories WHERE category_id = ? AND name = ?",
        [catId, subName]
      );
      if (!subRow) {
        await runQuery(
          "INSERT INTO subcategories (category_id, name) VALUES (?, ?)",
          [catId, subName]
        );
      }
    }
    return;
  }

    const seedProducts = [
    ["Sepatu Lari Pro", "Fashion", "Sepatu", 450000, 4.8, "Sepatu ringan untuk olahraga harian dan marathon.", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", 50],
    ["Headset Bluetooth X1", "Elektronik", "Audio", 299000, 4.6, "Suara jernih dengan baterai tahan hingga 24 jam.", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80", 20],
    ["Kaos Basic Premium", "Fashion", "Pakaian", 120000, 4.5, "Bahan cotton combed yang nyaman dipakai seharian.", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80", 10],
    ["Smartwatch Fit 2", "Elektronik", "Wearable", 799000, 4.7, "Pantau detak jantung, tidur, dan aktivitas olahraga.", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", 80],
    ["Kopi Arabica 500gr", "Makanan", "Minuman", 85000, 4.9, "Biji kopi pilihan dengan rasa fruity dan aroma kuat.", "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80", 5],
    ["Ransel Harian Urban", "Aksesoris", "Tas", 230000, 4.4, "Ransel multifungsi untuk kerja, kuliah, dan traveling.", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80", 25]
  ];

  for (const product of seedProducts) {
    const payload = [...product];
    await runQuery(
      `INSERT INTO products (name, category, subcategory, price, rating, description, image, points_per_purchase, discount, wa_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, '')`,
      payload
    );
  }

  // Seed menu tables from seed products
  const seededDistinct = await allQuery(
    "SELECT DISTINCT category, subcategory FROM products ORDER BY category, subcategory"
  );
  for (const row of seededDistinct) {
    const catRow = await getQuery("SELECT id FROM categories WHERE name = ?", [
      row.category,
    ]);
    let catId = catRow?.id;
    if (!catId) {
      const inserted = await runQuery("INSERT INTO categories (name) VALUES (?)", [
        row.category,
      ]);
      catId = inserted.lastID;
    }
    const subRow = await getQuery(
      "SELECT id FROM subcategories WHERE category_id = ? AND name = ?",
      [catId, row.subcategory]
    );
    if (!subRow) {
      await runQuery(
        "INSERT INTO subcategories (category_id, name) VALUES (?, ?)",
        [catId, row.subcategory]
      );
    }
  }
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ message: "Token tidak ditemukan." });
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ message: "Token tidak valid atau kadaluarsa." });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ message: "Akses ditolak." });
      return;
    }
    next();
  };
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ message: "Nama, email, dan password wajib diisi." });
    return;
  }

  try {
    const existing = await getQuery("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      res.status(409).json({ message: "Email sudah terdaftar." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await runQuery(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, "user"]
    );

    const user = { id: result.lastID, name, email, role: "user" };
    const token = createToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: "Gagal mendaftarkan pengguna." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Email dan password wajib diisi." });
    return;
  }

  try {
    const userRow = await getQuery(
      "SELECT id, name, email, role, password_hash, profile_picture FROM users WHERE email = ?",
      [email]
    );
    if (!userRow) {
      res.status(401).json({ message: "Email atau password salah." });
      return;
    }

    const validPassword = await bcrypt.compare(password, userRow.password_hash);
    if (!validPassword) {
      res.status(401).json({ message: "Email atau password salah." });
      return;
    }

    const user = { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role || "user", profile_picture: userRow.profile_picture || "" };
    const token = createToken(user);
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: "Gagal login." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: "Credential required." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const profile_picture = payload.picture || "";

    let userRow = await getQuery("SELECT id, name, email, role, profile_picture FROM users WHERE email = ?", [email]);
    
    if (!userRow) {
      const randomPassword = Math.random().toString(36).slice(-10) + "Aa1!";
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const result = await runQuery(
        "INSERT INTO users (name, email, password_hash, role, profile_picture) VALUES (?, ?, ?, ?, ?)",
        [name, email, passwordHash, "user", profile_picture]
      );
      userRow = { id: result.lastID, name, email, role: "user", profile_picture };
    } else if (!userRow.profile_picture && profile_picture) {
      await runQuery("UPDATE users SET profile_picture = ? WHERE id = ?", [profile_picture, userRow.id]);
      userRow.profile_picture = profile_picture;
    }

    const token = createToken(userRow);
    res.json({ user: userRow, token });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Autentikasi Google gagal." });
  }
});

app.get("/api/settings/google-client-id", (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || "" });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await getQuery("SELECT id, name, email, role, profile_picture FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (!user) {
      res.status(404).json({ message: "User tidak ditemukan." });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data user." });
  }
});

app.post("/api/auth/profile/upload-picture", authMiddleware, profileImageUpload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "File gambar profil wajib diupload." });
    return;
  }
  res.json({ imageUrl: `/profile_pictures/${req.file.filename}` });
});

app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  const { name, password, profile_picture } = req.body;
  const userId = req.user.id;
  
  if (!name) {
    res.status(400).json({ message: "Nama wajib diisi." });
    return;
  }

  try {
    let sql = "UPDATE users SET name = ?, profile_picture = ? WHERE id = ?";
    let params = [name, profile_picture || "", userId];

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      sql = "UPDATE users SET name = ?, profile_picture = ?, password_hash = ? WHERE id = ?";
      params = [name, profile_picture || "", passwordHash, userId];
    }

    await runQuery(sql, params);
    
    // Fetch updated user
    const userRow = await getQuery("SELECT id, name, email, role, profile_picture FROM users WHERE id = ?", [userId]);
    res.json({ message: "Profil berhasil diperbarui.", user: userRow });
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui profil." });
  }
});

app.get("/api/users", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const users = await allQuery(
      "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC"
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil daftar user." });
  }
});

app.post("/api/users", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ message: "Nama, email, dan password wajib diisi." });
    return;
  }

  const requestorRole = req.user.role;
  const requestedRole = (role || "user").toLowerCase();

  if (requestorRole === "manager" && requestedRole !== "user") {
    res.status(403).json({ message: "Manager hanya boleh membuat role user." });
    return;
  }

  if (!["admin", "manager", "user"].includes(requestedRole)) {
    res.status(400).json({ message: "Role tidak valid." });
    return;
  }

  try {
    const existing = await getQuery("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      res.status(409).json({ message: "Email sudah terdaftar." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await runQuery(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, requestedRole]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      email,
      role: requestedRole,
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat user." });
  }
});

app.patch(
  "/api/users/:id/role",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const { role } = req.body;
    const newRole = (role || "").toLowerCase();
    if (!["admin", "manager", "user"].includes(newRole)) {
      res.status(400).json({ message: "Role tidak valid." });
      return;
    }

    const userId = Number(req.params.id);
    if (!userId) {
      res.status(400).json({ message: "ID user tidak valid." });
      return;
    }

    if (req.user.id === userId && newRole !== "admin") {
      res.status(400).json({ message: "Admin tidak boleh menurunkan role dirinya sendiri." });
      return;
    }

    try {
      const existing = await getQuery("SELECT id FROM users WHERE id = ?", [userId]);
      if (!existing) {
        res.status(404).json({ message: "User tidak ditemukan." });
        return;
      }

      await runQuery("UPDATE users SET role = ? WHERE id = ?", [newRole, userId]);
      res.json({ message: "Role berhasil diubah.", role: newRole });
    } catch (error) {
      res.status(500).json({ message: "Gagal mengubah role." });
    }
  }
);

app.patch(
  "/api/users/:id/password",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ message: "Password minimal 6 karakter." });
      return;
    }

    const userId = Number(req.params.id);
    if (!userId) {
      res.status(400).json({ message: "ID user tidak valid." });
      return;
    }

    try {
      const existing = await getQuery("SELECT id FROM users WHERE id = ?", [userId]);
      if (!existing) {
        res.status(404).json({ message: "User tidak ditemukan." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await runQuery("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
      res.json({ message: "Password berhasil diubah." });
    } catch (error) {
      res.status(500).json({ message: "Gagal mengubah password." });
    }
  }
);

app.delete(
  "/api/users/:id",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const userId = Number(req.params.id);
    if (!userId) {
      res.status(400).json({ message: "ID user tidak valid." });
      return;
    }

    if (req.user.id === userId) {
      res.status(400).json({ message: "Admin tidak boleh menghapus dirinya sendiri." });
      return;
    }

    try {
      const existing = await getQuery("SELECT id, name FROM users WHERE id = ?", [userId]);
      if (!existing) {
        res.status(404).json({ message: "User tidak ditemukan." });
        return;
      }

      // Delete related orders and order items
      const userOrders = await allQuery("SELECT id FROM orders WHERE user_id = ?", [userId]);
      for (const order of userOrders) {
        await runQuery("DELETE FROM order_items WHERE order_id = ?", [order.id]);
      }
      await runQuery("DELETE FROM orders WHERE user_id = ?", [userId]);
      await runQuery("DELETE FROM users WHERE id = ?", [userId]);

      res.json({ message: `User "${existing.name}" berhasil dihapus.` });
    } catch (error) {
      res.status(500).json({ message: "Gagal menghapus user." });
    }
  }
);

app.get("/api/settings", async (req, res) => {
  try {
    const logoRow = await getQuery("SELECT value FROM app_settings WHERE key = ?", ["logo_url"]);
    const profileRow = await getQuery("SELECT value FROM app_settings WHERE key = ?", [
      "company_profile",
    ]);
    const bannersRow = await getQuery("SELECT value FROM app_settings WHERE key = ?", ["hero_banners"]);
    const homePageRow = await getQuery("SELECT value FROM app_settings WHERE key = ?", ["home_page"]);
    const qrisRow = await getQuery("SELECT value FROM app_settings WHERE key = ?", ["qris_image_url"]);

    let companyProfile = { ...DEFAULT_COMPANY_PROFILE };
    if (profileRow?.value) {
      try {
        companyProfile = { ...companyProfile, ...JSON.parse(profileRow.value) };
      } catch (error) {
        // ignore invalid stored JSON and use defaults
      }
    }

    let heroBanners = { main: null, side1: null, side2: null };
    if (bannersRow?.value) {
      try {
        heroBanners = { ...heroBanners, ...JSON.parse(bannersRow.value) };
      } catch (error) {}
    }

    let homePageRaw = null;
    if (homePageRow?.value) {
      try {
        homePageRaw = JSON.parse(homePageRow.value);
      } catch (error) {}
    }
    const homePage = normalizeHomePage(homePageRaw, heroBanners);

    // Get WhatsApp bot number: prefer DB setting, fallback to .env
    let whatsappBotNumber = process.env.WHATSAPP_BOT_NUMBER || "";
    try {
      const waRow = await getQuery("SELECT value FROM app_settings WHERE key = 'whatsapp_settings'");
      if (waRow?.value) {
        const waSettings = JSON.parse(waRow.value);
        if (waSettings.botNumber) whatsappBotNumber = waSettings.botNumber;
      }
    } catch (_) {}

    res.json({
      logoUrl: logoRow?.value || DEFAULT_LOGO_URL,
      companyProfile,
      heroBanners,
      homePage,
      qrisImageUrl: qrisRow?.value || "",
      whatsappBotNumber,
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil settings." });
  }
});

app.put(
  "/api/admin/settings/profile",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const payload = req.body || {};
    const companyProfile = {
      name: String(payload.name || "").trim(),
      about: String(payload.about || "").trim(),
      vision: String(payload.vision || "").trim(),
      mission: String(payload.mission || "").trim(),
      email: String(payload.email || "").trim(),
      phone: String(payload.phone || "").trim(),
      address: String(payload.address || "").trim(),
    };

    try {
      await runQuery(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        ["company_profile", JSON.stringify(companyProfile)]
      );
      res.json({ message: "Profil perusahaan berhasil disimpan.", companyProfile });
    } catch (error) {
      res.status(500).json({ message: "Gagal menyimpan profil perusahaan." });
    }
  }
);

app.post(
  "/api/admin/picture/upload",
  authMiddleware,
  requireRole(["admin"]),
  pictureMemoryUpload.single("image"),
  async (req, res) => {
    const folder = String(req.body?.folder || "slides").trim();
    if (!isValidFolder(folder)) {
      res.status(400).json({ message: "Folder upload tidak valid." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "File gambar wajib diupload." });
      return;
    }
    try {
      const imageUrl = await processUpload(req.file, folder);
      res.json({ imageUrl, message: "File berhasil diupload dan dikompres." });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal memproses upload gambar." });
    }
  }
);

app.post(
  "/api/admin/banners/upload-image",
  authMiddleware,
  requireRole(["admin"]),
  pictureMemoryUpload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "File gambar banner wajib diupload." });
      return;
    }
    try {
      const imageUrl = await processUpload(req.file, "slides");
      res.json({ imageUrl, message: "File berhasil diupload dan dikompres." });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal memproses upload banner." });
    }
  }
);

app.put(
  "/api/admin/settings/hero_banners",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const payload = req.body || {};
    const heroBanners = {
      main: payload.main || null,
      side1: payload.side1 || null,
      side2: payload.side2 || null
    };

    try {
      await runQuery(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        ["hero_banners", JSON.stringify(heroBanners)]
      );
      res.json({ message: "Pengaturan banner berhasil disimpan.", heroBanners });
    } catch (error) {
      res.status(500).json({ message: "Gagal menyimpan pengaturan banner." });
    }
  }
);

app.put(
  "/api/admin/settings/home_page",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const payload = req.body || {};
    const homePage = normalizeHomePage({
      tagline: payload.tagline,
      sectionTitle: payload.sectionTitle,
      slides: payload.slides,
      features: payload.features,
      aboutSection: payload.aboutSection,
      footerSection: payload.footerSection,
    });

    try {
      await runQuery(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        ["home_page", JSON.stringify(homePage)]
      );
      res.json({ message: "Pengaturan halaman utama berhasil disimpan.", homePage });
    } catch (error) {
      res.status(500).json({ message: "Gagal menyimpan pengaturan halaman utama." });
    }
  }
);

app.post("/api/newsletter/subscribe", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: "Alamat e-mail tidak valid." });
    return;
  }
  try {
    await runQuery("INSERT INTO newsletter_subscribers (email) VALUES (?)", [email]);
    res.json({ message: "Terima kasih! E-mail Anda berhasil didaftarkan." });
  } catch (error) {
    if (String(error?.message || "").includes("UNIQUE")) {
      res.json({ message: "E-mail ini sudah terdaftar. Terima kasih!" });
      return;
    }
    res.status(500).json({ message: "Gagal mendaftarkan e-mail. Coba lagi nanti." });
  }
});

app.post(
  "/api/admin/settings/qris-upload",
  authMiddleware,
  requireRole(["admin"]),
  qrisImageUpload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "File gambar QRIS wajib diupload." });
      return;
    }
    res.json({ imageUrl: `/qris/${req.file.filename}` });
  }
);

app.put(
  "/api/admin/settings/payment",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const payload = req.body || {};
    const qrisImageUrl = payload.qrisImageUrl || "";

    try {
      await runQuery(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        ["qris_image_url", qrisImageUrl]
      );
      res.json({ message: "Pengaturan pembayaran berhasil disimpan.", qrisImageUrl });
    } catch (error) {
      res.status(500).json({ message: "Gagal menyimpan pengaturan pembayaran." });
    }
  }
);

async function getShippingSettingsFromDb() {
  const row = await getQuery("SELECT value FROM app_settings WHERE key = ?", ["shipping_settings"]);
  if (!row?.value) return mergeShippingSettings(DEFAULT_SHIPPING_SETTINGS);
  try {
    return mergeShippingSettings(JSON.parse(row.value));
  } catch {
    return mergeShippingSettings(DEFAULT_SHIPPING_SETTINGS);
  }
}

app.get("/api/shipping/options", async (req, res) => {
  try {
    const settings = await getShippingSettingsFromDb();
    res.json({ options: getShippingOptions(settings) });
  } catch (error) {
    res.status(500).json({ message: "Gagal memuat opsi pengiriman." });
  }
});

app.post("/api/shipping/quote", authMiddleware, async (req, res) => {
  const { method, address, destLat, destLng, productsSubtotal } = req.body || {};
  if (!method) {
    res.status(400).json({ message: "Pilih metode pengiriman." });
    return;
  }
  if (!address && !(destLat && destLng) && method !== "store") {
    res.status(400).json({ message: "Isi alamat pengiriman terlebih dahulu." });
    return;
  }
  try {
    const settings = await getShippingSettingsFromDb();
    const quote = await calculateShippingQuote({
      method: String(method).trim(),
      address: String(address || "").trim(),
      destLat,
      destLng,
      productsSubtotal: Number(productsSubtotal) || 0,
      settings,
    });
    res.json(quote);
  } catch (error) {
    res.status(400).json({ message: error.message || "Gagal menghitung ongkir." });
  }
});

app.get("/api/admin/settings/shipping", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const settings = await getShippingSettingsFromDb();
    res.json({
      settings,
      lalamoveConfigured: Boolean(process.env.LALAMOVE_API_KEY && process.env.LALAMOVE_API_SECRET),
      gosendConfigured: Boolean(
        process.env.GOSEND_API_BASE && process.env.GOSEND_CLIENT_ID && process.env.GOSEND_PASS_KEY
      ),
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal memuat pengaturan pengiriman." });
  }
});

app.put("/api/admin/settings/shipping", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const payload = req.body?.settings || req.body || {};
    const settings = mergeShippingSettings(payload);
    await runQuery(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      ["shipping_settings", JSON.stringify(settings)]
    );
    res.json({ message: "Pengaturan pengiriman berhasil disimpan.", settings });
  } catch (error) {
    res.status(500).json({ message: "Gagal menyimpan pengaturan pengiriman." });
  }
});

function mapUserAddressRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label || "",
    recipientName: row.recipient_name,
    phone: row.phone,
    address: row.address,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

async function clearDefaultAddresses(userId) {
  await runQuery("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [userId]);
}

app.get("/api/addresses", authMiddleware, async (req, res) => {
  try {
    const rows = await allQuery(
      "SELECT id, user_id, label, recipient_name, phone, address, lat, lng, is_default, created_at FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
      [req.user.id]
    );
    res.json(rows.map(mapUserAddressRow));
  } catch (error) {
    res.status(500).json({ message: "Gagal memuat alamat." });
  }
});

app.post("/api/addresses", authMiddleware, async (req, res) => {
  const { label, recipientName, phone, address, lat, lng, isDefault } = req.body || {};
  const name = String(recipientName || "").trim();
  const phoneStr = String(phone || "").trim();
  const addressStr = String(address || "").trim();
  if (!name || !phoneStr || !addressStr) {
    res.status(400).json({ message: "Nama penerima, telepon, dan alamat wajib diisi." });
    return;
  }
  try {
    const latNum = lat != null && lat !== "" ? Number(lat) : null;
    const lngNum = lng != null && lng !== "" ? Number(lng) : null;
    const wantDefault = Boolean(isDefault);
    const countRow = await getQuery("SELECT COUNT(*) AS c FROM user_addresses WHERE user_id = ?", [req.user.id]);
    const isFirst = Number(countRow?.c || 0) === 0;
    const setDefault = wantDefault || isFirst;

    if (setDefault) await clearDefaultAddresses(req.user.id);

    const result = await runQuery(
      `INSERT INTO user_addresses (user_id, label, recipient_name, phone, address, lat, lng, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        String(label || "").trim(),
        name,
        phoneStr,
        addressStr,
        Number.isFinite(latNum) ? latNum : null,
        Number.isFinite(lngNum) ? lngNum : null,
        setDefault ? 1 : 0,
      ]
    );
    const row = await getQuery(
      "SELECT id, user_id, label, recipient_name, phone, address, lat, lng, is_default, created_at FROM user_addresses WHERE id = ?",
      [result.lastID]
    );
    res.status(201).json({ message: "Alamat berhasil ditambahkan.", address: mapUserAddressRow(row) });
  } catch (error) {
    res.status(500).json({ message: "Gagal menambah alamat." });
  }
});

app.put("/api/addresses/:id", authMiddleware, async (req, res) => {
  const addressId = Number(req.params.id);
  if (!addressId) {
    res.status(400).json({ message: "ID alamat tidak valid." });
    return;
  }
  const { label, recipientName, phone, address, lat, lng, isDefault } = req.body || {};
  const name = String(recipientName || "").trim();
  const phoneStr = String(phone || "").trim();
  const addressStr = String(address || "").trim();
  if (!name || !phoneStr || !addressStr) {
    res.status(400).json({ message: "Nama penerima, telepon, dan alamat wajib diisi." });
    return;
  }
  try {
    const existing = await getQuery("SELECT id, user_id FROM user_addresses WHERE id = ?", [addressId]);
    if (!existing || existing.user_id !== req.user.id) {
      res.status(404).json({ message: "Alamat tidak ditemukan." });
      return;
    }
    const latNum = lat != null && lat !== "" ? Number(lat) : null;
    const lngNum = lng != null && lng !== "" ? Number(lng) : null;
    const current = await getQuery(
      "SELECT is_default FROM user_addresses WHERE id = ? AND user_id = ?",
      [addressId, req.user.id]
    );
    let defaultFlag = current?.is_default ? 1 : 0;
    if (typeof isDefault === "boolean") {
      if (isDefault) {
        await clearDefaultAddresses(req.user.id);
        defaultFlag = 1;
      } else {
        defaultFlag = 0;
      }
    }

    await runQuery(
      `UPDATE user_addresses SET label = ?, recipient_name = ?, phone = ?, address = ?, lat = ?, lng = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [
        String(label || "").trim(),
        name,
        phoneStr,
        addressStr,
        Number.isFinite(latNum) ? latNum : null,
        Number.isFinite(lngNum) ? lngNum : null,
        defaultFlag,
        addressId,
        req.user.id,
      ]
    );
    const row = await getQuery(
      "SELECT id, user_id, label, recipient_name, phone, address, lat, lng, is_default, created_at FROM user_addresses WHERE id = ?",
      [addressId]
    );
    res.json({ message: "Alamat berhasil diperbarui.", address: mapUserAddressRow(row) });
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui alamat." });
  }
});

app.put("/api/addresses/:id/default", authMiddleware, async (req, res) => {
  const addressId = Number(req.params.id);
  if (!addressId) {
    res.status(400).json({ message: "ID alamat tidak valid." });
    return;
  }
  try {
    const existing = await getQuery("SELECT id, user_id FROM user_addresses WHERE id = ?", [addressId]);
    if (!existing || existing.user_id !== req.user.id) {
      res.status(404).json({ message: "Alamat tidak ditemukan." });
      return;
    }
    await clearDefaultAddresses(req.user.id);
    await runQuery("UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?", [
      addressId,
      req.user.id,
    ]);
    res.json({ message: "Alamat default berhasil diatur." });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengatur alamat default." });
  }
});

app.delete("/api/addresses/:id", authMiddleware, async (req, res) => {
  const addressId = Number(req.params.id);
  if (!addressId) {
    res.status(400).json({ message: "ID alamat tidak valid." });
    return;
  }
  try {
    const existing = await getQuery(
      "SELECT id, user_id, is_default FROM user_addresses WHERE id = ?",
      [addressId]
    );
    if (!existing || existing.user_id !== req.user.id) {
      res.status(404).json({ message: "Alamat tidak ditemukan." });
      return;
    }
    await runQuery("DELETE FROM user_addresses WHERE id = ? AND user_id = ?", [addressId, req.user.id]);
    if (existing.is_default) {
      const next = await getQuery(
        "SELECT id FROM user_addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [req.user.id]
      );
      if (next) {
        await runQuery("UPDATE user_addresses SET is_default = 1 WHERE id = ?", [next.id]);
      }
    }
    res.json({ message: "Alamat berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus alamat." });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await allQuery(
      "SELECT id, name FROM categories ORDER BY name ASC"
    );
    const subs = await allQuery(
      "SELECT id, category_id, name FROM subcategories ORDER BY name ASC"
    );
    const counts = await allQuery(
      "SELECT category as categoryName, subcategory as subName, COUNT(*) as count FROM products GROUP BY category, subcategory"
    );

    const countMap = new Map();
    counts.forEach((c) => {
      countMap.set(`${c.categoryName}|||${c.subName}`, c.count);
    });

    const byCategory = new Map();
    categories.forEach((c) => {
      byCategory.set(c.id, { id: c.id, name: c.name, count: 0, subcategories: [] });
    });

    subs.forEach((s) => {
      const cat = byCategory.get(s.category_id);
      if (!cat) return;
      const c = Number(countMap.get(`${cat.name}|||${s.name}`) || 0);
      cat.count += c;
      cat.subcategories.push({ id: s.id, name: s.name, count: c });
    });

    res.json(Array.from(byCategory.values()));
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil kategori." });
  }
});

// Admin: Category CRUD
app.post("/api/admin/categories", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { name } = req.body;
  const n = (name || "").trim();
  if (!n) {
    res.status(400).json({ message: "Nama kategori wajib diisi." });
    return;
  }
  try {
    const existing = await getQuery("SELECT id FROM categories WHERE name = ?", [n]);
    if (existing) {
      res.status(409).json({ message: "Kategori sudah ada." });
      return;
    }
    const result = await runQuery("INSERT INTO categories (name) VALUES (?)", [n]);
    // ensure at least one default subcategory
    await runQuery("INSERT INTO subcategories (category_id, name) VALUES (?, ?)", [
      result.lastID,
      "Umum",
    ]);
    res.status(201).json({ id: result.lastID, name: n });
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat kategori." });
  }
});

app.put("/api/admin/categories/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const n = (name || "").trim();
  if (!id || !n) {
    res.status(400).json({ message: "Data tidak valid." });
    return;
  }
  try {
    const current = await getQuery("SELECT id, name FROM categories WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ message: "Kategori tidak ditemukan." });
      return;
    }
    const dup = await getQuery("SELECT id FROM categories WHERE name = ? AND id != ?", [
      n,
      id,
    ]);
    if (dup) {
      res.status(409).json({ message: "Nama kategori sudah dipakai." });
      return;
    }

    await runQuery("UPDATE categories SET name = ? WHERE id = ?", [n, id]);
    // keep products consistent
    await runQuery("UPDATE products SET category = ? WHERE category = ?", [n, current.name]);
    res.json({ message: "Kategori berhasil diubah." });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengubah kategori." });
  }
});

app.delete("/api/admin/categories/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ message: "ID tidak valid." });
    return;
  }
  try {
    const current = await getQuery("SELECT id, name FROM categories WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ message: "Kategori tidak ditemukan." });
      return;
    }

    // Reassign products to Lainnya/Umum
    await runQuery(
      "UPDATE products SET category = 'Lainnya', subcategory = 'Umum' WHERE category = ?",
      [current.name]
    );

    await runQuery("DELETE FROM subcategories WHERE category_id = ?", [id]);
    await runQuery("DELETE FROM categories WHERE id = ?", [id]);
    res.json({ message: "Kategori berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus kategori." });
  }
});

// Admin: Subcategory CRUD
app.post(
  "/api/admin/categories/:id/subcategories",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const categoryId = Number(req.params.id);
    const { name } = req.body;
    const n = (name || "").trim();
    if (!categoryId || !n) {
      res.status(400).json({ message: "Data tidak valid." });
      return;
    }
    try {
      const cat = await getQuery("SELECT id, name FROM categories WHERE id = ?", [categoryId]);
      if (!cat) {
        res.status(404).json({ message: "Kategori tidak ditemukan." });
        return;
      }
      const existing = await getQuery(
        "SELECT id FROM subcategories WHERE category_id = ? AND name = ?",
        [categoryId, n]
      );
      if (existing) {
        res.status(409).json({ message: "Sub-kategori sudah ada." });
        return;
      }
      const result = await runQuery(
        "INSERT INTO subcategories (category_id, name) VALUES (?, ?)",
        [categoryId, n]
      );
      res.status(201).json({ id: result.lastID, name: n });
    } catch (error) {
      res.status(500).json({ message: "Gagal membuat sub-kategori." });
    }
  }
);

app.get("/api/admin/products", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const rows = await allQuery("SELECT * FROM products ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data produk admin." });
  }
});

app.post(
  "/api/admin/products/upload-image",
  authMiddleware,
  requireRole(["admin"]),
  pictureMemoryUpload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "File gambar produk wajib diupload." });
      return;
    }
    try {
      const imageUrl = await processUpload(req.file, "products");
      res.json({ imageUrl, message: "Gambar produk berhasil diupload dan dikompres." });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal memproses upload gambar produk." });
    }
  }
);

app.post("/api/admin/products", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const payload = req.body || {};
  const name = String(payload.name || "").trim();
  const category = String(payload.category || "").trim();
  const subcategory = String(payload.subcategory || "Umum").trim() || "Umum";
  const description = String(payload.description || "").trim();
  const image = String(payload.image || "").trim();
  const waPhone = String(payload.waPhone || "").trim();
  const price = Number(payload.price);
  const rating = Number(payload.rating || 4.5);
  const discount = normalizeDiscount(payload.discount);
  const { stockSjs, stockSjl, stock } = readStockFromPayload(payload);
  const sizesStr = normalizeSizesPayload(payload.sizes);
  const pointsPerPurchase = readPointsFromPayload(payload);

  if (!name || !category || !description || !image || Number.isNaN(price) || price <= 0 || stockSjs < 0 || stockSjl < 0) {
    res.status(400).json({ message: "Nama, kategori, deskripsi, gambar, harga, dan stok wajib valid." });
    return;
  }

  try {
    const result = await runQuery(
      `INSERT INTO products (name, category, subcategory, price, rating, description, image, discount, wa_phone, stock, stock_sjs, stock_sjl, sizes, points_per_purchase)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, subcategory, Math.round(price), Number.isNaN(rating) ? 4.5 : rating, description, image, discount, waPhone, stock, stockSjs, stockSjl, sizesStr, pointsPerPurchase]
    );

    if (stock > 0) {
      await runQuery(
        `INSERT INTO inventory_ledger (product_id, type, quantity, description) VALUES (?, ?, ?, ?)`,
        [result.lastID, "IN", stock, "Stok awal"]
      );
    }

    res.status(201).json({ id: result.lastID, message: "Produk berhasil ditambahkan." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menambah produk." });
  }
});

app.put("/api/admin/products/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ message: "ID produk tidak valid." });
    return;
  }

  const payload = req.body || {};
  const name = String(payload.name || "").trim();
  const category = String(payload.category || "").trim();
  const subcategory = String(payload.subcategory || "Umum").trim() || "Umum";
  const description = String(payload.description || "").trim();
  const image = String(payload.image || "").trim();
  const waPhone = String(payload.waPhone || "").trim();
  const price = Number(payload.price);
  const rating = Number(payload.rating || 4.5);
  const discount = normalizeDiscount(payload.discount);
  const { stockSjs, stockSjl, stock } = readStockFromPayload(payload);
  const sizesStr = normalizeSizesPayload(payload.sizes);
  const pointsPerPurchase = readPointsFromPayload(payload);

  if (!name || !category || !description || !image || Number.isNaN(price) || price <= 0 || stockSjs < 0 || stockSjl < 0) {
    res.status(400).json({ message: "Nama, kategori, deskripsi, gambar, harga, dan stok wajib valid." });
    return;
  }

  try {
    const existing = await getQuery("SELECT id, stock FROM products WHERE id = ?", [id]);
    if (!existing) {
      res.status(404).json({ message: "Produk tidak ditemukan." });
      return;
    }

    const currentStock = existing.stock || 0;
    const diff = stock - currentStock;

    await runQuery(
      `UPDATE products
       SET name = ?, category = ?, subcategory = ?, price = ?, rating = ?, description = ?, image = ?, discount = ?, wa_phone = ?, stock = ?, stock_sjs = ?, stock_sjl = ?, sizes = ?, points_per_purchase = ?
       WHERE id = ?`,
      [name, category, subcategory, Math.round(price), Number.isNaN(rating) ? 4.5 : rating, description, image, discount, waPhone, stock, stockSjs, stockSjl, sizesStr, pointsPerPurchase, id]
    );

    if (diff > 0) {
      await runQuery(
        `INSERT INTO inventory_ledger (product_id, type, quantity, description) VALUES (?, ?, ?, ?)`,
        [id, "IN", diff, "Penyesuaian stok admin"]
      );
    } else if (diff < 0) {
      await runQuery(
        `INSERT INTO inventory_ledger (product_id, type, quantity, description) VALUES (?, ?, ?, ?)`,
        [id, "OUT", Math.abs(diff), "Penyesuaian stok admin"]
      );
    }

    res.json({ message: "Produk berhasil diupdate." });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengupdate produk." });
  }
});

app.delete("/api/admin/products/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ message: "ID produk tidak valid." });
    return;
  }
  try {
    const existing = await getQuery("SELECT id FROM products WHERE id = ?", [id]);
    if (!existing) {
      res.status(404).json({ message: "Produk tidak ditemukan." });
      return;
    }
    await runQuery("DELETE FROM products WHERE id = ?", [id]);
    res.json({ message: "Produk berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus produk." });
  }
});

app.put(
  "/api/admin/subcategories/:subId",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const subId = Number(req.params.subId);
    const { name } = req.body;
    const n = (name || "").trim();
    if (!subId || !n) {
      res.status(400).json({ message: "Data tidak valid." });
      return;
    }
    try {
      const current = await getQuery(
        "SELECT s.id, s.name, s.category_id, c.name AS category_name FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE s.id = ?",
        [subId]
      );
      if (!current) {
        res.status(404).json({ message: "Sub-kategori tidak ditemukan." });
        return;
      }
      const dup = await getQuery(
        "SELECT id FROM subcategories WHERE category_id = ? AND name = ? AND id != ?",
        [current.category_id, n, subId]
      );
      if (dup) {
        res.status(409).json({ message: "Nama sub-kategori sudah dipakai." });
        return;
      }
      await runQuery("UPDATE subcategories SET name = ? WHERE id = ?", [n, subId]);
      // keep products consistent
      await runQuery(
        "UPDATE products SET subcategory = ? WHERE category = ? AND subcategory = ?",
        [n, current.category_name, current.name]
      );
      res.json({ message: "Sub-kategori berhasil diubah." });
    } catch (error) {
      res.status(500).json({ message: "Gagal mengubah sub-kategori." });
    }
  }
);

app.delete(
  "/api/admin/subcategories/:subId",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const subId = Number(req.params.subId);
    if (!subId) {
      res.status(400).json({ message: "ID tidak valid." });
      return;
    }
    try {
      const current = await getQuery(
        "SELECT s.id, s.name, c.name AS category_name FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE s.id = ?",
        [subId]
      );
      if (!current) {
        res.status(404).json({ message: "Sub-kategori tidak ditemukan." });
        return;
      }

      // Reassign products to Umum within same category
      await runQuery(
        "UPDATE products SET subcategory = 'Umum' WHERE category = ? AND subcategory = ?",
        [current.category_name, current.name]
      );
      await runQuery("DELETE FROM subcategories WHERE id = ?", [subId]);
      res.json({ message: "Sub-kategori berhasil dihapus." });
    } catch (error) {
      res.status(500).json({ message: "Gagal menghapus sub-kategori." });
    }
  }
);

app.post(
  "/api/admin/logo",
  authMiddleware,
  requireRole(["admin"]),
  pictureMemoryUpload.single("logo"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "File logo wajib diupload." });
      return;
    }

    try {
      const logoUrl = await processUpload(req.file, "logo");
      await runQuery(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        ["logo_url", logoUrl]
      );
      res.json({ message: "Logo berhasil diupload dan dikompres.", logoUrl });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal memproses upload logo." });
    }
  }
);

app.get("/api/products", async (req, res) => {
  try {
    const products = await allQuery("SELECT * FROM products ORDER BY id DESC");
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil produk." });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await getQuery("SELECT * FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (!product) {
      res.status(404).json({ message: "Produk tidak ditemukan." });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil detail produk." });
  }
});

app.post("/api/checkout", authMiddleware, async (req, res) => {
  const {
    items,
    customerName,
    customerPhone,
    customerAddress,
    paymentMethod,
    shippingMethod,
    shippingFee,
    destLat,
    destLng,
  } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "Keranjang kosong." });
    return;
  }
  if (!customerName || !customerPhone || !customerAddress || !paymentMethod) {
    res.status(400).json({ message: "Lengkapi data checkout dan metode pembayaran." });
    return;
  }
  if (!shippingMethod) {
    res.status(400).json({ message: "Pilih jasa kirim dan hitung ongkir terlebih dahulu." });
    return;
  }

  try {
    const normalizedItems = items.map((item) => {
      if (typeof item === "object" && item !== null) {
        const qtyValue = Number(item.qty ?? item.quantity ?? item.qtyOrdered);
        return {
          id: Number(item.id),
          size: item.size ? String(item.size).trim() : "",
          qty: Math.max(1, Number.isFinite(qtyValue) ? qtyValue : 1),
        };
      }
      return {
        id: Number(item),
        size: "",
        qty: 1,
      };
    });

    const itemGroupMap = new Map();
    normalizedItems.forEach((item) => {
      if (Number.isNaN(item.id)) return;
      const key = `${item.id}-${item.size}`;
      if (!itemGroupMap.has(key)) {
        itemGroupMap.set(key, { id: item.id, size: item.size, qty: 0 });
      }
      itemGroupMap.get(key).qty += item.qty;
    });

    const productIds = Array.from(new Set(normalizedItems.map((item) => item.id))).filter((id) => !Number.isNaN(id));
    if (!productIds.length) {
      res.status(400).json({ message: "Item checkout tidak valid." });
      return;
    }

    const placeholders = productIds.map(() => "?").join(",");
    const rows = await allQuery(
      `SELECT id, name, price, discount, stock, stock_sjs, stock_sjl, sizes, points_per_purchase FROM products WHERE id IN (${placeholders})`,
      productIds
    );
    const foundMap = new Map(rows.map((r) => [r.id, r]));

    const orderItems = [];
    let total = 0;

    for (const group of itemGroupMap.values()) {
      const row = foundMap.get(group.id);
      if (!row) continue;

      const parsedSizes = parseProductSizes(row);
      let basePrice = row.price;

      if (parsedSizes.length > 0) {
        if (!group.size) {
          res.status(400).json({ message: `Pilih ukuran untuk produk "${row.name}".` });
          return;
        }
        const matchedSize = parsedSizes.find((item) => item.size === group.size);
        if (!matchedSize) {
          res.status(400).json({ message: `Ukuran "${group.size}" untuk produk "${row.name}" tidak tersedia.` });
          return;
        }
        basePrice = Number(matchedSize.price) || row.price;
        const sizeTotalStock = getSizeTotalStock(matchedSize);
        if (sizeTotalStock < group.qty) {
          res.status(400).json({
            message: `Stok ukuran "${group.size}" untuk produk "${row.name}" tidak mencukupi (Tersedia: ${sizeTotalStock}, Diminta: ${group.qty}).`,
          });
          return;
        }
      } else if ((row.stock || 0) < group.qty) {
        res.status(400).json({
          message: `Stok produk "${row.name}" tidak mencukupi (Tersedia: ${row.stock || 0}, Diminta: ${group.qty}).`,
        });
        return;
      }

      const finalPrice = calculateFinalPrice(basePrice, row.discount);
      const subtotal = finalPrice * group.qty;
      total += subtotal;
      orderItems.push({
        productId: group.id,
        productName: row.name,
        price: basePrice,
        discount: normalizeDiscount(row.discount),
        finalPrice,
        qty: group.qty,
        subtotal,
        size: group.size,
      });
    }

    if (!orderItems.length) {
      res.status(400).json({ message: "Produk checkout tidak ditemukan." });
      return;
    }

    const productsSubtotal = total;
    let shippingQuote;
    try {
      const shippingSettings = await getShippingSettingsFromDb();
      shippingQuote = await calculateShippingQuote({
        method: String(shippingMethod).trim(),
        address: String(customerAddress).trim(),
        destLat,
        destLng,
        productsSubtotal,
        settings: shippingSettings,
      });
    } catch (quoteError) {
      res.status(400).json({ message: quoteError.message || "Gagal validasi ongkir." });
      return;
    }

    const clientShippingFee = Math.max(0, Number(shippingFee) || 0);
    if (clientShippingFee !== shippingQuote.fee) {
      res.status(400).json({
        message: `Ongkir berubah (${formatRupiahServer(shippingQuote.fee)}). Hitung ulang ongkir.`,
        shippingFee: shippingQuote.fee,
      });
      return;
    }

    const grandTotal = productsSubtotal + shippingQuote.fee;
    const shippingMeta = JSON.stringify({
      label: shippingQuote.label,
      source: shippingQuote.source,
      estimated: shippingQuote.estimated,
      note: shippingQuote.note || "",
      distanceKm: shippingQuote.distanceKm,
      quotationId: shippingQuote.quotationId || "",
    });

    const checkoutResult = await withTransaction(async () => {
      const orderResult = await runQuery(
        `INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, payment_method, total, status, shipping_method, shipping_fee, products_subtotal, shipping_meta)
         VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)`,
        [
          req.user.id,
          String(customerName).trim(),
          String(customerPhone).trim(),
          String(customerAddress).trim(),
          String(paymentMethod).trim(),
          grandTotal,
          String(shippingMethod).trim(),
          shippingQuote.fee,
          productsSubtotal,
          shippingMeta,
        ]
      );

      for (const item of orderItems) {
        await runQuery(
          `INSERT INTO order_items (order_id, product_id, product_name, price, discount, final_price, qty, subtotal, size)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderResult.lastID, item.productId, item.productName, item.price, item.discount, item.finalPrice, item.qty, item.subtotal, item.size || ""]
        );

        const productRow = await getQuery(
          `SELECT id, name, stock, stock_sjs, stock_sjl, sizes FROM products WHERE id = ?`,
          [item.productId]
        );
        if (!productRow) {
          throw new Error(`Produk "${item.productName}" tidak ditemukan saat update stok.`);
        }

        await applyStockDeduction(item.productId, productRow, item.qty, item.size || "");

        const sizeLabel = item.size ? ` (${item.size})` : "";
        await runQuery(
          `INSERT INTO inventory_ledger (product_id, type, quantity, description) VALUES (?, ?, ?, ?)`,
          [item.productId, "OUT", item.qty, `Terjual${sizeLabel} - Order #${orderResult.lastID}`]
        );
      }

      let totalPointsEarned = 0;
      for (const group of itemGroupMap.values()) {
        const row = foundMap.get(group.id);
        if (row && row.points_per_purchase) {
          totalPointsEarned += row.points_per_purchase * group.qty;
        }
      }

      if (totalPointsEarned > 0) {
        await runQuery(
          "INSERT INTO user_points (user_id, total_points) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET total_points = total_points + ?",
          [req.user.id, totalPointsEarned, totalPointsEarned]
        );
        await runQuery(
          "INSERT INTO user_point_history (user_id, type, points, description, order_id) VALUES (?, 'earn', ?, ?, ?)",
          [req.user.id, totalPointsEarned, `Pembelian Order #${orderResult.lastID}`, orderResult.lastID]
        );
      }

      return { orderId: orderResult.lastID, totalPointsEarned };
    });

    res.json({
      message: "Pembayaran berhasil diproses. Stok telah diperbarui.",
      orderId: checkoutResult.orderId,
      total: grandTotal,
      productsSubtotal,
      shippingFee: shippingQuote.fee,
      shippingMethod,
      shippingLabel: shippingQuote.label,
      itemCount: orderItems.reduce((sum, item) => sum + item.qty, 0),
      paymentMethod,
      pointsEarned: checkoutResult.totalPointsEarned,
    });
  } catch (error) {
    const message = error?.message || "Gagal checkout.";
    const statusCode = message.includes("Stok") || message.includes("Ukuran") || message.includes("ukuran") ? 400 : 500;
    console.error("Checkout error:", error);
    res.status(statusCode).json({ message });
  }
});

function getMonthPeriodBounds(year, month) {
  const formattedMonth = String(month).padStart(2, "0");
  const start = `${year}-${formattedMonth}-01 00:00:00`;
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const formattedNextMonth = String(nextMonth).padStart(2, "0");
  const end = `${nextYear}-${formattedNextMonth}-01 00:00:00`;
  return { start, end };
}

app.get("/api/admin/sales/report", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  const statusFilter = String(req.query.status || "all").trim().toLowerCase();

  if (!year || !month || month < 1 || month > 12) {
    res.status(400).json({ message: "Parameter tahun dan bulan wajib diisi dengan benar." });
    return;
  }

  const { start, end } = getMonthPeriodBounds(year, month);
  const orderParams = [start, end];
  let statusClause = "";
  if (statusFilter && statusFilter !== "all") {
    statusClause = " AND o.status = ? ";
    orderParams.push(statusFilter);
  }

  try {
    const orders = await allQuery(
      `SELECT o.id, o.customer_name, o.customer_phone, o.payment_method, o.total, o.status, o.created_at,
              u.email AS customer_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.created_at >= ? AND o.created_at < ?${statusClause}
       ORDER BY o.id DESC`,
      orderParams
    );

    const orderIds = orders.map((o) => o.id);
    let products = [];
    let totalItemsSold = 0;

    if (orderIds.length) {
      const placeholders = orderIds.map(() => "?").join(",");
      products = await allQuery(
        `SELECT oi.product_name, oi.size,
                SUM(oi.qty) AS qty_sold,
                SUM(oi.subtotal) AS revenue
         FROM order_items oi
         WHERE oi.order_id IN (${placeholders})
         GROUP BY oi.product_name, oi.size
         ORDER BY revenue DESC`,
        orderIds
      );

      const qtyRow = await getQuery(
        `SELECT SUM(oi.qty) AS total_qty
         FROM order_items oi
         WHERE oi.order_id IN (${placeholders})`,
        orderIds
      );
      totalItemsSold = Number(qtyRow?.total_qty) || 0;
    }

    const paymentMethods = await allQuery(
      `SELECT o.payment_method,
              COUNT(*) AS order_count,
              SUM(o.total) AS revenue
       FROM orders o
       WHERE o.created_at >= ? AND o.created_at < ?${statusClause}
       GROUP BY o.payment_method
       ORDER BY revenue DESC`,
      orderParams
    );

    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount ? Math.round(totalRevenue / orderCount) : 0;

    res.json({
      period: { year, month, start, end, status: statusFilter },
      summary: {
        order_count: orderCount,
        total_revenue: totalRevenue,
        total_items_sold: totalItemsSold,
        avg_order_value: avgOrderValue,
      },
      products: products.map((row) => ({
        product_name: row.product_name,
        size: row.size || "",
        qty_sold: Number(row.qty_sold) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      payment_methods: paymentMethods.map((row) => ({
        payment_method: row.payment_method,
        order_count: Number(row.order_count) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      orders: orders.map((row) => ({
        id: row.id,
        customer_name: row.customer_name,
        customer_email: row.customer_email || "",
        customer_phone: row.customer_phone,
        payment_method: row.payment_method,
        total: Number(row.total) || 0,
        status: row.status,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({ message: "Gagal mengambil laporan penjualan." });
  }
});

app.get("/api/admin/inventory/report", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month || month < 1 || month > 12) {
    res.status(400).json({ message: "Parameter tahun dan bulan wajib diisi dengan benar." });
    return;
  }

  const { start: targetPeriodStart, end: targetPeriodEnd } = getMonthPeriodBounds(year, month);

  try {
    const products = await allQuery("SELECT id, name FROM products ORDER BY name ASC");
    
    // Get all ledger entries
    const ledgers = await allQuery("SELECT * FROM inventory_ledger");
    
    const report = products.map((p) => {
      let opening_balance = 0;
      let in_qty = 0;
      let out_qty = 0;

      for (const l of ledgers) {
        if (l.product_id === p.id) {
          const lDate = l.created_at; // Format: YYYY-MM-DD HH:MM:SS
          
          if (lDate < targetPeriodStart) {
            // Before target month, contributes to opening balance
            if (l.type === "IN") opening_balance += l.quantity;
            if (l.type === "OUT") opening_balance -= l.quantity;
          } else if (lDate >= targetPeriodStart && lDate < targetPeriodEnd) {
            // Inside target month, contributes to in/out
            if (l.type === "IN") in_qty += l.quantity;
            if (l.type === "OUT") out_qty += l.quantity;
          }
        }
      }

      const ending_balance = opening_balance + in_qty - out_qty;

      return {
        id: p.id,
        name: p.name,
        opening_balance,
        in_qty,
        out_qty,
        ending_balance
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil laporan stok." });
  }
});

app.get("/api/admin/orders", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const orders = await allQuery(
      "SELECT orders.id, orders.user_id, orders.customer_name, orders.customer_phone, orders.customer_address, orders.payment_method, orders.total, orders.status, orders.fulfillment_entity, orders.shipping_method, orders.shipping_fee, orders.products_subtotal, orders.shipping_meta, orders.created_at, users.email AS customer_email FROM orders LEFT JOIN users ON orders.user_id = users.id ORDER BY orders.id DESC"
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil daftar pesanan." });
  }
});

app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!orderId) {
    res.status(400).json({ message: "ID pesanan tidak valid." });
    return;
  }

  try {
    const order = await getQuery(
      "SELECT orders.id, orders.user_id, orders.customer_name, orders.customer_phone, orders.customer_address, orders.payment_method, orders.total, orders.status, orders.fulfillment_entity, orders.shipping_method, orders.shipping_fee, orders.products_subtotal, orders.shipping_meta, orders.created_at, users.email AS customer_email FROM orders LEFT JOIN users ON orders.user_id = users.id WHERE orders.id = ?",
      [orderId]
    );
    if (!order) {
      res.status(404).json({ message: "Pesanan tidak ditemukan." });
      return;
    }

    // Check ownership if not admin/manager
    if (req.user.role !== "admin" && req.user.role !== "manager" && order.user_id !== req.user.id) {
      res.status(403).json({ message: "Akses ditolak." });
      return;
    }

    const items = await allQuery(
      "SELECT id, product_id, product_name, price, discount, final_price, qty, subtotal, size FROM order_items WHERE order_id = ?",
      [orderId]
    );

    res.json({ ...order, items });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil detail pesanan." });
  }
});

app.put("/api/admin/orders/:id/entity", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  const orderId = Number(req.params.id);
  const { entity } = req.body;
  if (!orderId) {
    res.status(400).json({ message: "ID pesanan tidak valid." });
    return;
  }

  try {
    const existing = await getQuery("SELECT id FROM orders WHERE id = ?", [orderId]);
    if (!existing) {
      res.status(404).json({ message: "Pesanan tidak ditemukan." });
      return;
    }

    await runQuery("UPDATE orders SET fulfillment_entity = ? WHERE id = ?", [String(entity || "").trim(), orderId]);
    res.json({ message: "Entitas pesanan berhasil diperbarui." });
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui entitas pesanan." });
  }
});

// --- Points & Rewards API ---

app.get("/api/points/my", authMiddleware, async (req, res) => {
  try {
    const points = await getQuery("SELECT total_points FROM user_points WHERE user_id = ?", [req.user.id]);
    res.json({ totalPoints: points ? points.total_points : 0 });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil saldo poin." });
  }
});

app.get("/api/points/my/history", authMiddleware, async (req, res) => {
  try {
    const history = await allQuery("SELECT * FROM user_point_history WHERE user_id = ? ORDER BY id DESC", [req.user.id]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil riwayat poin." });
  }
});

app.get("/api/points/rewards", async (req, res) => {
  try {
    const rewards = await allQuery("SELECT * FROM point_rewards WHERE is_active = 1 ORDER BY points_required ASC");
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil daftar hadiah." });
  }
});

app.post("/api/points/redeem", authMiddleware, async (req, res) => {
  const { rewardId } = req.body;
  if (!rewardId) return res.status(400).json({ message: "ID hadiah diperlukan." });

  try {
    const reward = await getQuery("SELECT * FROM point_rewards WHERE id = ? AND is_active = 1", [rewardId]);
    if (!reward) return res.status(404).json({ message: "Hadiah tidak ditemukan atau tidak aktif." });

    const userPointsRow = await getQuery("SELECT total_points FROM user_points WHERE user_id = ?", [req.user.id]);
    const currentPoints = userPointsRow ? userPointsRow.total_points : 0;

    if (currentPoints < reward.points_required) {
      return res.status(400).json({ message: `Poin tidak mencukupi. Butuh ${reward.points_required} poin.` });
    }

    await runQuery("UPDATE user_points SET total_points = total_points - ? WHERE user_id = ?", [reward.points_required, req.user.id]);
    await runQuery(
      "INSERT INTO user_point_history (user_id, type, points, description, reward_id) VALUES (?, 'redeem', ?, ?, ?)",
      [req.user.id, reward.points_required, `Klaim: ${reward.name}`, reward.id]
    );

    res.json({ message: "Klaim berhasil. Hadiah telah dicatat di sistem.", remainingPoints: currentPoints - reward.points_required });
  } catch (error) {
    res.status(500).json({ message: "Gagal melakukan klaim hadiah." });
  }
});

app.get("/api/admin/points/users", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const users = await allQuery(`
      SELECT u.id, u.name, u.email, COALESCE(p.total_points, 0) as total_points
      FROM users u
      LEFT JOIN user_points p ON u.id = p.user_id
      ORDER BY total_points DESC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil poin pengguna." });
  }
});

app.get("/api/admin/points/history", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const history = await allQuery(`
      SELECT h.*, u.name as user_name, u.email as user_email
      FROM user_point_history h
      JOIN users u ON h.user_id = u.id
      ORDER BY h.id DESC
    `);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil riwayat poin." });
  }
});

app.post("/api/admin/points/rewards", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { name, description, reward_type, reward_value, points_required, is_active } = req.body;
  if (!name || !reward_type || !points_required) {
    return res.status(400).json({ message: "Nama, tipe hadiah, dan poin yang dibutuhkan wajib diisi." });
  }
  try {
    const result = await runQuery(
      "INSERT INTO point_rewards (name, description, reward_type, reward_value, points_required, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description || "", reward_type, Number(reward_value) || 0, Number(points_required), is_active !== undefined ? Number(is_active) : 1]
    );
    res.status(201).json({ message: "Hadiah berhasil ditambahkan.", id: result.lastID });
  } catch (error) {
    res.status(500).json({ message: "Gagal menambah hadiah." });
  }
});

app.put("/api/admin/points/rewards/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { name, description, reward_type, reward_value, points_required, is_active } = req.body;
  const id = Number(req.params.id);
  if (!name || !reward_type || !points_required) {
    return res.status(400).json({ message: "Nama, tipe hadiah, dan poin yang dibutuhkan wajib diisi." });
  }
  try {
    await runQuery(
      "UPDATE point_rewards SET name = ?, description = ?, reward_type = ?, reward_value = ?, points_required = ?, is_active = ? WHERE id = ?",
      [name, description || "", reward_type, Number(reward_value) || 0, Number(points_required), is_active !== undefined ? Number(is_active) : 1, id]
    );
    res.json({ message: "Hadiah berhasil diupdate." });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengupdate hadiah." });
  }
});

app.delete("/api/admin/points/rewards/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await runQuery("DELETE FROM point_rewards WHERE id = ?", [id]);
    res.json({ message: "Hadiah berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus hadiah." });
  }
});

app.post("/api/admin/points/adjust", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { user_id, amount, description } = req.body;
  if (!user_id || !amount) return res.status(400).json({ message: "User ID dan jumlah poin diperlukan." });
  
  const numAmount = Number(amount);
  if (Number.isNaN(numAmount) || numAmount === 0) return res.status(400).json({ message: "Jumlah poin tidak valid." });

  try {
    // ensure user exists in points table
    await runQuery("INSERT OR IGNORE INTO user_points (user_id, total_points) VALUES (?, 0)", [user_id]);
    
    // adjust points
    await runQuery("UPDATE user_points SET total_points = total_points + ? WHERE user_id = ?", [numAmount, user_id]);
    
    const type = numAmount > 0 ? 'earn' : 'redeem';
    const absPoints = Math.abs(numAmount);
    await runQuery(
      "INSERT INTO user_point_history (user_id, type, points, description) VALUES (?, ?, ?, ?)",
      [user_id, type, absPoints, description || `Penyesuaian manual oleh admin`]
    );
    res.json({ message: "Poin berhasil disesuaikan." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menyesuaikan poin." });
  }
});

// --- WhatsApp Bot Webhook ---
app.get("/api/whatsapp/webhook", (req, res) => {
  res.status(200).send("Webhook active");
});
app.post("/api/whatsapp/webhook", (req, res) => {
  handleWebhook({ req, res, getQuery, allQuery, runQuery }).catch((err) => {
    console.error("Webhook unhandled error:", err);
    if (!res.headersSent) res.status(500).json({ status: false, message: "Internal error" });
  });
});

// --- WhatsApp Bot Admin Settings ---
app.get("/api/admin/settings/whatsapp", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const row = await getQuery("SELECT value FROM app_settings WHERE key = 'whatsapp_settings'");
    const settings = row && row.value ? JSON.parse(row.value) : { enabled: false, fallbackMessage: "" };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil pengaturan WhatsApp." });
  }
});

app.put("/api/admin/settings/whatsapp", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  const settings = req.body;
  try {
    await runQuery(
      "INSERT INTO app_settings (key, value) VALUES ('whatsapp_settings', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [JSON.stringify(settings), JSON.stringify(settings)]
    );
    res.json({ message: "Pengaturan WhatsApp berhasil disimpan." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menyimpan pengaturan WhatsApp." });
  }
});

app.get("/api/admin/whatsapp/sessions", authMiddleware, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const sessions = await allQuery("SELECT * FROM whatsapp_sessions ORDER BY created_at DESC LIMIT 50");
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil riwayat WhatsApp." });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Endpoint API tidak ditemukan." });
});

app.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ message: "Ukuran file maksimal 2MB." });
    return;
  }
  if (err) {
    res.status(500).json({ message: err.message || "Terjadi error server." });
    return;
  }
  next();
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

setupDatabase()
  .then(() => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Marketplace app running at http://${HOST}:${PORT}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} sedang dipakai aplikasi lain.`);
        console.error("Ganti PORT di file .env lalu jalankan ulang npm start.");
        return;
      }
      console.error("Server failed:", error);
    });
  })
  .catch((error) => {
    console.error("Database setup failed:", error);
    process.exit(1);
  });
