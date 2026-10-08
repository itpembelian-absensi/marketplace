# Laporan Hasil Eksekusi Test Suite Keamanan Otomatis

Laporan ini mendokumentasikan implementasi dan hasil pengujian otomatis keamanan (*automated security test suite*) pada sistem Express.js + SQLite Marketplace. Pengujian dilakukan untuk memvalidasi perbaikan kerentanan pada cabang `security-hardening` serta membuktikan keberadaan celah keamanan lama pada cabang `main`.

---

## 1. Lingkungan dan Metodologi Pengujian

- **Framework Pengujian:** Modul bawaan Node.js (`assert`, `fetch`, `child_process`) tanpa dependensi eksternal berat.
- **Port Server Uji:** Port dinamis terisolasi (`5099`).
- **Database Uji:** Berkas database sementara (`marketplace.db` dicadangkan ke `marketplace.db.test_bak`, dibersihkan saat server start, dan dipulihkan kembali saat proses selesai).
- **Protokol:** Menjalankan instance server nyata melalui spawn proses terpisah dengan environment variabel uji terisolasi.
- **Batasan Pengujian:** Tidak menggunakan peramban atau Playwright; pengujian XSS dilakukan dengan memverifikasi escaping karakter `<, >, ", '` pada respons API, parser template server, dan fungsi sanitasi klien.

---

## 2. Cakupan Modul Pengujian (`tests/security/`)

| File Uji | Area Fokus | Kategori Kerentanan |
| :--- | :--- | :--- |
| `01-points.test.js` | Siklus hidup poin reward (unpaid vs paid vs status revert) | Business Logic (BIZ-04) |
| `02-points-race.test.js` | Penukaran poin secara konkuren (Anti Double-Spending) | Concurrency & Integrity (BIZ-05) |
| `03-stock-race.test.js` | Checkout bersamaan pada stok 1 unit (Anti Overselling) | Concurrency & Race Condition (BIZ-06) |
| `04-upload.test.js` | Unggah berkas Multer (Bypass ekstensi `.exe` & Stored XSS SVG) | File Upload Vulnerability (SEC-08, SEC-09) |
| `05-webhook.test.js` | Autentikasi webhook WhatsApp Fonnte via secret token | Insecure Direct Access & Abuse (SEC-14) |
| `06-xss.test.js` | Sanitasi karakter berbahaya (`<`, `>`, `"`, `'`) pada HTML escape | Stored & Reflected XSS |
| `07-price-tampering.test.js` | Manipulasi harga barang dari request payload klien | Business Logic & Tampering |
| `08-idor.test.js` | Isolasi akses pesanan antar-pengguna & kebocoran PII bot CS AI | Access Control & Privacy (SEC-15) |
| `09-access-control.test.js` | Role-Based Access Control (RBAC) rute manajemen admin | Broken Access Control |
| `10-mass-assignment.test.js` | Injeksi field privilege (`role: 'admin'`, `status: 'paid'`) | Mass Assignment / Privilege Escalation |

---

## 3. Hasil Pengujian Cabang `main` (Deteksi Kerentanan Lama)

Saat dijalankan pada cabang `main`, pengujian membuktikan kegagalan sistem pada **6 kerentanan kritis**:

