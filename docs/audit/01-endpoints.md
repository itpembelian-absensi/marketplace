# Audit Endpoint API — PasarKita / Web PT Sahabat Jaya Sukses

Dokumen ini memetakan seluruh rute HTTP yang didefinisikan dalam [server.js](file:///d:/Projects/marketplace%20new/server.js).
Setiap endpoint dianalisis berdasarkan:
1. **Route & Method**: Alamat endpoint dan metode HTTP.
2. **File:Baris**: Lokasi baris definisi dalam [server.js](file:///d:/Projects/marketplace%20new/server.js).
3. **Autentikasi (Auth Required)**: `Yes` (memerlukan `authMiddleware`), `Optional` (`optionalAuth`), atau `No` (publik).
4. **Role Check**: Otorisasi level role (`admin`, `manager`, `user`, atau `Public`).
5. **Validasi Input**: Tingkat validasi payload request (`body`, `params`, `query`).
6. **Query SQL**: Apakah menggunakan query parameterized (`?`), perakitan string/template literal, atau tidak memanggil database (`N/A`).
7. **Akses Data User Lain (IDOR)**: Evaluasi apakah pengguna dapat mengakses/memodifikasi data milik entitas/pengguna lain.

---

## 1. Tabel Pemetaan Seluruh Endpoint (103 Rute)

### A. Halaman Publik & Statis

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 1 | `GET /` | `server.js:336` | No | Public | N/A | N/A | Aman (Halaman statis) |
| 2 | `GET /shop` | `server.js:340` | No | Public | N/A | N/A | Aman (Halaman statis) |
| 3 | `GET /orders` | `server.js:344` | No | Public | N/A | N/A | Aman (Halaman statis) |
| 4 | `GET /lacak` | `server.js:348` | No | Public | N/A | N/A | Aman (Halaman statis) |
| 5 | `GET /layanan` | `server.js:352` | No | Public | N/A | N/A | Aman (Halaman statis) |

---

### B. Analitik & Kunjungan

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 6 | `POST /api/analytics/visit` | `server.js:1561` | No | Public | Regex UUID, string slice, rate limit IP | Aman (Parameterized `?`) | Aman (Hanya agregat data anonim) |
| 7 | `GET /api/admin/analytics` | `server.js:1604` | Yes | admin, manager | Regex YYYY-MM-DD | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |

---

### C. Autentikasi & Akun Pengguna

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 8 | `POST /api/auth/register` | `server.js:1653` | No | Public | Cek empty (`name`, `email`, `password`) | Aman (Parameterized `?`) | Aman (Membuat record baru) |
| 9 | `POST /api/auth/login` | `server.js:1681` | No | Public | Cek empty (`email`, `password`) | Aman (Parameterized `?`) | Aman (Autentikasi kredensial) |
| 10 | `POST /api/auth/google` | `server.js:1715` | No | Public | Verifikasi token OAuth Google | Aman (Parameterized `?`) | Aman (Verifikasi token Google) |
| 11 | `PUT /api/auth/profile` | `server.js:1771` | Yes | User | Slice nama, sanitasi string password | Aman (Parameterized `?`) | Aman (`WHERE id = req.user.id`) |
| 12 | `POST /api/auth/profile-picture` | `server.js:1809` | Yes | User | Multer diskStorage (mimetype filter) | Aman (Parameterized `?`) | Aman (`WHERE id = req.user.id`) |
| 13 | `POST /api/auth/forgot-password` | `server.js:1855` | No | Public | Regex email, rate limit IP | Aman (Parameterized `?`) | Aman (Token acak 32 bytes terenkripsi SHA256) |
| 14 | `GET /api/auth/reset-password` | `server.js:1906` | No | Public | Cek token di query | Aman (Parameterized `?`) | Aman (Verifikasi token reset) |
| 15 | `POST /api/auth/reset-password` | `server.js:1919` | No | Public | Cek token, minlength password >= 6 | Aman (Parameterized `?`) | Aman (Verifikasi token reset) |
| 16 | `GET /api/auth/me` | `server.js:1947` | Yes | User | N/A | Aman (Parameterized `?`) | Aman (`WHERE id = req.user.id`) |

---

### D. Manajemen Pengguna (Admin Panel)

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 17 | `GET /api/users` | `server.js:1963` | Yes | admin, manager | N/A | Aman (Parameterized `?`) | Aman (Akses terbatas admin/manager) |
| 18 | `POST /api/users` | `server.js:1974` | Yes | admin, manager | Cek empty, restriksi role manager | Aman (Parameterized `?`) | Aman (Akses terkontrol role) |
| 19 | `PUT /api/users/:id` | `server.js:2018` | Yes | admin | Number(req.params.id), whitelist role | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 20 | `PATCH /api/users/:id/password` | `server.js:2077` | Yes | User / admin | Minlength 6, restriksi user hanya ubah akun sendiri | Aman (Parameterized `?`) | Aman (`userId !== req.user.id && role !== 'admin'` ditolak) |
| 21 | `PATCH /api/users/:id/role` | `server.js:2108` | Yes | admin | Whitelist `['admin', 'manager', 'user']` | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 22 | `DELETE /api/users/:id` | `server.js:2135` | Yes | admin | Cegah self-delete (`id !== req.user.id`) | Aman (Parameterized `?`) | Aman (Khusus admin) |

---

### E. Pengaturan Toko, Profil Perusahaan, & Branding

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 23 | `GET /api/settings` | `server.js:2242` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Data konfigurasi publik) |
| 24 | `GET /api/company-profile` | `server.js:2327` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Data publik) |
| 25 | `PUT /api/admin/settings/profile` | `server.js:2328` | Yes | admin | Sanitasi string nama, kontak | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 26 | `POST /api/admin/picture/upload` | `server.js:2356` | Yes | admin | Validasi whitelist folder, Multer filter | N/A | Aman (Khusus admin) |
| 27 | `GET /api/branding/page` | `server.js:2385` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Data publik) |
| 28 | `PUT /api/admin/branding/page` | `server.js:2395` | Yes | admin | Regex hex color, string slice | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 29 | `GET /api/admin/branding/header-social` | `server.js:2409` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 30 | `PUT /api/admin/branding/header-social` | `server.js:2420` | Yes | admin | Regex URL / sanitasi array | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 31 | `POST /api/admin/logo` | `server.js:2475` | Yes | admin | Multer diskStorage | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 32 | `PUT /api/admin/home` | `server.js:2485` | Yes | admin | Normalisasi array slides/features | Aman (Parameterized `?`) | Aman (Khusus admin) |

