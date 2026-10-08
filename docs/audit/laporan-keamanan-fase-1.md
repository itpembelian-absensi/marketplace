# Laporan Penutupan Celah Keamanan (Fase 1) & Bukti Pengujian

Tanggal: 8 Oktober 2026  
Branch: `security-hardening`  
Status Direktori Kerja: Bersih (`clean working tree`)

---

## 1. Ringkasan Eksekutif & Tabel Temuan

| ID | Kategori / Temuan | Tingkat Keparahan | Status | Commit Terkait | Keterangan / Solusi |
|---|---|---|---|---|---|
| **SEC-01** | Kebocoran Secret di Git History (`FONNTE_API_TOKEN`) | High | Butuh Tindakan Manual | [`e026f3b`](https://github.com) | Key pernah ter-commit di `.env.example` masa lalu & dikutip di file docs. Kutipan di docs telah di-mask. Key wajib di-revoke manual di portal Fonnte. |
| **SEC-02** | XSS / Unescaped Variables di DOM Client (`public/*.js`) | High | Diperbaiki | [`68bc65a`](https://github.com) | Seluruh sinks (`innerHTML`) di 9 file frontend telah dibersihkan dan dibungkus `escapeHtml()`. Scan statis otomatis ditambahkan. |
| **SEC-03** | Penyimpanan JWT di Client (`localStorage`) | Medium | Butuh Keputusan User | - | JWT disimpan di `localStorage` (`marketplace_auth`). Rekomendasi arsitektur: pindah ke `HttpOnly`, `SameSite=Lax` Cookie. |
| **SEC-04** | Nama File Upload Predictable & Validasi File Lemah | High | Diperbaiki | [`51e5228`](https://github.com) | Nama file upload diubah menjadi `crypto.randomUUID() + safeExt`. Validasi magic bytes (PNG, JPG, WebP, GIF, PDF, MP4, WebM, Docx) diimplementasikan dan menolak 400 jika mismatch. Header `X-Content-Type-Options: nosniff` terpasang. |
| **SEC-05** | Chatbot WhatsApp Webhook PII Leak (IDOR via CS Bot) | High | Diperbaiki | [`2e0d9ea`](https://github.com), [`5131365`](https://github.com) | Chatbot tidak lagi mengambil data pembeli langsung untuk prompt publik. Autentikasi token webhook wajib ada. Uji perilaku (behavioral test) memastikan bot tidak membocorkan PII pesanan pengguna lain. |
| **SEC-06** | Race Condition Checkout / Overselling Stok | High | Diperbaiki (Arsitektur Dijelaskan) | [`4922fd6`](https://github.com), [`5131365`](https://github.com) | Pengecekan sisa stok dan deduksi diletakkan di dalam `BEGIN IMMEDIATE TRANSACTION`. SQLite lock serializes write transactions, mencegah overselling. |
| **SEC-07** | Race Condition Double-Spending Poin Reward | High | Diperbaiki | [`9c7b92e`](https://github.com) | Pemotongan poin dilakukan secara atomik di dalam transaksi database sebelum order di-commit. |
| **SEC-08** | Manipulasi Harga dari Client (Price Tampering) | Critical | Diperbaiki | [`58bb218`](https://github.com) | Server mengabaikan harga dari body request dan selalu menghitung total harga dari harga produk di database. |
| **SEC-09** | Broken Access Control / IDOR pada Order & Admin API | High | Diperbaiki | [`58bb218`](https://github.com) | Endpoint `/api/orders/:id` memvalidasi kepemilikan user ID. Rute admin dilindungi role-check `admin`/`manager`. |
| **SEC-10** | Mass Assignment Role & Status | High | Diperbaiki | [`58bb218`](https://github.com) | Input `role` saat register/update profil dan `status` saat checkout dibatasi ketat. |

---

## 2. Daftar Kunci / Secret yang Wajib Diganti Secara Manual

Berdasarkan pemindaian git history (`gitleaks`, `git log -S "fonnte"`, dan `git log -S "GEMINI"`):

1. **FONNTE_API_TOKEN**
   - **Lokasi bocor lama:** File `.env.example` line 22 pada commit `b212a8a4` (2026-03-01). Nilai token: `Qe...` (di-mask).
   - **Tindakan wajib:** Buka portal akun Fonnte ([https://fonnte.com](https://fonnte.com)), lakukan **Revoke / Regenerate API Token**, dan perbarui nilai di file `.env` server produksi.
2. **Catatan File `.env` dan Database:**
   - Pemeriksaan `git log --all --oneline -- .env "*.db"` mengonfirmasi bahwa file `.env` asli dan file database SQLite (`*.db`) **tidak pernah ter-commit** ke Git history repository ini.

---

## 3. Analisis Penyimpanan JWT di Client & Rekomendasi

- **Kondisi Saat Ini:**
  - Token JWT disimpan di `localStorage` browser pada key `marketplace_auth` (berisi JSON `{ token, user }`).
  - Disimpan saat login/register (`public/login.js`, `public/register.js`) dan dibaca oleh `public/common.js` untuk dikirimkan melalui header `Authorization: Bearer <token>`.
- **Risiko Keamanan:**
  - `localStorage` dapat diakses oleh skrip JavaScript apa pun yang berjalan pada origin yang sama. Jika celah XSS muncul, token dapat langsung dicuri (`localStorage.getItem(...)`).
- **Rekomendasi Arsitektur:**
  - Pindahkan token autentikasi ke **HTTP-Only, SameSite=Lax, Secure Cookie**.
  - Cookie yang memiliki atribut `HttpOnly` **tidak dapat diakses oleh JavaScript**, sehingga pencurian token via skrip XSS dapat dicegah sepenuhnya.
  - *Catatan:* Perubahan ini membutuhkan penyesuaian arsitektur API (penggunaan cookie parser di backend dan modifikasi alur redirect/fetch client). Menunggu konfirmasi pemilik project sebelum dieksekusi.

---

## 4. Hasil Audit Otomatis Dependency (`npm audit`)

Perintah yang dijalankan: `npm audit` (tanpa `--force`).

Output asli mendeteksi kerentanan upstream pada dependency:
- `body-parser` (2.0.0 - 2.2.2): Moderate (silently disables size enforcement)
- `brace-expansion` (2.0.0 - 2.1.6): High (CPU DoS)
- `multer` (<=2.2.0): High (DoS via nested field names, unhandled aborted uploads)
- `proxy-addr` (1.1.0 - 2.0.7): Critical (IP spoofing via IPv4-mapped IPv6 trust subnet)
- `qs` (2.2.5 - 6.15.3): Moderate (DoS via bracket-key comma parsing)
- `sharp` (<=0.35.5-rc.1): High (libvips / libheif vulnerabilities)
- `tar` (<=7.5.20): Critical (PAX size override & path type confusion)
- `undici` (<=6.28.0): High / Critical (HTTP header injection & socket reuse poisoning)

*Rekomendasi:* Jalankan `npm audit fix` untuk library minor, dan lakukan pengujian regresi terlebih dahulu sebelum memperbarui package breaking seperti `sharp@0.35.5`.

---

## 5. Ringkasan Pengujian Test Suite (`tests/security/`)

Seluruh 11 test otomatis berhasil dijalankan dengan database terisolasi:

```text
================================================================================
                           RINGKASAN HASIL PENGUJIAN                            
================================================================================
Durasi Eksekusi : 7.19 detik
Total Pengujian : 11
Lolos (PASS)    : 11
Gagal (FAIL)    : 0
--------------------------------------------------------------------------------
 1. [PASS] 01. Poin Reward Lifecycle (BIZ-04)
 2. [PASS] 02. Redeem Poin Paralel / Anti Double-Spending (BIZ-05)
 3. [PASS] 03. Checkout Stok Paralel / Anti Overselling (BIZ-06)
 4. [PASS] 04. Keamanan File Upload Multer (SEC-08, SEC-09)
 5. [PASS] 05. Otentikasi Webhook WhatsApp & Anti-Abuse (SEC-14)
 6. [PASS] 06. Pencegahan Stored XSS & Karakter Escape (<, >, ", ')
 7. [PASS] 07. Integritas Harga dari Client (Price Tampering)
 8. [PASS] 08. Pencegahan IDOR & Kebocoran PII Chatbot (SEC-15)
 9. [PASS] 09. Kontrol Akses & Role-Based Access Control (RBAC)
10. [PASS] 10. Pencegahan Mass Assignment & Privilege Escalation
11. [PASS] 11. Pemindaian Statis DOM XSS Sinks (Anti-Regresi)
================================================================================
```

---

## 6. Batasan Pengujian Lokal (Yang TIDAK Bisa Dibuktikan di Lingkungan Lokal)

1. **Pengiriman Token Nyata oleh Fonnte Gateway:**
   - Pengujian lokal memverifikasi bahwa endpoint webhook menolak request tanpa token rahasia yang cocok. Namun, di lingkungan live, kepastian apakah webhook provider (Fonnte) benar-benar menyertakan custom header atau parameter token tergantung pada konfigurasi di dashboard Fonnte pengguna.
2. **Kinerja Konkurensi Skala Besar di Database Berbeda (MySQL/PostgreSQL):**
   - SQLite bekerja menggunakan single file locking (`BEGIN IMMEDIATE TRANSACTION`), sehingga transaksi dieksekusi secara terserialisasi. Jika aplikasi di kemudian hari dimigrasikan ke PostgreSQL atau MySQL dengan pool multi-koneksi paralel sejati, perilaku race condition harus diuji ulang menggunakan mekanisme row locking (`SELECT ... FOR UPDATE`).
3. **Penyimpanan Token di Sisi Klien:**
   - Penolakan XSS berbasis DOM sudah diverifikasi via pengujian statis dan fungsi escape, namun selama JWT masih di `localStorage`, risiko exfiltration tetap ada jika terjadi serangan supply-chain/external script injection.
