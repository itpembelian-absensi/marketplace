# Audit Dependensi (Dependencies & npm audit) — PasarKita / PT Sahabat Jaya Sukses

Dokumen ini membedah hasil audit dependensi pihak ketiga menggunakan `npm audit` dan penelusuran pohon dependensi di [package-lock.json](file:///d:/Projects/marketplace%20new/package-lock.json).
Setiap paket dievaluasi apakah aktif dipanggil saat **runtime produksi** atau hanya berperan saat kompilasi / instalasi.

---

## 1. Ringkasan Eksekutif Kerentanan `npm audit`

Hasil pemindaian dependensi melaporkan **7 kerentanan**:
- 🔴 **1 Critical**
- 🟠 **4 High**
- 🟡 **1 Moderate**
- 🔵 **1 Low**

---

## 2. Rincian Paket Rentan & Analisis Runtime

### DEP-01: `tar` (Critical Severity)
* **Status Bukti**: `[TERBUKTI]`
* **Versi Terpasang**: `7.5.13`
* **Advisory**: [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh), [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp)
* **Pohon Dependensi**:
  ```text
  node_modules/tar (v7.5.13)
  ├── node_modules/sqlite3 (v6.0.1) -> node-gyp -> tar
  └── node_modules/node-gyp (v7.5.4) -> tar
  ```
* **Dipakai Saat Runtime?**: ❌ **TIDAK (Hanya Build-Time / Install-Time)**
* **Analisis Dampak Nyata**:
  Paket `tar` ditarik oleh `node-gyp` untuk mengompilasi driver C++ native `sqlite3`. Pada saat container Docker dibangun (`npm rebuild sqlite3 --build-from-source`), `tar` dijalankan untuk mengekstrak header kompilasi. Setelah aplikasi berjalan melayani request HTTP di Node.js, aplikasi menggunakan `unzipper` dan `archiver` untuk backup ZIP, dan **tidak pernah memproses arsip `.tar` pengguna**. Risiko eksploitasi di runtime produksi tergolong minimal.
* **Rekomendasi**: Jalankan pembaruan `sqlite3` atau biarkan `npm audit fix` memperbarui sub-dependensi `tar`.

---

### DEP-02: `multer` (High Severity)
* **Status Bukti**: `[TERBUKTI]`
* **Versi Terpasang**: `2.1.1` (Direct Dependency di `package.json`)
* **Advisory**: [GHSA-72gw-mp4g-v24j](https://github.com/advisories/GHSA-72gw-mp4g-v24j), [GHSA-3p4h-7m6x-2hcm](https://github.com/advisories/GHSA-3p4h-7m6x-2hcm), [GHSA-wc9g-mqfw-jrwm](https://github.com/advisories/GHSA-wc9g-mqfw-jrwm)
* **Pohon Dependensi**:
  ```text
  web-sjs@1.0.0 (ROOT) -> multer@^2.1.1
  ```
* **Dipakai Saat Runtime?**:  **YA, SANGAT AKTIF (RUNTIME PRODUKSI)**
* **Analisis Dampak Nyata**:
  Multer digunakan pada 7 endpoint aktif: upload logo ([server.js:380](file:///d:/Projects/marketplace%20new/server.js#L380)), upload gambar produk ([server.js:399](file:///d:/Projects/marketplace%20new/server.js#L399)), upload banner ([server.js:418](file:///d:/Projects/marketplace%20new/server.js#L418)), upload profil ([server.js:437](file:///d:/Projects/marketplace%20new/server.js#L437)), upload QRIS ([server.js:456](file:///d:/Projects/marketplace%20new/server.js#L456)), form layanan ([server.js:487](file:///d:/Projects/marketplace%20new/server.js#L487)), bukti bayar ([server.js:522](file:///d:/Projects/marketplace%20new/server.js#L522)), dan restore backup ([server.js:554](file:///d:/Projects/marketplace%20new/server.js#L554)).
  Advisory GHSA-72gw-mp4g-v24j memungkinkan penyerang mengirim request multipart dengan field name bersarang (*deeply nested*) atau array index besar yang menyebabkan Node.js mengalami CPU Denial of Service.
* **Rekomendasi**: Perbarui `multer` ke versi `>=2.2.1` yang telah menambal celah pemrosesan field name multipart.

---

### DEP-03: `sharp` (High Severity)
* **Status Bukti**: `[TERBUKTI]`
* **Versi Terpasang**: `0.34.5` (Direct Dependency di `package.json: "sharp": "^0.34.3"`)
* **Advisory**: [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) (CVE-2026-33327, CVE-2026-33328 libvips), [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) (libheif)
* **Pohon Dependensi**:
  ```text
  web-sjs@1.0.0 (ROOT) -> sharp@^0.34.3
  ```
* **Dipakai Saat Runtime?**:  **YA, SANGAT AKTIF (RUNTIME PRODUKSI)**
* **Analisis Dampak Nyata**:
  `sharp` dipanggil di [lib/media.js:66](file:///d:/Projects/marketplace%20new/lib/media.js#L66) untuk merotasi, mengubah ukuran (*resize*), dan mengompres setiap gambar upload admin menjadi format `.webp`. Kerentanan berasal dari libvips bawaan (C library) yang dapat mengalami crash buffer overflow jika memproses file gambar heif/vips korup yang diunggah.
* **Rekomendasi**: Perbarui ke `sharp@0.35.5`. Perhatikan bahwa lompatan versi ini membutuhkan uji coba build pada image Docker `node:22-bookworm-slim` untuk memastikan pustaka libvips sistem kompatibel.

---

### DEP-04: `undici` (High Severity)
* **Status Bukti**: `[TERBUKTI]`
* **Versi Terpasang**: `6.25.0`
* **Advisory**: [GHSA-p88m-4jfj-68fv](https://github.com/advisories/GHSA-p88m-4jfj-68fv) (HTTP header injection), [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) (CRLF injection)
* **Pohon Dependensi**:
  ```text
  node_modules/undici (v6.25.0)
  └── node_modules/node-gyp (v6.25.0)
  ```
* **Dipakai Saat Runtime?**: ⚠️ **PARSIAL (Node 22 Global Fetch)**
* **Analisis Dampak Nyata**:
  Meskipun di `package-lock.json` `undici` terdaftar di bawah `node-gyp`, Node.js versi 22 secara internal mengimplementasikan `fetch()` global menggunakan engine `undici`. Aplikasi memanggil `fetch()` di [lib/whatsapp-bot.js:133](file:///d:/Projects/marketplace%20new/lib/whatsapp-bot.js#L133) (Fonnte API), [lib/shipping.js:112](file:///d:/Projects/marketplace%20new/lib/shipping.js#L112) (Nominatim), dan [lib/shipping.js:268](file:///d:/Projects/marketplace%20new/lib/shipping.js#L268) (Lalamove). Namun, karena URL tujuan di-hardcode ke endpoint HTTPS resmi dan header tidak mengambil input luar yang tidak terfilter, risiko eksploitasi CRLF injection tergolong rendah.
* **Rekomendasi**: Jalankan pembaruan patch versi Node.js dan update dependensi.

---

### DEP-05: `body-parser` (Low) & `qs` (Moderate Severity)
* **Status Bukti**: `[TERBUKTI]`
* **Versi Terpasang**: `body-parser@2.2.2`, `qs@6.15.1`
* **Advisory**: [GHSA-v422-hmwv-36x6](https://github.com/advisories/GHSA-v422-hmwv-36x6) (`body-parser`), [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) (`qs`)
* **Pohon Dependensi**:
  ```text
  express@5.2.1 -> body-parser@2.2.2 -> qs@6.15.1
  ```
* **Dipakai Saat Runtime?**:  **YA (RUNTIME PRODUKSI)**
* **Analisis Dampak Nyata**:
  Keduanya adalah komponen inti dari framework Express v5 untuk parsing JSON body dan query string URL. Kerentanan `qs` terkait DoS melalui objek buffer yang dikendalikan penyerang pada query array kompleks.
* **Rekomendasi**: Perbarui Express dan sub-dependensinya dengan menjalankan `npm update express qs`.

---

### DEP-06: `brace-expansion` (High Severity)
* **Status Bukti**: `[TERBUKTI]`
* **Versi Terpasang**: `2.1.4`
* **Advisory**: [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7)
* **Pohon Dependensi**:
  ```text
  archiver@7.0.1 -> archiver-utils -> glob -> minimatch -> brace-expansion@2.1.4
  ```
* **Dipakai Saat Runtime?**:  **YA (FITUR BACKUP ADMIN)**
* **Analisis Dampak Nyata**:
  Digunakan saat pembuatan file arsip ZIP di [lib/backup.js:105](file:///d:/Projects/marketplace%20new/lib/backup.js#L105) (`archive.directory(abs, folder)`). Pola ekspansi kurung (`{a,b}`) yang diproses berasal dari folder internal server yang tetap, bukan dari string input pengguna luar. Risiko eksploitasi DoS eksternal tergolong rendah.
* **Rekomendasi**: Update otomatis melalui `npm update archiver`.

---

## 3. Matriks Prioritas Update Dependensi

| Paket | Tingkat Bahaya | Paparan Runtime | Rekomendasi Tindakan |
|---|---|---|---|
| **`multer`** | High |  **Tinggi (7 Endpoint Upload Publik/Admin)** | **Wajib diupdate ke `>=2.2.1` sebelum launch** |
| **`sharp`** | High |  **Sedang (Pemrosesan Gambar Admin)** | Update ke versi stabil terbaru `0.35.x` |
| **`express` / `qs`** | Moderate |  **Tinggi (Seluruh HTTP Request)** | Jalankan `npm update` untuk patch minor |
| **`tar`** | Critical | ❌ Rendah (Hanya saat `npm build`) | Update rutin via `npm update` |
| **`undici`** | High | ⚠️ Rendah (Tergantung runtime Node.js) | Gunakan versi LTS Node 22 terbaru |
| **`brace-expansion`** | High | ❌ Rendah (Hanya pattern folder backup) | Update rutin via `npm update` |

---

## 4. Daftar File / Bagian yang BELUM Dibaca

1. File biner [PT Sahabat Jaya Sukses.pdf](file:///d:/Projects/marketplace%20new/PT%20Sahabat%20Jaya%20Sukses.pdf) (13,9 MB).
2. Direktori `node_modules/` lokal host (dependensi dikelola di dalam kontainer Docker).