---

### F. Layanan Khusus & Kustom

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 33 | `POST /api/layanan` | `server.js:2520` | Optional | Guest / User | Whitelist tipe, required field, rate limit | Aman (Parameterized `?`) | Aman (Tiket baru) |
| 34 | `GET /api/admin/layanan` | `server.js:2612` | Yes | admin, manager | Limit 200 | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 35 | `PATCH /api/admin/layanan/:id` | `server.js:2634` | Yes | admin, manager | Whitelist status (`new, in_progress, done`) | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 36 | `GET /api/admin/layanan/:id/file` | `server.js:2653` | Yes | admin, manager | Type check ID, path.basename | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |

---

### G. Rekening Bank, Pembayaran, Pajak, & Timeout

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 37 | `GET /api/admin/banks` | `server.js:2680` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 38 | `POST /api/admin/banks` | `server.js:2690` | Yes | admin | Cek empty `bankName`, `accountNumber` | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 39 | `PUT /api/admin/banks/:id` | `server.js:2709` | Yes | admin | Type check ID, cek empty | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 40 | `DELETE /api/admin/banks/:id` | `server.js:2725` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 41 | `GET /api/settings/payment` | `server.js:2778` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Publik) |
| 42 | `PUT /api/admin/settings/payment` | `server.js:2789` | Yes | admin | Sanitasi URL QRIS | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 43 | `POST /api/admin/settings/qris` | `server.js:2801` | Yes | admin | Multer diskStorage (mimetype filter) | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 44 | `GET /api/admin/settings/mail` | `server.js:2820` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Password dimaskir) |
| 45 | `PUT /api/admin/settings/mail` | `server.js:2829` | Yes | admin | Type check port/boolean | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 46 | `POST /api/admin/settings/mail/test` | `server.js:2856` | Yes | admin | Regex email penerima | N/A | Aman (Khusus admin) |
| 47 | `GET /api/admin/settings/payment-timeout` | `server.js:2948` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 48 | `PUT /api/admin/settings/payment-timeout` | `server.js:2958` | Yes | admin | Type check integer jam/menit | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 49 | `GET /api/admin/settings/tax` | `server.js:2988` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 50 | `PUT /api/admin/settings/tax` | `server.js:2998` | Yes | admin | Whitelist mode (`none, exclude, include`), range % | Aman (Parameterized `?`) | Aman (Khusus admin) |