```text
================================================================================
                 SECURITY AUDIT AUTOMATED TEST SUITE RUNNER                     
================================================================================
[INIT] Mempersiapkan server dan database test sementara...
[SERVER OUT] Marketplace app running at http://127.0.0.1:5099
[INIT] Server test aktif di http://127.0.0.1:5099 (DB terisolasi).

--- [TEST 01] Poin Reward Lifecycle (BIZ-04) ---
  [FAIL] 01. Poin Reward Lifecycle (BIZ-04)
  Penyebab: VULNERABILITY DETECTED: Poin sudah diberikan (50 poin) padahal pesanan masih 'unpaid'!
  50 !== 0

--- [TEST 02] Redeem Poin Paralel / Anti Double-Spending (BIZ-05) ---
  [FAIL] 02. Redeem Poin Paralel / Anti Double-Spending (BIZ-05)
  Penyebab: VULNERABILITY DETECTED: Double-spending berhasil! 2 dari 2 request redeem paralel berhasil lolos (status: 200, 200). Riwayat tercatat: 2 kali, saldo akhir: -100
  2 !== 1

--- [TEST 03] Checkout Stok Paralel / Anti Overselling (BIZ-06) ---
  [PASS] Race condition overselling tertangani: 1 pesanan sukses, 1 pesanan gagal karena stok habis.

--- [TEST 04] Keamanan File Upload Multer (SEC-08, SEC-09) ---
  [FAIL] 04. Keamanan File Upload Multer (SEC-08, SEC-09)
  Penyebab: VULNERABILITY DETECTED: Bypass ekstensi berhasil! File backdoor.exe dengan MIME image/png lolos validasi (status: 200) karena logika operator OR (||).
  200 !== 400

--- [TEST 05] Otentikasi Webhook WhatsApp & Anti-Abuse (SEC-14) ---
  [FAIL] 05. Otentikasi Webhook WhatsApp & Anti-Abuse (SEC-14)
  Penyebab: VULNERABILITY DETECTED: Webhook terbuka untuk publik tanpa otentikasi token (status: 200)! Penyerang bisa menghabiskan kuota AI / menyalahgunakan SMS relay.
  200 !== 401

--- [TEST 06] Pencegahan Stored XSS & Karakter Escape (<, >, ", ') ---
  [FAIL] 06. Pencegahan Stored XSS & Karakter Escape (<, >, ", ')
  Penyebab: VULNERABILITY DETECTED: Karakter single quote (') tidak di-escape pada server.js! Hasil: &lt;script&gt;alert(&quot;XSS ' test&quot;)&lt;/script&gt;

--- [TEST 07] Perlindungan Manipulasi Harga dari Client (Price Tampering) ---
  [PASS] Server mengabaikan harga manipulasi dari client dan menghitung harga valid dari database (Rp 300.000).

--- [TEST 08] Pencegahan IDOR & Kebocoran Data Pribadi (SEC-15) ---
  [PASS] Endpoint order terisolasi: User B ditolak saat mencoba mengakses order User A (403 Forbidden).
  [FAIL] 08. Pencegahan IDOR & Kebocoran PII Chatbot (SEC-15)
  Penyebab: VULNERABILITY DETECTED: Chatbot CS AI menyertakan customer_name dari database pesanan ke prompt publik! Potensi IDOR/PII Leakage.

--- [TEST 09] Kontrol Akses & Role-Based Access Control (RBAC) ---
  [PASS] Seluruh rute admin menolak user biasa dengan HTTP 403 Forbidden.
  [PASS] Akses anonim tanpa token ditolak dengan HTTP 401 Unauthorized.

--- [TEST 10] Pencegahan Mass Assignment & Eskalasi Privilege ---
  [PASS] Registrasi dengan injeksi role='admin' tetap menghasilkan role 'user'.
  [PASS] Update profil dengan injeksi role='admin' diabaikan, role tetap 'user'.
  [PASS] Pembuatan pesanan dengan injeksi status='paid' diabaikan, status tetap 'unpaid'.

[CLEANUP] Menghentikan server test dan memulihkan database...
[CLEANUP] Selesai.

================================================================================
                           RINGKASAN HASIL PENGUJIAN                            
================================================================================
Durasi Eksekusi : 8.35 detik
Total Pengujian : 10
Lolos (PASS)    : 4
Gagal (FAIL)    : 6
================================================================================
```

---

## 4. Hasil Pengujian Cabang `security-hardening` (Setelah Perbaikan)

Semua perbaikan kode diverifikasi kembali di cabang `security-hardening`. Seluruh modul pengujian menghasilkan **100% PASS**:

