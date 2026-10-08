# Laporan Keamanan (Security Deep-Dive) — PasarKita / PT Sahabat Jaya Sukses

Dokumen ini memuat analisis teknis mendalam terhadap kerentanan keamanan aplikasi.
Setiap temuan disertai:
- **ID & Tingkat Risiko**: Critical, High, Medium, atau Low.
- **Status Bukti**: `[TERBUKTI]` (sudah dibaca dan diuji kode sumbernya) atau `[DUGAAN]`.
- **Lokasi Kode**: `file:baris` dan cuplikan kode nyata.
- **Dampak & Skenario Serangan**.
- **Rekomendasi Perbaikan**.

---

## 1. Stored XSS & DOM-Based XSS di Frontend (`public/*.js`)

Aplikasi menggunakan Vanilla JS dan banyak mengandalkan properti `.innerHTML` tanpa menerapkan sanitasi atau HTML encoding pada data pengguna.

### SEC-01: Stored XSS di Halaman Admin — Tabel Pengguna
* **Tingkat Risiko**: 🔴 **CRITICAL**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [public/admin.js:143-152](file:///d:/Projects/marketplace%20new/public/admin.js#L143-L152)
* **Bukti Kode**:
  ```javascript
  // public/admin.js:143-152
  usersTable.innerHTML = `
    ...
    <tbody>
      ${users
        .map(
          (u) => `
          <tr>
            <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.id}</td>
            <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.name}</td>
            <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.email}</td>
            <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.role}</td>
            <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.created_at || ""}</td>
  ```
* **Mekanisme & Dampak**:
  Input `name` dikirim publik melalui `POST /api/auth/register` tanpa sanitasi HTML di backend ([server.js:1653](file:///d:/Projects/marketplace%20new/server.js#L1653)). Penyerang dapat mendaftar dengan nama:
  `<img src=x onerror="fetch('/api/users/'+JSON.parse(localStorage.getItem('auth')).user.id+'/role',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token')},body:JSON.stringify({role:'admin'})})">`
  Ketika Admin membuka panel Admin tab **User**, browser mengeksekusi payload di konteks sesi Admin, mempromosikan penyerang menjadi Admin.
* **Perbaikan**:
  Bungkus setiap variabel dengan fungsi `escapeHtml()`:
  ```javascript
  <td style="padding:8px;">${escapeHtml(u.name)}</td>
  <td style="padding:8px;">${escapeHtml(u.email)}</td>
  ```

---

### SEC-02: Stored XSS di Halaman Admin — Tabel Pesanan (Orders)
* **Tingkat Risiko**: 🔴 **CRITICAL**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [public/admin.js:2845-2851](file:///d:/Projects/marketplace%20new/public/admin.js#L2845-L2851)
* **Bukti Kode**:
  ```javascript
  // public/admin.js:2845-2851
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">#${order.id}</td>
    <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
      ${order.customer_name}<br/>
      <span style="font-size: 0.85rem; color: #6b7280;">${order.customer_email || '-'}</span>
    </td>
    <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${new Date(order.created_at).toLocaleString('id-ID')}</td>
  ```
* **Mekanisme & Dampak**:
  Field `customerName` dimasukkan saat checkout oleh pengguna di `POST /api/checkout`. Ketika Admin membuka tab **Pesanan** di `admin.html`, `loadOrders()` merender nama pelanggan tanpa escaping langsung ke `tbody.innerHTML`.

---

### SEC-03: Stored XSS di Halaman Invoice Publik/Pelanggan
* **Tingkat Risiko**: 🔴 **CRITICAL**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [public/invoice.js:362-374](file:///d:/Projects/marketplace%20new/public/invoice.js#L362-L374) dan [public/invoice.js:393-399](file:///d:/Projects/marketplace%20new/public/invoice.js#L393-L399)
* **Bukti Kode**:
  ```javascript
  // public/invoice.js:362-374
  let itemsHtml = order.items.map(item => {
    ...
    return `
    <tr>
      <td>${item.product_name}${item.size ? ` <span style="color: #2563eb; font-size: 0.85rem;">(${item.size})</span>` : ""}</td>
    ...`;
  }).join("");

  // public/invoice.js:393-399
  <div class="invoice-details">
    <div>
      <h3>Info Penagihan & Pengiriman</h3>
      <p><strong>Nama:</strong> ${order.customer_name}</p>
      <p><strong>Email:</strong> ${order.customer_email || '-'}</p>
      <p><strong>Telepon:</strong> ${order.customer_phone}</p>
      <p><strong>Alamat:</strong><br/>${order.customer_address.replace(/\n/g, '<br/>')}</p>
  ```
* **Mekanisme & Dampak**:
  Invoice memuat `order.customer_name`, `order.customer_phone`, `order.customer_address`, dan `item.product_name` langsung ke dalam `invoiceContainer.innerHTML`. Admin yang mengklik tombol **"Lihat Invoice"** dari dashboard admin akan langsung terinfeksi payload XSS yang disuntikkan penyerang saat checkout.

---

### SEC-04: Stored XSS di Tabel Produk Admin
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [public/admin.js:870-877](file:///d:/Projects/marketplace%20new/public/admin.js#L870-L877)
* **Bukti Kode**:
  ```javascript
  // public/admin.js:870-877
  ${products
    .map(
      (product) => `
    <tr>
      <td style="padding:8px; border-bottom:1px solid #f3f4f6">${product.name}</td>
      <td style="padding:8px; border-bottom:1px solid #f3f4f6">${product.category} / ${product.subcategory || "Umum"}</td>
  ```
* **Mekanisme & Dampak**:
  Nama produk dan kategori diinterpolasikan mentah ke dalam DOM. Jika akun manager atau seed produk disisipkan teks HTML, skrip akan berjalan saat admin membuka tab Produk.

---

## 2. Autentikasi, JWT, & Rahasia (Secrets)

### SEC-05: Hardcoded Fallback JWT Secret di Kode Sumber
* **Tingkat Risiko**: 🔴 **CRITICAL**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:50](file:///d:/Projects/marketplace%20new/server.js#L50)
* **Bukti Kode**:
  ```javascript
  // server.js:50
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-marketplace";
  ```
* **Mekanisme & Dampak**:
  Jika file `.env` tidak menyetel `JWT_SECRET` (atau terhapus/gagal dimuat), aplikasi secara diam-diam menggunakan `"dev-secret-marketplace"`. Penyerang mana pun di internet dapat membuat token JWT secara offline dengan payload `{ "id": 1, "role": "admin" }` yang ditandatangani menggunakan secret default tersebut, lalu memperoleh akses penuh admin.
* **Perbaikan**:
  Hentikan proses startup jika secret default atau kosong digunakan di production:
  ```javascript
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET || JWT_SECRET === "dev-secret-marketplace" || JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: JWT_SECRET wajib diatur minimal 32 karakter!");
      process.exit(1);
    }
  }
  ```

---

### SEC-06: Token JWT Berlaku 7 Hari Tanpa Mekanisme Revokasi / Blacklist
* **Tingkat Risiko**: 🟡 **MEDIUM**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:1437-1445](file:///d:/Projects/marketplace%20new/server.js#L1437-L1445)
* **Bukti Kode**:
  ```javascript
  // server.js:1437-1445
  function createToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
  }
  ```
* **Mekanisme & Dampak**:
  Aplikasi tidak menyimpan versi token (`token_version`), tabel blacklist, atau session hash. Ketika seorang pengguna mengubah password via reset password ([server.js:1938](file:///d:/Projects/marketplace%20new/server.js#L1938)) atau ketika role diubah oleh admin, token lama yang sudah dipegang pengguna/penyerang tetap sah selama 7 hari ke depan.
* **Perbaikan**:
  Tambahkan kolom `token_version INTEGER DEFAULT 1` di tabel `users` dan sertakan versi ini dalam klaim JWT untuk validasi saat verifikasi token.

---

### SEC-07: Kebocoran Kunci API (Fonnte API Token) di Git History
* **Tingkat Risiko**: 🔴 **CRITICAL**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: Git Commit `b212a8a465b0c1ed037400006db34c84b4f218eb` pada file `.env.example`
* **Bukti Kode**:
  ```diff
  commit b212a8a465b0c1ed037400006db34c84b4f218eb
  Author: wisnu <167jkt.ikalus@gmail.com>
  Date:   Fri Jul 3 14:47:40 2026 +0700
  ...
  +# WhatsApp Chatbot (Fonnte)
  +FONNTE_API_TOKEN=1R8qHfa2************ (REDACTED)
  +WHATSAPP_BOT_NUMBER=628xxxxxxxxxx
  ```
* **Mekanisme & Dampak**:
  Meskipun commit berikutnya mengosongkan nilai tersebut di `.env.example`, token tersebut tersimpan permanen di riwayat commit git. Siapa pun yang meng-clone repositori dapat mengekstrak token Fonnte ini untuk mengirim pesan WA atau menyalahgunakan akun Fonnte.
* **Perbaikan**:
  1. Revoke / regenerasi token di portal Fonnte.
  2. Gunakan `git-filter-repo` untuk membersihkan riwayat git.

---

## 3. Upload File & Penanganan Media (Multer)

### SEC-08: Stored XSS Melalui Upload Logo SVG
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:380-396](file:///d:/Projects/marketplace%20new/server.js#L380-L396)
* **Bukti Kode**:
  ```javascript
  // server.js:380-396
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
  ```
* **Mekanisme & Dampak**:
  Logo disimpan di `uploadDir` (`public/picture`) yang dilayani statis oleh Express. Format `image/svg+xml` diizinkan tanpa sanitasi SVG XML (DOMPurify). File SVG yang memuat `<script>` atau `<svg onload="...">` jika diakses langsung di URL `/picture/logo-xxx.svg` akan dieksekusi langsung oleh browser sebagai skrip di origin aplikasi.
* **Perbaikan**:
  Hapus `image/svg+xml` dari daftar format yang diterima logo, atau render SVG ke PNG melalui library `sharp` sebelum disimpan ke disk.

---

### SEC-09: Logika OR (`||`) Mengizinkan Bypass Ekstensi File pada Multer
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:496-504](file:///d:/Projects/marketplace%20new/server.js#L496-L504) (Layanan) dan [server.js:531-539](file:///d:/Projects/marketplace%20new/server.js#L531-L539) (Payment Proof)
* **Bukti Kode**:
  ```javascript
  // server.js:496-504 (layananUpload)
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (LAYANAN_FILE_TYPES.has(file.mimetype) || LAYANAN_FILE_EXTS.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Berkas harus berupa gambar, PDF, Word, atau Excel."));
  }

  // server.js:531-539 (paymentProofUpload)
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (PAYMENT_PROOF_TYPES.has(file.mimetype) || PAYMENT_PROOF_EXTS.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Bukti bayar harus berupa gambar (JPG/PNG/WEBP) atau PDF."));
  }
  ```
* **Mekanisme & Dampak**:
  Penggunaan operator `||` (OR) memungkinkan penyerang mengirim file dengan ekstensi apa pun (misal `.html`, `.exe`, `.sh`) asalkan header HTTP `Content-Type` dimanipulasi menjadi `image/png`. File tetap disimpan dengan ekstensi aslinya:
  `cb(null, 'ly-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + (ext || ''))`.
* **Perbaikan**:
  Ubah operator menjadi `&&` (keduanya harus cocok):
  ```javascript
  if (LAYANAN_FILE_TYPES.has(file.mimetype) && LAYANAN_FILE_EXTS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Tipe file dan ekstensi tidak cocok."));
  }
  ```

---

### SEC-10: Potensi Denial of Service (OOM) via Memory Storage Multer
* **Tingkat Risiko**: 🟡 **MEDIUM**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:360-363](file:///d:/Projects/marketplace%20new/server.js#L360-L363)
* **Bukti Kode**:
  ```javascript
  // server.js:360-363
  const pictureMemoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB di-buffer ke RAM
  ```
* **Mekanisme & Dampak**:
  Mengalokasikan buffer 25 MB per koneksi langsung ke memori heap Node.js. Beberapa request upload gambar/video bersamaan dapat memicu kondisi Out-of-Memory (OOM) yang menyebabkan Node.js crash.
* **Perbaikan**:
  Gunakan `multer.diskStorage` ke direktori sementara OS daripada `multer.memoryStorage()`.

---

## 4. Pencadangan & Pemulihan (Backup & Restore)

### SEC-11: Celah Zip Slip pada Ekstraksi Backup
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [lib/backup.js:162-168](file:///d:/Projects/marketplace%20new/lib/backup.js#L162-L168)
* **Bukti Kode**:
  ```javascript
  // lib/backup.js:162-168
  async function restoreFromZip({ zipPath, rootDir }) {
    const unzipper = require("unzipper");
    const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjs-restore-"));
    try {
      const directory = await unzipper.Open.file(zipPath);
      await directory.extract({ path: extractDir });
  ```
* **Mekanisme & Dampak**:
  Fungsi `directory.extract({ path: extractDir })` dari library `unzipper` tidak melakukan sanitasi manual terhadap entri path yang mengandung traversal seperti `../../../../etc/`. File di dalam ZIP yang dirakit khusus dapat menulis file di luar folder `extractDir`.
* **Perbaikan**:
  Validasi entri zip sebelum mengekstrak:
  ```javascript
  for (const entry of directory.files) {
    const targetPath = path.resolve(extractDir, entry.path);
    if (!targetPath.startsWith(path.resolve(extractDir) + path.sep)) {
      throw new Error("Zip Slip terdeteksi pada entri: " + entry.path);
    }
  }
  ```

---

### SEC-12: Penghapusan Massal Folder Media pada Restore Parsial (DoS)
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [lib/backup.js:176-186](file:///d:/Projects/marketplace%20new/lib/backup.js#L176-L186)
* **Bukti Kode**:
  ```javascript
  // lib/backup.js:176-186
  for (const folder of MEDIA_FOLDERS) {
    const dest = absFromRel(rootDir, folder);
    const src = absFromRel(found.root, folder);
    if (fs.existsSync(src)) {
      replaceDirectory(src, dest);
    } else {
      emptyDirectory(dest); // <--- MENGHAPUS SEMUA ISI FOLDER DESTINASI JIKA FOLDER SRC TIDAK ADA!
    }
    restoredFolders += 1;
  }
  ```
* **Mekanisme & Dampak**:
  Jika admin merestore file backup ZIP yang hanya berisi database `marketplace.db` (misalnya backup database terjadwal tanpa file gambar produk yang berat), kode mengeksekusi `emptyDirectory(dest)` pada semua `MEDIA_FOLDERS`. Akibatnya, seluruh gambar produk, banner, dan foto QRIS di server **terhapus secara permanen**!
* **Perbaikan**:
  Hapus blok `else { emptyDirectory(dest); }`. Jangan pernah menghapus file yang ada jika folder di arsip ZIP tidak disediakan.

---

### SEC-13: Penimpaan File Database Aktif Tanpa Verifikasi Integritas SQLite
* **Tingkat Risiko**: 🟡 **MEDIUM**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [lib/backup.js:26-40](file:///d:/Projects/marketplace%20new/lib/backup.js#L26-L40)
* **Bukti Kode**:
  ```javascript
  // lib/backup.js:26-40
  function applyIncomingDatabase(rootDir, liveDbPath) {
    const incoming = incomingDbPath(rootDir);
    if (!fs.existsSync(incoming)) return false;
    ...
    fs.copyFileSync(incoming, liveDbPath);
    fs.unlinkSync(incoming);
    return true;
  }
  ```
* **Mekanisme & Dampak**:
  File `marketplace.db.incoming` langsung disalin menimpa `marketplace.db` aktif tanpa memeriksa apakah file tersebut benar-benar database SQLite valid (memeriksa 16-byte magic header `SQLite format 3\000` atau mengeksekusi `PRAGMA integrity_check`). File rusak akan menyebabkan server gagal booting.

---

## 5. Webhook, AI Chatbot, & Integrasi Pihak Ketiga

### SEC-14: Ketiadaan Autentikasi / Verifikasi Signature pada Webhook WhatsApp
* **Tingkat Risiko**: 🔴 **CRITICAL**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:5299-5304](file:///d:/Projects/marketplace%20new/server.js#L5299-L5304) dan [lib/whatsapp-bot.js:16-56](file:///d:/Projects/marketplace%20new/lib/whatsapp-bot.js#L16-L56)
* **Bukti Kode**:
  ```javascript
  // lib/whatsapp-bot.js:16-25
  async function handleWebhook({ req, res, getQuery, allQuery, runQuery }) {
    const body = req.body;
    console.log("WEBHOOK INCOMING:", JSON.stringify(body));
    
    if (!body || !body.sender) {
      return res.status(200).json({ status: true, message: "Ignored - missing sender" });
    }
    // ... TIDAK ADA TOKEN, SECRET, ATAU SIGNATURE DARI FONNTE ...
  ```
* **Mekanisme & Dampak**:
  Endpoint `POST /api/whatsapp/webhook` terbuka untuk siapa pun. Penyerang dapat mengirim payload JSON acak:
  1. **Quota / Wallet Drain**: Memaksa server memanggil Gemini Generative AI SDK ([lib/whatsapp-bot.js:80](file:///d:/Projects/marketplace%20new/lib/whatsapp-bot.js#L80)) terus-menerus hingga kuota habis.
  2. **SMS/WA Relay Abuse**: Menentukan nomor ponsel target di field `sender` sehingga server toko mengirimkan pesan balasan resmi via Fonnte ([lib/whatsapp-bot.js:83](file:///d:/Projects/marketplace%20new/lib/whatsapp-bot.js#L83)) ke korban penipuan/spam dengan biaya Fonnte milik toko.
* **Perbaikan**:
  Validasi token rahasia webhook (misalnya query parameter `?token=...` atau header HTTP rahasia yang dikonfigurasi di dashboard Fonnte):
  ```javascript
  if (req.headers["x-fonnte-token"] !== process.env.FONNTE_WEBHOOK_SECRET) {
    return res.status(401).json({ message: "Unauthorized webhook" });
  }
  ```

---

### SEC-15: Unauthenticated IDOR & Pembocoran Data Pesanan Melalui Chatbot CS
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [lib/cs-ai.js:145-155](file:///d:/Projects/marketplace%20new/lib/cs-ai.js#L145-L155) dipanggil dari [server.js:5307](file:///d:/Projects/marketplace%20new/server.js#L5307)
* **Bukti Kode**:
  ```javascript
  // lib/cs-ai.js:145-155
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
  ```
* **Mekanisme & Dampak**:
  Endpoint web chat `POST /api/chat` adalah publik dan tidak memerlukan login. Ketika seseorang mengetik: *"Halo, tolong cek pesanan 101"*, fungsi `findOrder` membaca nama pelanggan, status pesanan, dan nominal belanja pesanan #101 dari database, lalu menyuapkannya ke konteks AI. Bot AI kemudian membeberkan informasi pribadi dan transaksi pelanggan lain tersebut kepada penanya.
* **Perbaikan**:
  Hapus injeksi data pesanan otomatis ke chatbot publik. Arahkan pertanyaan status pesanan ke halaman resmi `/lacak.html` (yang memverifikasi nomor HP) atau `/orders.html` (yang memerlukan login pemilik pesanan).

---

## 6. Rate Limiting, Pengaturan Header, & Infrastruktur

### SEC-16: Ketiadaan Rate Limiting pada Endpoint Autentikasi & Brute-Force
* **Tingkat Risiko**: 🟡 **MEDIUM**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:1681](file:///d:/Projects/marketplace%20new/server.js#L1681) (`/api/auth/login`), [server.js:1653](file:///d:/Projects/marketplace%20new/server.js#L1653) (`/api/auth/register`), [server.js:5022](file:///d:/Projects/marketplace%20new/server.js#L5022) (`/api/orders/track`)
* **Bukti Kode**:
  Rate limiting in-memory hanya dipasang pada:
  - `POST /api/analytics/visit` ([server.js:1575](file:///d:/Projects/marketplace%20new/server.js#L1575))
  - `POST /api/auth/forgot-password` ([server.js:1862](file:///d:/Projects/marketplace%20new/server.js#L1862))
  - `POST /api/layanan` ([server.js:2530](file:///d:/Projects/marketplace%20new/server.js#L2530))
  - `POST /api/chat` ([server.js:5324](file:///d:/Projects/marketplace%20new/server.js#L5324))
  Endpoint krusial `POST /api/auth/login` **sama sekali tidak memiliki batas percobaan (rate limit)**.
* **Mekanisme & Dampak**:
  Penyerang dapat menjalankan serangan brute-force atau credential-stuffing terhadap akun admin atau pelanggan tanpa batas waktu. Selain itu, penyerang dapat melakukan enumerasi pesanan di `/api/orders/track`.
* **Perbaikan**:
  Terapkan library `express-rate-limit` pada endpoint login dan tracking pesanan.

---

### SEC-17: Kebijakan CORS Wildcard Terbuka Bebas
* **Tingkat Risiko**: 🟡 **MEDIUM**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:316](file:///d:/Projects/marketplace%20new/server.js#L316)
* **Bukti Kode**:
  ```javascript
  // server.js:316
  app.use(cors());
  ```
* **Mekanisme & Dampak**:
  Mengizinkan semua origin (`*`) untuk membaca endpoint API jika browser mengizinkannya. Sebaiknya dibatasi hanya pada domain resmi toko di production.

---

### SEC-18: Ketiadaan Security Headers (Helmet, CSP, HSTS, X-Frame-Options)
* **Tingkat Risiko**: 🟡 **MEDIUM**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:316-326](file:///d:/Projects/marketplace%20new/server.js#L316-L326)
* **Bukti Kode**:
  Aplikasi tidak menggunakan library `helmet` atau middleware penyetel header keamanan HTTP. Tidak ada header `Content-Security-Policy`, `X-Frame-Options` (rentan clickjacking), `X-Content-Type-Options: nosniff`, atau `Strict-Transport-Security`.

---

### SEC-19: Docker Container Dijalankan sebagai Root User
* **Tingkat Risiko**: 🟡 **MEDIUM**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [Dockerfile:33-60](file:///d:/Projects/marketplace%20new/Dockerfile#L33-L60)
* **Bukti Kode**:
  Pada Stage 2 (runtime), tidak ada deklarasi `USER node`:
  ```dockerfile
  # Dockerfile:33-60
  FROM node:22-bookworm-slim AS runtime
  WORKDIR /app
  ...
  ENTRYPOINT ["entrypoint.sh"]
  CMD ["node", "server.js"]
  ```
* **Mekanisme & Dampak**:
  Node.js berjalan dengan privilege `root` (UID 0) di dalam container. Jika terjadi eksploitasi eksekusi kode (RCE), penyerang langsung menguasai container dengan hak akses tertinggi.
* **Perbaikan**:
  Ubah kepemilikan direktori kerja ke user `node` dan tambahkan `USER node` sebelum `ENTRYPOINT`.

---

### SEC-20: File Antarmuka Admin (`public/admin.html`) Disajikan Statis Secara Terbuka
* **Tingkat Risiko**: 🔵 **LOW / INFO**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:318-326](file:///d:/Projects/marketplace%20new/server.js#L318-L326) dan [public/admin.html](file:///d:/Projects/marketplace%20new/public/admin.html)
* **Bukti Kode**:
  `express.static` menyajikan seluruh isi folder `public/` tanpa middleware otentikasi.
* **Mekanisme & Dampak**:
  Meskipun API-nya terlindungi `authMiddleware`, halaman `admin.html` dapat diunduh siapa saja secara anonim. Struktur HTML, ID elemen DOM, rute internal, dan konfigurasi form admin terekspos ke publik.

---

### SEC-21: Evaluasi Masking Rahasia pada Endpoint Pengaturan
* **Tingkat Risiko**: 🔵 **LOW (Sudah Termitigasi Sebagian)**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:2820-2826](file:///d:/Projects/marketplace%20new/server.js#L2820-L2826) dan [lib/shipping.js:160-176](file:///d:/Projects/marketplace%20new/lib/shipping.js#L160-L176)
* **Bukti Kode**:
  - `GET /api/admin/settings/mail`: Memanggil `publicMailSettings(settings)` yang menyembunyikan password SMTP (`hasPassword: Boolean(...)`). **Aman**.
  - `GET /api/admin/settings/shipping`: Memanggil `getShippingProviderStatus()` yang hanya menampilkan prefix 6-8 karakter (`keyPreview`, `clientPreview`). **Aman**.
  - `GET /api/settings`: Hanya mengembalikan `whatsappBotNumber`, `companyProfile`, `tax`, `banks`. Tidak membocorkan credential. **Aman**.

---

## 7. Daftar File / Bagian yang BELUM Dibaca

1. File biner [PT Sahabat Jaya Sukses.pdf](file:///d:/Projects/marketplace%20new/PT%20Sahabat%20Jaya%20Sukses.pdf) (13,9 MB).
2. Kode internal CDN eksternal (`Google GSI client` dan `html2pdf.js`).