---

### H. Jasa Kirim & Geocoding

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 51 | `GET /api/shipping/options` | `server.js:3099` | No | Public | N/A | N/A | Aman (Publik) |
| 52 | `POST /api/shipping/quote` | `server.js:3108` | No | Public | Type check lat/lng, subtotal | N/A | Aman (Kalkulasi tarif) |
| 53 | `GET /api/shipping/geocode` | `server.js:3140` | No | Public | Cek empty string query | N/A | Aman (Proxy Nominatim) |
| 54 | `GET /api/admin/settings/shipping` | `server.js:3142` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 55 | `POST /api/admin/settings/shipping/resolve-location` | `server.js:3157` | Yes | admin | Cek empty text link | N/A | Aman (Khusus admin) |
| 56 | `POST /api/admin/settings/shipping/test` | `server.js:3180` | Yes | admin | Whitelist provider (`lalamove, gosend, all`) | N/A | Aman (Khusus admin) |
| 57 | `PUT /api/admin/settings/shipping` | `server.js:3203` | Yes | admin | Type check float coordinate/fees | Aman (Parameterized `?`) | Aman (Khusus admin) |

---

### I. Manajemen Buku Alamat Pelanggan

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 58 | `GET /api/addresses` | `server.js:3249` | Yes | User | N/A | Aman (Parameterized `?`) | Aman (`WHERE user_id = req.user.id`) |
| 59 | `POST /api/addresses` | `server.js:3261` | Yes | User | Cek empty, type check lat/lng | Aman (Parameterized `?`) | Aman (`INSERT ... user_id = req.user.id`) |
| 60 | `PUT /api/addresses/:id` | `server.js:3304` | Yes | User | Type check ID, validasi field | Aman (Parameterized `?`) | Aman (`WHERE id = ? AND user_id = req.user.id`) |
| 61 | `PUT /api/addresses/:id/default` | `server.js:3365` | Yes | User | Type check ID | Aman (Parameterized `?`) | Aman (`WHERE id = ? AND user_id = req.user.id`) |
| 62 | `DELETE /api/addresses/:id` | `server.js:3388` | Yes | User | Type check ID | Aman (Parameterized `?`) | Aman (`WHERE id = ? AND user_id = req.user.id`) |

---

### J. Master Data (Kategori, Merek, Artikel, Produk)

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 63 | `GET /api/categories` | `server.js:3419` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Katalog publik) |
| 64 | `GET /api/brands` | `server.js:3509` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Katalog publik) |
| 65 | `POST /api/admin/brands` | `server.js:3535` | Yes | admin | Multer / Type check integer order | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 66 | `PUT /api/admin/brands/:id` | `server.js:3569` | Yes | admin | Type check ID, sanitize scale/coord | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 67 | `DELETE /api/admin/brands/:id` | `server.js:3614` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 68 | `GET /api/articles` | `server.js:3685` | No | Public | Limit & offset sanitization | Aman (Parameterized `?`) | Aman (Katalog publik) |
| 69 | `GET /api/articles/:slug` | `server.js:3703` | No | Public | String sanitization slug | Aman (Parameterized `?`) | Aman (Katalog publik) |
| 70 | `GET /api/admin/articles` | `server.js:3721` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 71 | `POST /api/admin/articles` | `server.js:3730` | Yes | admin | Auto slug, fallback excerpt | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 72 | `PUT /api/admin/articles/:id` | `server.js:3754` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 73 | `DELETE /api/admin/articles/:id` | `server.js:3787` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 74 | `POST /api/admin/categories` | `server.js:3807` | Yes | admin | Cek empty name | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 75 | `PUT /api/admin/categories/:id` | `server.js:3832` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 76 | `DELETE /api/admin/categories/:id` | `server.js:3864` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 77 | `GET /api/admin/products` | `server.js:3929` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 78 | `POST /api/admin/products` | `server.js:3957` | Yes | admin | Validasi JSON sizes, type check harga | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 79 | `PUT /api/admin/products/:id` | `server.js:3997` | Yes | admin | Type check ID, numeric fields | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 80 | `DELETE /api/admin/products/:id` | `server.js:4058` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 81 | `GET /api/products` | `server.js:4176` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Katalog publik) |
| 82 | `GET /api/products/:id` | `server.js:4185` | No | Public | Type check ID | Aman (Parameterized `?`) | Aman (Katalog publik) |

