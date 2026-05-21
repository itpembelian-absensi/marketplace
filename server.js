require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-marketplace";
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "";
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";
const dbPath = path.join(__dirname, "data", "marketplace.db");
const db = new sqlite3.Database(dbPath);
const uploadDir = path.join(__dirname, "public", "picture");
const productUploadDir = path.join(__dirname, "public", "product");
const DEFAULT_COMPANY_PROFILE = {
  about:
    "PT SAHABAT JAYA SUKSES berfokus pada penyediaan produk berkualitas untuk kebutuhan harian. Kami berkomitmen pada layanan yang cepat, aman, dan transparan.",
  vision: "Menjadi mitra terpercaya dalam penyediaan produk yang bernilai dan mudah diakses.",
  mission: "Memberikan pengalaman yang sederhana, cepat, dan aman melalui platform digital.",
  email: "info@company.com",
  phone: "08xx-xxxx-xxxx",
  address: "(isi alamat perusahaan)",
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(productUploadDir, { recursive: true });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
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
    ["Sepatu Lari Pro", "Fashion", "Sepatu", 450000, 4.8, "Sepatu ringan untuk olahraga harian dan marathon.", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"],
    ["Headset Bluetooth X1", "Elektronik", "Audio", 299000, 4.6, "Suara jernih dengan baterai tahan hingga 24 jam.", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"],
    ["Kaos Basic Premium", "Fashion", "Pakaian", 120000, 4.5, "Bahan cotton combed yang nyaman dipakai seharian.", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"],
    ["Smartwatch Fit 2", "Elektronik", "Wearable", 799000, 4.7, "Pantau detak jantung, tidur, dan aktivitas olahraga.", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"],
    ["Kopi Arabica 500gr", "Makanan", "Minuman", 85000, 4.9, "Biji kopi pilihan dengan rasa fruity dan aroma kuat.", "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80"],
    ["Ransel Harian Urban", "Aksesoris", "Tas", 230000, 4.4, "Ransel multifungsi untuk kerja, kuliah, dan traveling.", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80"]
  ];

  for (const product of seedProducts) {
    const payload = [...product];
    await runQuery(
      `INSERT INTO products (name, category, subcategory, price, rating, description, image, discount, wa_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, '')`,
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
      "SELECT id, name, email, role, password_hash FROM users WHERE email = ?",
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

    const user = { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role || "user" };
    const token = createToken(user);
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: "Gagal login." });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await getQuery("SELECT id, name, email, role FROM users WHERE id = ?", [
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

app.get("/api/settings", async (req, res) => {
  try {
    const logoRow = await getQuery("SELECT value FROM app_settings WHERE key = ?", ["logo_url"]);
    const profileRow = await getQuery("SELECT value FROM app_settings WHERE key = ?", [
      "company_profile",
    ]);
    let companyProfile = { ...DEFAULT_COMPANY_PROFILE };
    if (profileRow?.value) {
      try {
        companyProfile = { ...companyProfile, ...JSON.parse(profileRow.value) };
      } catch (error) {
        // ignore invalid stored JSON and use defaults
      }
    }

    res.json({ logoUrl: logoRow?.value || "", companyProfile });
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
  productImageUpload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "File gambar produk wajib diupload." });
      return;
    }
    res.json({ imageUrl: `/product/${req.file.filename}` });
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

  if (!name || !category || !description || !image || Number.isNaN(price) || price <= 0) {
    res.status(400).json({ message: "Nama, kategori, deskripsi, gambar, dan harga wajib valid." });
    return;
  }

  try {
    const result = await runQuery(
      `INSERT INTO products (name, category, subcategory, price, rating, description, image, discount, wa_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, subcategory, Math.round(price), Number.isNaN(rating) ? 4.5 : rating, description, image, discount, waPhone]
    );
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

  if (!name || !category || !description || !image || Number.isNaN(price) || price <= 0) {
    res.status(400).json({ message: "Nama, kategori, deskripsi, gambar, dan harga wajib valid." });
    return;
  }

  try {
    const existing = await getQuery("SELECT id FROM products WHERE id = ?", [id]);
    if (!existing) {
      res.status(404).json({ message: "Produk tidak ditemukan." });
      return;
    }

    await runQuery(
      `UPDATE products
       SET name = ?, category = ?, subcategory = ?, price = ?, rating = ?, description = ?, image = ?, discount = ?, wa_phone = ?
       WHERE id = ?`,
      [name, category, subcategory, Math.round(price), Number.isNaN(rating) ? 4.5 : rating, description, image, discount, waPhone, id]
    );
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
  upload.single("logo"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "File logo wajib diupload." });
      return;
    }

    const logoUrl = `/picture/${req.file.filename}`;
    try {
      await runQuery(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        ["logo_url", logoUrl]
      );
      res.json({ message: "Logo berhasil diupload.", logoUrl });
    } catch (error) {
      res.status(500).json({ message: "Gagal menyimpan logo." });
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
  const { items, customerName, customerPhone, customerAddress, paymentMethod } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "Keranjang kosong." });
    return;
  }
  if (!customerName || !customerPhone || !customerAddress || !paymentMethod) {
    res.status(400).json({ message: "Lengkapi data checkout dan metode pembayaran." });
    return;
  }

  try {
    const qtyMap = new Map();
    items.forEach((id) => {
      const n = Number(id);
      if (!Number.isNaN(n)) {
        qtyMap.set(n, (qtyMap.get(n) || 0) + 1);
      }
    });
    const productIds = Array.from(qtyMap.keys());
    if (!productIds.length) {
      res.status(400).json({ message: "Item checkout tidak valid." });
      return;
    }
    const placeholders = productIds.map(() => "?").join(",");
    const rows = await allQuery(
      `SELECT id, name, price, discount FROM products WHERE id IN (${placeholders})`,
      productIds
    );
    const foundMap = new Map(rows.map((r) => [r.id, r]));
    const orderItems = [];
    let total = 0;
    for (const [productId, qty] of qtyMap.entries()) {
      const row = foundMap.get(productId);
      if (!row) continue;
      const finalPrice = calculateFinalPrice(row.price, row.discount);
      const subtotal = finalPrice * qty;
      total += subtotal;
      orderItems.push({
        productId,
        productName: row.name,
        price: row.price,
        discount: normalizeDiscount(row.discount),
        finalPrice,
        qty,
        subtotal,
      });
    }
    if (!orderItems.length) {
      res.status(400).json({ message: "Produk checkout tidak ditemukan." });
      return;
    }

    const orderResult = await runQuery(
      `INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, payment_method, total, status)
       VALUES (?, ?, ?, ?, ?, ?, 'paid')`,
      [req.user.id, String(customerName).trim(), String(customerPhone).trim(), String(customerAddress).trim(), String(paymentMethod).trim(), total]
    );
    for (const item of orderItems) {
      await runQuery(
        `INSERT INTO order_items (order_id, product_id, product_name, price, discount, final_price, qty, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderResult.lastID, item.productId, item.productName, item.price, item.discount, item.finalPrice, item.qty, item.subtotal]
      );
    }

    res.json({
      message: "Pembayaran berhasil diproses.",
      orderId: orderResult.lastID,
      total,
      itemCount: orderItems.reduce((sum, item) => sum + item.qty, 0),
      paymentMethod,
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal checkout." });
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
    const server = app.listen(PORT, () => {
      console.log(`Marketplace app running at http://localhost:${PORT}`);
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
