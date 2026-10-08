# Ringkasan Eksekutif & Rencana Aksi (Executive Summary) — PasarKita / PT Sahabat Jaya Sukses

Dokumen ini merangkum seluruh hasil audit kode, keamanan, ketergantungan pihak ketiga, dan integritas logika bisnis aplikasi web marketplace PT Sahabat Jaya Sukses.
Audit dilakukan dalam mode **ANALISIS SAJA** (tanpa mengubah, membuat, atau menghapus file kode sumber aplikasi, data, atau dependensi).

---

## 1. Tabel Master Seluruh Temuan Audit

| ID Temuan | Kategori | Ringkasan Temuan | Tingkat Risiko | Status Bukti & Perbaikan | Perkiraan Effort |
|---|---|---|---|---|---|
| **SEC-01** | Keamanan (XSS) | Stored XSS di tabel User Admin via nama pendaftar | 🔴 Critical | `[DIPERBAIKI]` (Commit `94b271b`, `68bc65a`) | Selesai |
| **SEC-02** | Keamanan (XSS) | Stored XSS di tabel Pesanan Admin via nama/email order | 🔴 Critical | `[DIPERBAIKI]` (Commit `94b271b`, `68bc65a`) | Selesai |
| **SEC-03** | Keamanan (XSS) | Stored XSS di halaman Invoice via alamat & nama pelanggan | 🔴 Critical | `[DIPERBAIKI]` (Commit `94b271b`, `68bc65a`) | Selesai |
| **SEC-05** | Keamanan (Auth) | Hardcoded default JWT secret `"dev-secret-marketplace"` | 🔴 Critical | `[DIPERBAIKI]` (Commit `2114bb7`) | Selesai |
| **SEC-07** | Keamanan (Secret) | Kebocoran token Fonnte aktif di commit Git `b212a8a` | 🔴 Critical | `[MASKED - REVOKE MANUAL]` (Commit `e026f3b`) | Butuh Aksi User |
| **SEC-14** | Keamanan (Webhook) | Webhook WhatsApp publik tanpa token / signature Fonnte | 🔴 Critical | `[DIPERBAIKI]` (Commit `2e0d9ea`) | Selesai |
| **BIZ-04** | Logika Bisnis | Poin reward diberikan seketika pada order status `unpaid` | 🔴 Critical | `[DIPERBAIKI]` (Commit `9c7b92e`) | Selesai |
| **SEC-04** | Keamanan (XSS) | Stored XSS pada render nama & kategori produk di admin | 🟠 High | `[DIPERBAIKI]` (Commit `68bc65a`) | Selesai |
| **SEC-08** | Keamanan (Upload) | Stored XSS melalui upload logo bertipe `image/svg+xml` | 🟠 High | `[DIPERBAIKI]` (Commit `889da04`, `51e5228`) | Selesai |
| **SEC-09** | Keamanan (Upload) | Logika OR (`\|\|`) meloloskan bypass ekstensi upload Multer | 🟠 High | `[DIPERBAIKI]` (Commit `889da04`, `51e5228`) | Selesai |
| **SEC-11** | Keamanan (Backup) | Potensi Zip Slip pada ekstraksi file backup restore | 🟠 High | `[TERBUKTI - FASE 2]` | Medium (3 jam) |
| **SEC-12** | Keamanan (Backup) | Penghapusan massal gambar produk jika restore zip parsial | 🟠 High | `[TERBUKTI - FASE 2]` | Low (1 jam) |
| **SEC-15** | Keamanan (IDOR) | Chatbot CS membocorkan nama & nominal order acak ke publik | 🟠 High | `[DIPERBAIKI]` (Commit `2e0d9ea`, `5131365`) | Selesai |
| **BIZ-05** | Logika Bisnis | Double-spending race condition pada klaim reward poin | 🟠 High | `[DIPERBAIKI]` (Commit `9c7b92e`) | Selesai |
| **BIZ-06** | Logika Bisnis | Race condition overselling stok (stok dicek di luar transaksi) | 🟠 High | `[DIPERBAIKI]` (Commit `4922fd6`, `5131365`) | Selesai |
| **DEP-02** | Dependensi | Paket `multer@2.1.1` rentan DoS field multipart bersarang | 🟠 High | `[TERBUKTI - FASE 2]` | Low (1 jam) |
| **DEP-03** | Dependensi | Paket `sharp@0.34.5` mewarisi CVE libvips/libheif | 🟠 High | `[TERBUKTI - FASE 2]` | Medium (2 jam) |
| **SEC-06** | Keamanan (Auth) | JWT expiry 7 hari tanpa mekanisme revokasi / versioning | 🟡 Medium | `[TERBUKTI - FASE 2]` | Medium (4 jam) |
| **SEC-10** | Keamanan (DoS) | Alokasi 25 MB RAM per koneksi pada memoryStorage Multer | 🟡 Medium | `[TERBUKTI - FASE 2]` | Low (1 jam) |
| **SEC-13** | Keamanan (DB) | Restore database SQLite tanpa validasi header / integritas | 🟡 Medium | `[TERBUKTI - FASE 2]` | Low (1 jam) |
| **SEC-16** | Keamanan (Brute-Force) | Ketiadaan rate limit pada `/api/auth/login` & tracking order | 🟡 Medium | `[TERBUKTI - FASE 2]` | Low (2 jam) |
| **SEC-17** | Keamanan (CORS) | CORS mengizinkan wildcard `*` secara bebas | 🟡 Medium | `[TERBUKTI - FASE 2]` | Low (30 menit) |
| **SEC-18** | Keamanan (Headers) | Ketiadaan HTTP security headers (Helmet, CSP, X-Frame) | 🟡 Medium | `[DIPERBAIKI NOSNIFF]` (Commit `51e5228`) | Fase 2 untuk CSP |
| **SEC-19** | Keamanan (Docker) | Container Docker runtime berjalan sebagai user `root` | 🟡 Medium | `[TERBUKTI - FASE 2]` | Low (1 jam) |
| **BIZ-07** | Arsitektur DB | Varian ukuran disimpan sebagai JSON string di tabel produk | 🟡 Medium | `[TERBUKTI - FASE 3]` | High (1-2 hari) |
| **DEP-01** | Dependensi | Paket `tar` CVE Critical ditarik build-time oleh node-gyp | 🔵 Low | `[TERBUKTI - FASE 2]` | Low (30 menit) |
| **DEP-05** | Dependensi | `body-parser` dan `qs` memiliki advisory DoS | 🔵 Low | `[TERBUKTI - FASE 2]` | Low (30 menit) |
| **SEC-20** | Keamanan (Eksposur) | File `public/admin.html` dilayani statis tanpa auth server | 🔵 Low | `[TERBUKTI - FASE 2]` | Medium (3 jam) |
| **HLTH-01** | Kesehatan Kode | Monolitik `server.js` (5.553 baris) & `admin.js` (4.591 baris) | 🟡 Medium | `[TERBUKTI - FASE 3]` | High (3-5 hari) |
| **HLTH-02** | Kesehatan Kode | Zero automated test (0% test coverage) pada alur kritis | 🟡 Medium | `[DIPERBAIKI - 11 TESTS]` (Commit `58bb218`, `5131365`) | Selesai (100% Pass) |
| **HLTH-03** | Kesehatan Kode | File sisa / artefak sampah di root git (PDF 13.9 MB, dump log) | 🔵 Low | `[TERBUKTI - FASE 3]` | Low (30 menit) |