---

### K. Checkout, Laporan, & Pesanan (Orders)

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 83 | `POST /api/checkout` | `server.js:4200` | Yes | User | Array items check, numeric qty & fee | **Template Literal Placeholder `?`** (L4260) — Aman | Aman (Dibuat atas nama `req.user.id`) |
| 84 | `GET /api/admin/sales/report` | `server.js:4507` | Yes | admin, manager | Regex tanggal window | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 85 | `GET /api/admin/inventory/report` | `server.js:4615` | Yes | admin, manager | N/A | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 86 | `GET /api/admin/orders` | `server.js:4670` | Yes | admin, manager | N/A | **Template Literal Column Fields** (L4673) — Aman | Aman (Khusus admin/manager) |
| 87 | `GET /api/orders/my` | `server.js:4681` | Yes | User | N/A | **Template Literal Column Fields & Placeholders** (L4685, L4693) — Aman | Aman (`WHERE user_id = req.user.id`) |
| 88 | `GET /api/orders/:id` | `server.js:4721` | Yes | User / admin | Type check ID | **Template Literal Column Fields** (L4731) — Aman | Aman (`canAccessOrder()` memvalidasi `user_id == req.user.id` atau role admin) |
| 89 | `POST /api/orders/:id/payment-proof` | `server.js:4762` | Yes | User / admin | Multer filter, type check ID | Aman (Parameterized `?`) | Aman (`canAccessOrder()` memvalidasi kepemilikan) |
| 90 | `GET /api/orders/:id/payment-proof` | `server.js:4827` | Yes | User / admin | Type check ID, path.basename | Aman (Parameterized `?`) | Aman (`canAccessOrder()` memvalidasi kepemilikan) |
| 91 | `GET /api/admin/notifications` | `server.js:4862` | Yes | admin, manager | N/A | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 92 | `POST /api/admin/notifications/read-all` | `server.js:4903` | Yes | admin, manager | N/A | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 93 | `POST /api/admin/notifications/:id/read` | `server.js:4912` | Yes | admin, manager | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 94 | `PUT /api/admin/orders/:id/status` | `server.js:4926` | Yes | admin, manager | Whitelist status (`paid, unpaid`) | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 95 | `PUT /api/admin/orders/:id/entity` | `server.js:4959` | Yes | admin, manager | Whitelist entity (`SJS, SJL`) | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 96 | `PUT /api/admin/orders/:id/shipment` | `server.js:4981` | Yes | admin, manager | Whitelist shipment status | **Template Literal Column Fields** (L5010) — Aman | Aman (Khusus admin/manager) |
| 97 | `POST /api/orders/track` | `server.js:5022` | No | Public | Numeric ID, string phone | **Template Literal Column Fields** (L5032) — Aman | **[DUGAAN IDOR / Enumerasi]**: Tanpa rate limit, membandingkan 8 digit nomor HP via `phonesMatch()` |
| 98 | `POST /api/admin/orders/:id/void` | `server.js:5075` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 99 | `DELETE /api/admin/orders/:id` | `server.js:5107` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |

---

