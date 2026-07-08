# PasarKita Marketplace

Website marketplace fullstack sederhana dengan:

- halaman produk + pencarian/filter/sorting
- halaman detail produk
- login/register
- keranjang belanja tersimpan di localStorage
- backend API Express + database SQLite

## Menjalankan project

### Cara termudah (Windows, klik langsung)

1. Install dependency sekali: `npm install`
2. **Double-click** file `buka-aplikasi.bat` di folder project
3. Browser akan terbuka otomatis — tidak perlu copy alamat

### Cara manual

1. Install dependency:

   npm install

2. Jalankan server:

   npm start

3. Buka di browser (port sesuai file `.env`, default project ini `5057`):

   http://localhost:5057

## Konfigurasi Port via .env

Project ini sudah mendukung file `.env`.

1. Salin dari contoh:

   copy .env.example .env

2. Ubah port sesuai kebutuhan:

   PORT=5000

3. Jalankan ulang server:

   npm start

4. Buka:

   http://localhost:5000

## Endpoint API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (butuh Bearer token)
- `GET /api/users` (role: admin/manager)
- `POST /api/users` (role: admin/manager; manager hanya boleh buat role user)
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/checkout` (butuh Bearer token)

## Catatan

Database tersimpan di `data/marketplace.db` dan akan otomatis membuat data produk awal saat pertama kali dijalankan.

## Deploy dengan Docker (Linux Mint 22)

### Prasyarat

- Docker Engine + plugin `docker compose` (v2)
- User ada di grup `docker`

Cek server:

```bash
chmod +x scripts/*.sh
./scripts/server-check.sh
```

### Setup pertama di server

```bash
git clone <repo-url> /srv/docker/marketplace
cd /srv/docker/marketplace

cp .env.production.example .env.production
nano .env.production   # JWT_SECRET, password admin, API keys

./scripts/deploy.sh
```

Aplikasi tersedia di `http://<server>:5057` (port bisa diubah lewat `APP_PORT`).

### Update (satu perintah)

```bash
cd /srv/docker/marketplace
./scripts/deploy.sh
```

Script otomatis handle:
- reset git (tanpa konflik pull)
- hapus `node_modules` host
- build Docker (npm ci di dalam image)
- restart + health check + tampilkan log kalau crash

Build cepat (pakai cache): `FORCE_REBUILD=0 ./scripts/deploy.sh`

Data persisten ada di folder `storage/` (database SQLite + upload gambar).

Perintah Docker lain:

```bash
./scripts/dc.sh logs -f app
./scripts/dc.sh ps
./scripts/dc.sh down
```

## Role (Admin / Manager / User)

- **User**: bisa belanja & checkout
- **Manager**: bisa lihat list user dan buat user (hanya role `user`)
- **Admin**: bisa lihat list user dan buat user (role `admin/manager/user`)

### Membuat akun admin pertama (seed)

Isi `.env` dengan:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME` (opsional)

Lalu jalankan `npm start`. Kalau email tersebut belum ada di DB, sistem akan otomatis membuat akun admin.