```text
================================================================================
                 SECURITY AUDIT AUTOMATED TEST SUITE RUNNER                     
================================================================================
[INIT] Mempersiapkan server dan database test sementara...
[SERVER OUT] Marketplace app running at http://127.0.0.1:5099
[INIT] Server test aktif di http://127.0.0.1:5099 (DB terisolasi).

--- [TEST 01] Poin Reward Lifecycle (BIZ-04) ---
  [PASS] Order status 'unpaid' tidak memberikan poin gratis.
  [PASS] Order status 'paid' berhasil mengkreditkan 50 poin ke saldo pembeli.
  [PASS] Perubahan status 'paid' -> 'unpaid' berhasil menarik kembali poin.

--- [TEST 02] Redeem Poin Paralel / Anti Double-Spending (BIZ-05) ---
  [PASS] Race condition tertangani: Hanya 1 request berhasil, request kedua ditolak (400).

--- [TEST 03] Checkout Stok Paralel / Anti Overselling (BIZ-06) ---
  [PASS] Race condition overselling tertangani: 1 pesanan sukses, 1 pesanan gagal karena stok habis.

--- [TEST 04] Keamanan File Upload Multer (SEC-08, SEC-09) ---
  [PASS] File berekstensi berbahaya dengan MIME spoofing berhasil ditolak (400 Bad Request).
  [PASS] Upload file SVG ditolak (400 Bad Request).
  [PASS] File gambar PNG valid berhasil diterima (200 OK).

--- [TEST 05] Otentikasi Webhook WhatsApp & Anti-Abuse (SEC-14) ---
  [PASS] Request webhook tanpa token ditolak (401 Unauthorized).
  [PASS] Request webhook dengan token salah ditolak (401 Unauthorized).
  [PASS] Request webhook dengan token valid diterima (200 OK).

--- [TEST 06] Pencegahan Stored XSS & Karakter Escape (<, >, ", ') ---
  [PASS] server.js: escapeHtml meng-escape <, >, ", dan ' dengan sempurna.
  [PASS] public/common.js: escapeHtml meng-escape <, >, ", dan ' dengan sempurna.
  [PASS] public/admin.js: escapeHtml meng-escape <, >, ", dan ' dengan sempurna.
  [PASS] public/invoice.js: escapeHtml meng-escape <, >, ", dan ' dengan sempurna.
  [PASS] public/home.js: escapeHtml meng-escape <, >, ", dan ' dengan sempurna.
  [PASS] public/address-master.js: escapeHtml meng-escape <, >, ", dan ' dengan sempurna.
  [PASS] server.js resetEmailBody: Template email HTML meng-escape seluruh tag dan karakter XSS.

--- [TEST 07] Perlindungan Manipulasi Harga dari Client (Price Tampering) ---
  [PASS] Server mengabaikan harga manipulasi dari client dan menghitung harga valid dari database (Rp 300.000).

--- [TEST 08] Pencegahan IDOR & Kebocoran Data Pribadi (SEC-15) ---
  [PASS] Endpoint order terisolasi: User B ditolak saat mencoba mengakses order User A (403 Forbidden).
  [PASS] Logika CS AI aman: Data pribadi/nama pelanggan tidak diekspos melalui chatbot publik.

--- [TEST 09] Kontrol Akses & Role-Based Access Control (RBAC) ---
  [PASS] Seluruh rute admin menolak user biasa dengan HTTP 403 Forbidden.
  [PASS] Akses anonim tanpa token ditolak dengan HTTP 401 Unauthorized.

--- [TEST 10] Pencegahan Mass Assignment & Eskalasi Privilege ---
  [PASS] Registrasi dengan injeksi role='admin' tetap menghasilkan role 'user'.
  [PASS] Update profil dengan injeksi role='admin' diabaikan, role tetap 'user'.
  [PASS] Pembuatan pesanan dengan injeksi status='paid' diabaikan, status tetap 'unpaid'.

[CLEANUP] Menghentikan server test dan memulihkan database...
[CLEANUP] Selesai.

================================================================================
                           RINGKASAN HASIL PENGUJIAN                            
================================================================================
Durasi Eksekusi : 11.63 detik
Total Pengujian : 10
Lolos (PASS)    : 10
Gagal (FAIL)    : 0
================================================================================
```

---

## 5. Ringkasan Perbaikan Teknis

1. **Loyalty Points Lifecycle (Commit `9c7b92e`):** Menghapus penambahan poin saat pesanan dibuat (`unpaid`). Poin hanya diberikan jika status pesanan diubah menjadi `paid`. Jika status dibatalkan kembali ke `unpaid`, poin ditarik secara otomatis.
2. **Anti Double-Spending Points (Commit `9c7b92e`):** Menggunakan query atomik berpengecekan saldo (`UPDATE user_points SET total_points = total_points - ? WHERE user_id = ? AND total_points >= ?`) untuk mencegah penukaran voucher ganda saat request paralel.
3. **Hardening Upload Multer (Commit `889da04` & `58bb218`):** Menghapus tipe `image/svg+xml` dari daftar yang diizinkan untuk mencegah Stored XSS. Mengubah logika operator `||` menjadi `&&` pada `layananUpload` dan `paymentProofUpload` sehingga spoofing MIME type dengan ekstensi berbahaya (`.exe`, `.php`, dll.) langsung ditolak dengan HTTP 400.
4. **Keamanan Webhook WhatsApp (Commit `2e0d9ea`):** Menambahkan verifikasi `FONNTE_WEBHOOK_SECRET` melalui query parameter atau header HTTP, mencegah eksekusi webhook tanpa otorisasi.
5. **Mitigasi XSS Menyeluruh (Commit `94b271b` & `42023a9`):** Menstandardisasi fungsi `escapeHtml` di seluruh kode backend dan frontend (`server.js`, `common.js`, `admin.js`, `invoice.js`, `home.js`, `address-master.js`) untuk meng-escape karakter `&`, `<`, `>`, `"`, dan `'` (`&#039;`).
6. **Perlindungan Privasi AI Customer Service (Commit `2e0d9ea`):** Menghapus query nama pelanggan dari fungsi pencarian pesanan CS AI publik guna mencegah Information Disclosure / IDOR.
7. **Pencegahan Overselling Transaksional (Commit `4922fd6`):** Menjalankan pemotongan dan validasi stok di dalam blok transaksi SQLite (`withTransaction`) sehingga permintaan bersamaan diisolasi dan dicegah menyebabkan stok minus.