### L. Poin Loyalitas & Hadiah

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 100 | `GET /api/points/my` | `server.js:5135` | Yes | User | N/A | Aman (Parameterized `?`) | Aman (`WHERE user_id = req.user.id`) |
| 101 | `GET /api/points/my/history` | `server.js:5144` | Yes | User | N/A | Aman (Parameterized `?`) | Aman (`WHERE user_id = req.user.id`) |
| 102 | `GET /api/points/rewards` | `server.js:5153` | No | Public | N/A | Aman (Parameterized `?`) | Aman (Publik) |
| 103 | `POST /api/points/redeem` | `server.js:5162` | Yes | User | Type check reward ID, cek balance | Aman (Parameterized `?`) | Aman (`WHERE user_id = req.user.id`) |
| 104 | `GET /api/admin/points/users` | `server.js:5189` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 105 | `GET /api/admin/points/history` | `server.js:5203` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 106 | `GET /api/admin/points/rewards` | `server.js:5217` | Yes | admin | N/A | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 107 | `POST /api/admin/points/rewards` | `server.js:5226` | Yes | admin | Type check points_required | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 108 | `PUT /api/admin/points/rewards/:id` | `server.js:5242` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 109 | `DELETE /api/admin/points/rewards/:id` | `server.js:5259` | Yes | admin | Type check ID | Aman (Parameterized `?`) | Aman (Khusus admin) |
| 110 | `POST /api/admin/points/adjust` | `server.js:5269` | Yes | admin | Type check numeric points | Aman (Parameterized `?`) | Aman (Khusus admin) |

---

### M. Integrasi WhatsApp & AI Chatbot

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 111 | `GET /api/whatsapp/webhook` | `server.js:5296` | No | Public | N/A | N/A | Aman (Verifikasi endpoint kosong) |
| 112 | `POST /api/whatsapp/webhook` | `server.js:5299` | No | Public | **TIDAK ADA SIGNATURE / TOKEN** | Aman (Parameterized `?`) | **[TERBUKTI AKSES DATA LAIN]**: Penyerang memalsukan nomor/pesan yang memicu AI membaca data order |
| 113 | `POST /api/chat` | `server.js:5307` | No | Public | Rate limit in-memory, string slice | Aman (Parameterized `?`) | **[TERBUKTI AKSES DATA LAIN]**: Siapa pun dapat menanyakan `#<order_id>` dan AI membocorkan nama & nominal |
| 114 | `GET /api/admin/settings/whatsapp` | `server.js:5348` | Yes | admin, manager | N/A | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 115 | `PUT /api/admin/settings/whatsapp` | `server.js:5358` | Yes | admin, manager | Type check boolean/string | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |
| 116 | `GET /api/admin/whatsapp/sessions` | `server.js:5394` | Yes | admin, manager | N/A | Aman (Parameterized `?`) | Aman (Khusus admin/manager) |

---

### N. Backup & Restore Database

| No | Method & Route | File:Baris | Auth? | Role Check | Validasi Input | Query SQL | Akses Data User Lain (IDOR) |
|---|---|---|---|---|---|---|---|
| 117 | `GET /api/admin/backup` | `server.js:5403` | Yes | admin | N/A | N/A | Aman (Khusus admin) |
| 118 | `POST /api/admin/backup/restore` | `server.js:5415` | Yes | admin | Multer zip extension filter | N/A | Aman (Khusus admin) |

---

## 2. Catatan Khusus Terkait Perakitan Query SQL (Template Literals)

Pemeriksaan menunjukkan terdapat 5 lokasi di mana query SQL dirakit menggunakan template literal (backticks `` ` ``):
1. **L4258-4260**: `IN (${placeholders})` di mana `placeholders` dirakit dari `productIds.map(() => "?").join(",")`. Nilai parameter tetap di-*bind* menggunakan array parameter `productIds`. **Status: AMAN**.
2. **L4673, L4685, L4731, L5010, L5032**: Menggunakan `${ORDER_SELECT_FIELDS}` di mana konstanta ini merupakan daftar kolom statis internal yang didefinisikan oleh developer (`orders.id, orders.user_id, ...`). Tidak ada input user yang diinterpolasikan ke string SQL. **Status: AMAN**.
3. **L4692**: `IN (${placeholders})` pada order items query menggunakan binding `?`. **Status: AMAN**.

**Kesimpulan SQL Injection**: Seluruh query SQL ke SQLite di [server.js](file:///d:/Projects/marketplace%20new/server.js) telah menggunakan parameter binding (`?`) dan terproteksi dari serangan SQL Injection langsung.

---

## 3. Daftar File / Bagian yang BELUM Dibaca

Dalam penyusunan dokumen ini, area berikut **belum diuji/dibaca**:
1. File biner [PT Sahabat Jaya Sukses.pdf](file:///d:/Projects/marketplace%20new/PT%20Sahabat%20Jaya%20Sukses.pdf) (13,9 MB).
2. Kode internal pustaka eksternal pihak ketiga di CDN (`https://accounts.google.com/gsi/client` dan `html2pdf.js`).