---

## 2. Rencana Aksi & Urutan Pengerjaan Terstruktur

Untuk menjamin peluncuran (*launch*) aplikasi berlangsung aman tanpa risiko kebocoran data, pencurian sesi admin, penipuan saldo, atau gangguan operasional, pengerjaan dibagi menjadi tiga fase:

```text
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: WAJIB SEBELUM LAUNCH (P0 / P1 Security Blockers)    │
│ Estimasi: 1 - 2 Hari Kerja                                  │
├─────────────────────────────────────────────────────────────┤
│ • Patch Stored XSS di admin.js, invoice.js via escapeHtml() │
│ • Hapus default secret JWT & wajibkan secret kuat di .env   │
│ • Revoke Fonnte Token & bersihkan git history               │
│ • Tambah token rahasia pada Webhook WhatsApp                │
│ • Ubah pemberian poin hanya saat pesanan berstatus 'paid'   │
│ • Matikan pembocoran data order otomatis di chatbot CS AI   │
│ • Validasi ulang stok di dalam transaksi atomik checkout    │
│ • Hapus SVG dari logo upload & perbaiki logika && di Multer │
│ • Perbarui multer ke versi bebas DoS multipart              │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: BOLEH SESUDAH LAUNCH (P2 Penguatan Sistem)          │
│ Estimasi: 2 - 3 Hari Kerja                                  │
├─────────────────────────────────────────────────────────────┤
│ • Pasang express-rate-limit pada login dan tracking order   │
│ • Cegah double-spending poin via UPDATE atomic conditional  │
│ • Pasang helmet (security headers) dan batasi CORS          │
│ • Konfigurasi non-root USER node di Dockerfile              │
│ • Amankan Zip Slip & hapus logika penghapusan massal folder │
│ • Aktifkan SQLite PRAGMA journal_mode = WAL;                │
│ • Alihkan Multer memoryStorage ke diskStorage sementara     │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: REFACTORING & CODE HEALTH (P3 Pemeliharaan)         │
│ Estimasi: 1 - 2 Minggu Bertahap                             │
├─────────────────────────────────────────────────────────────┤
│ • Pecah server.js (5.553 baris) ke struktur MVC/modular     │
│ • Pecah admin.js (4.591 baris) ke modul fitur terpisah      │
│ • Pisahkan varian ukuran ke tabel relasional terpisah       │
│ • Buat automated test suite (Jest/Supertest) untuk checkout │
│ • Bersihkan file sisa (extract.txt, PDF 13.9 MB, script.py) │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Indeks Dokumen Laporan Lengkap

Audit ini dirinci ke dalam dokumen-dokumen pendukung berikut di folder [docs/audit/](file:///d:/Projects/marketplace%20new/docs/audit/):
1. [01-endpoints.md](file:///d:/Projects/marketplace%20new/docs/audit/01-endpoints.md): Tabel lengkap 103 rute API, hak akses, validasi, dan keamanan query.
2. [02-security.md](file:///d:/Projects/marketplace%20new/docs/audit/02-security.md): Bedah mendalam seluruh celah XSS, token bocor, upload multer, webhook, chatbot, dan Docker.
3. [03-business-logic.md](file:///d:/Projects/marketplace%20new/docs/audit/03-business-logic.md): Analisis kalkulasi checkout, pajak, exploit reward poin, dan race condition stok.
4. [04-dependencies.md](file:///d:/Projects/marketplace%20new/docs/audit/04-dependencies.md): Penelusuran 7 advisory `npm audit` dan evaluasi paparan runtime.
5. [05-code-health.md](file:///d:/Projects/marketplace%20new/docs/audit/05-code-health.md): Metrik ukuran file, tight coupling, ketiadaan tes, dan panduan refactoring arsitektur.
6. [06-automated-test-report.md](file:///d:/Projects/marketplace%20new/docs/audit/06-automated-test-report.md): Laporan dan log otentik test runner otomatis keamanan (11 pengujian terisolasi).
7. [laporan-keamanan-fase-1.md](file:///d:/Projects/marketplace%20new/docs/audit/laporan-keamanan-fase-1.md): Laporan resmi penutupan celah keamanan Fase 1 (bukti commit, audit secret, sanitasi DOM, dan batasan uji lokal).

---

## 4. Daftar File / Bagian yang BELUM Dibaca

Dalam pelaksanaan audit ini, area berikut **belum dibaca/diuji secara langsung**:
1. File biner [PT Sahabat Jaya Sukses.pdf](file:///d:/Projects/marketplace%20new/PT%20Sahabat%20Jaya%20Sukses.pdf) (13,9 MB di root repositori).
2. Kode pustaka JavaScript eksternal yang di-load dari CDN runtime (`Google GSI` client di `https://accounts.google.com/gsi/client` dan library generator client-side `html2pdf.js`).
