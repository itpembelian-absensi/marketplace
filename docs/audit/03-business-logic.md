# Audit Logika Bisnis & Transaksi — PasarKita / PT Sahabat Jaya Sukses

Dokumen ini menganalisis logika e-commerce, kalkulasi harga, alokasi stok, perhitungan ongkir dan pajak, alur status pesanan, reward loyalty points, serta kerentanan *race condition* pada transaksi.

---

## 1. Alur Checkout: Server-Side vs Client-Side Calculation

### BIZ-01: Verifikasi Validasi Harga Produk & Diskon
* **Status**: `[TERBUKTI AMAN (DIHITUNG DI SERVER)]`
* **File & Baris**: [server.js:4258-4313](file:///d:/Projects/marketplace%20new/server.js#L4258-L4313)
* **Bukti Kode**:
  ```javascript
  // server.js:4258-4263
  const placeholders = productIds.map(() => "?").join(",");
  const rows = await allQuery(
    `SELECT id, name, price, discount, stock, stock_sjs, stock_sjl, sizes, points_per_purchase FROM products WHERE id IN (${placeholders})`,
    productIds
  );
  const foundMap = new Map(rows.map((r) => [r.id, r]));
  ...
  // server.js:4300-4302
  const finalPrice = calculateFinalPrice(basePrice, row.discount);
  const subtotal = finalPrice * group.qty;
  total += subtotal;
  ```
* **Analisis**:
  Client hanya mengirimkan `id`, `size`, dan `qty` item keranjang. Server mengambil langsung harga satuan (`price`), persentase diskon (`discount`), serta harga per varian ukuran dari database SQLite. Klien **tidak dapat** memanipulasi subtotal harga barang.

---

### BIZ-02: Verifikasi Validasi Ongkir (Shipping Fee)
* **Status**: `[TERBUKTI AMAN (DIHITUNG & DIVALIDASI DI SERVER)]`
* **File & Baris**: [server.js:4321-4344](file:///d:/Projects/marketplace%20new/server.js#L4321-L4344)
* **Bukti Kode**:
  ```javascript
  // server.js:4321-4344
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
  ```
* **Analisis**:
  Server tidak mempercayai angka ongkir yang dikirim klien. Server menghitung ulang tarif ongkir resmi berdasarkan koordinat GPS/alamat dan pengaturan tarif toko (`calculateShippingQuote`). Jika `shippingFee` yang dikirim klien berbeda 1 Rupiah saja dengan perhitungan server, request checkout ditolak dengan HTTP 400.

---

### BIZ-03: Perhitungan Pajak (PPN)
* **Status**: `[TERBUKTI AMAN (DIHITUNG DI SERVER)]`
* **File & Baris**: [server.js:4346-4347](file:///d:/Projects/marketplace%20new/server.js#L4346-L4347) dan [lib/tax.js:10-29](file:///d:/Projects/marketplace%20new/lib/tax.js#L10-L29)
* **Bukti Kode**:
  ```javascript
  // server.js:4346-4347
  const tax = computeTax(productsSubtotal, await getTaxSettingsFromDb());
  const grandTotal = productsSubtotal + shippingQuote.fee + tax.addedToTotal;

  // lib/tax.js:22-28
  if (mode === "exclude") {
    const amount = Math.round(subtotal * (percent / 100));
    return { mode, percent, amount, addedToTotal: amount, dpp: subtotal };
  }
  const dpp = Math.round(subtotal / (1 + percent / 100));
  const amount = Math.max(0, subtotal - dpp);
  return { mode, percent, amount, addedToTotal: 0, dpp };
  ```
* **Analisis**:
  Logika pajak menangani mode `none`, `exclude` (menambahkan nilai PPN ke total bayar), dan `include` (harga produk sudah termasuk PPN sehingga tidak menambah total bayar). Parameter pajak dibaca langsung dari tabel `app_settings` di database, bukan dari request body klien.

---

## 2. Poin Loyalitas & Celah Eksploitasi Hadiah

### BIZ-04: Pemberian Poin Sebelum Pembayaran Terkonfirmasi (Reward Exploit)
* **Tingkat Risiko**: 🔴 **CRITICAL (LOGIKA BISNIS)**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:4408-4425](file:///d:/Projects/marketplace%20new/server.js#L4408-L4425)
* **Bukti Kode**:
  ```javascript
  // server.js:4416-4425 (Di dalam transaksi checkout saat status masih 'unpaid')
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
  ```
* **Mekanisme & Skenario Eksploitasi**:
  Poin ditambahkan ke saldo pengguna **seketika saat pesanan dibuat** dengan status `unpaid` (belum dibayar sama sekali).
  **Skenario Penipuan**:
  1. Pelanggan nakal membuat pesanan dengan nilai sangat besar yang menghasilkan 10.000 poin.
  2. Saldo poin pengguna langsung bertambah menjadi 10.000 poin.
  3. Pelanggan langsung memanggil endpoint `POST /api/points/redeem` untuk mengklaim hadiah/voucher senilai 10.000 poin. Saldo poin menjadi 0.
  4. Pelanggan tidak pernah membayar pesanan awal.
  5. 24 jam kemudian, pesanan dibatalkan otomatis oleh sistem (*payment timeout*).
  6. Fungsi `reverseOrderEffects()` ([server.js:877](file:///d:/Projects/marketplace%20new/server.js#L877)) memotong poin kembali:
     `UPDATE user_points SET total_points = MAX(0, total_points - 10000) WHERE user_id = ?`
  7. Karena saldo sudah 0, saldo tetap 0 (tidak bisa minus).
  8. Pelanggan berhasil mendapatkan hadiah gratis tanpa mengeluarkan uang sepeser pun.
* **Perbaikan**:
  Poin **HANYA BOLEH DIBERIKAN** ketika pesanan berubah status menjadi `paid` (lunas), yaitu saat admin/sistem payment gateway memverifikasi pembayaran di endpoint `PUT /api/admin/orders/:id/status`.

---

### BIZ-05: Double-Spending Race Condition pada Klaim Hadiah Poin
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:5170-5181](file:///d:/Projects/marketplace%20new/server.js#L5170-L5181)
* **Bukti Kode**:
  ```javascript
  // server.js:5170-5181
  const userPointsRow = await getQuery("SELECT total_points FROM user_points WHERE user_id = ?", [req.user.id]);
  const currentPoints = userPointsRow ? userPointsRow.total_points : 0;

  if (currentPoints < reward.points_required) {
    return res.status(400).json({ message: `Poin tidak mencukupi. Butuh ${reward.points_required} poin.` });
  }

  await runQuery("UPDATE user_points SET total_points = total_points - ? WHERE user_id = ?", [reward.points_required, req.user.id]);
  ```
* **Mekanisme & Skenario Eksploitasi**:
  Operasi pengecekan saldo dan pemotongan poin dilakukan dalam query terpisah tanpa transaksi database (`withTransaction`).
  Jika seorang pengguna memiliki 500 poin dan mengirimkan dua permintaan bersamaan (*concurrent HTTP requests*) untuk mengklaim reward seharga 500 poin:
  - Request 1 membaca saldo: 500 (lolos validasi).
  - Request 2 membaca saldo: 500 (lolos validasi).
  - Request 1 memotong 500 poin.
  - Request 2 memotong 500 poin lagi (saldo menjadi -500).
  - Pengguna mendapatkan dua hadiah sekaligus meskipun saldo poin hanya cukup untuk satu hadiah.
* **Perbaikan**:
  Jalankan pemotongan secara atomik dengan syarat saldo mencukupi:
  ```javascript
  const updateResult = await runQuery(
    "UPDATE user_points SET total_points = total_points - ? WHERE user_id = ? AND total_points >= ?",
    [reward.points_required, req.user.id, reward.points_required]
  );
  if (!updateResult.changes) {
    return res.status(400).json({ message: "Poin tidak mencukupi." });
  }
  ```

---

## 3. Manajemen Stok, Multi-Gudang, & Race Condition Overselling

### BIZ-06: Race Condition Penjualan Berlebih (Overselling Bug)
* **Tingkat Risiko**: 🟠 **HIGH**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:4286-4298](file:///d:/Projects/marketplace%20new/server.js#L4286-L4298), [server.js:4321-4335](file:///d:/Projects/marketplace%20new/server.js#L4321-L4335), dan [server.js:758-779](file:///d:/Projects/marketplace%20new/server.js#L758-L779)
* **Bukti Kode**:
  ```javascript
  // 1. Pengecekan stok dilakukan di L4286-4298 (SEBELUM TRANSAKSI)
  if ((row.stock || 0) < group.qty) {
    res.status(400).json({ message: `Stok produk "${row.name}" tidak mencukupi...` });
    return;
  }

  // 2. Operasi I/O lambat (Network call quote Lalamove/GoSend) di L4321-4335
  shippingQuote = await calculateShippingQuote(...); // Butuh 500ms - 2000ms

  // 3. Masuk transaksi database di L4362 & L4399
  const checkoutResult = await withTransaction(async () => {
    ...
    await applyStockDeduction(item.productId, productRow, item.qty, item.size || "");
  });

  // 4. Di dalam applyStockDeduction -> deductFromStockPools L758-779:
  function deductFromStockPools(stockSjs, stockSjl, qty) {
    ...
    deductSjl = Math.min(availableSjl, remaining);
    return {
      stockSjs: Math.max(0, availableSjs - deductSjs),
      stockSjl: Math.max(0, availableSjl - deductSjl),
    };
  }
  ```
* **Mekanisme & Dampak**:
  1. Validasi kecukupan stok terjadi di luar transaksi database.
  2. Antara pengecekan stok dan eksekusi pemotongan stok, terdapat *network call* ke layanan pihak ketiga (`calculateShippingQuote`) yang memakan waktu ratusan milidetik.
  3. Ketika masuk ke dalam `withTransaction`, fungsi `applyStockDeduction` **tidak memeriksa ulang apakah stok masih mencukupi** dan **tidak pernah melempar Error** jika sisa stok kurang dari `qty`. Fungsi `deductFromStockPools` hanya membatasi `Math.max(0, ...)`.
  4. **Akibat**: Jika stok barang tersisa 1 buah, dan ada 2 pelanggan melakukan checkout secara bersamaan (misal saat flash sale), kedua checkout akan sukses dan stok menjadi 0 untuk keduanya. Toko mengalami kondisi **Overselling** (menjual 2 barang padahal stok fisik hanya 1).
* **Perbaikan**:
  Validasi ketersediaan stok wajib diulang di dalam `withTransaction` atau di dalam fungsi `applyStockDeduction`:
  ```javascript
  if (availableSjs + availableSjl < qty) {
    throw new Error(`Stok produk "${productRow.name}" tidak mencukupi saat finalisasi pesanan.`);
  }
  ```

---

### BIZ-07: Penyimpanan Varian Ukuran sebagai JSON String di Kolom Tabel
* **Tingkat Risiko**: 🟡 **MEDIUM (CODE HEALTH & CONCURRENCY)**
* **Status Bukti**: `[TERBUKTI]`
* **File & Baris**: [server.js:798-801](file:///d:/Projects/marketplace%20new/server.js#L798-L801)
* **Bukti Kode**:
  ```javascript
  // server.js:798-801
  await runQuery(
    `UPDATE products SET sizes = ?, stock = ?, stock_sjs = ?, stock_sjl = ? WHERE id = ?`,
    [JSON.stringify(parsedSizes), totals.stock, totals.stockSjs, totals.stockSjl, productId]
  );
  ```
* **Analisis**:
  Stok varian ukuran (`sizes`) tidak disimpan dalam tabel terpisah (seperti tabel `product_variants`), melainkan sebagai satu string JSON panjang di kolom `products.sizes`. Setiap pemotongan stok varian mengharuskan server membaca JSON, mem-parse, memodifikasi nilai integer di memori JavaScript, lalu me-rewrite seluruh JSON ke baris produk. Pola ini rentan bentrok jika ada transaksi paralel pada produk yang sama dengan varian ukuran berbeda.

---

## 4. Alur Status Pesanan, Pembatalan (Void), & Batas Waktu Bayar

### BIZ-08: Siklus Hidup Status Pesanan
* **Status**: `[TERBUKTI]`
* **File & Baris**: [server.js:4926-4957](file:///d:/Projects/marketplace%20new/server.js#L4926-L4957) (`status`), [server.js:5075-5105](file:///d:/Projects/marketplace%20new/server.js#L5075-L5105) (`void`), [server.js:5107-5130](file:///d:/Projects/marketplace%20new/server.js#L5107-L5130) (`delete`)
* **Alur Status**:
  ```text
  [Checkout] ───────> status: "unpaid"
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      (Admin bayar)               (Timeout / Void)
     status: "paid"               status: "void"
                                  (Stok dikembalikan via reverseOrderEffects)
  ```
* **Pencegahan Redundan Saat Void / Hapus**:
  Fungsi `reverseOrderEffects` ([server.js:845](file:///d:/Projects/marketplace%20new/server.js#L845)) memiliki penjaga:
  `if (!order || String(order.status).toLowerCase() === "void") return;`
  Jika admin mengklik tombol void atau menghapus order yang statusnya sudah `void`, stok tidak akan dikembalikan dua kali. Mutasi tercatat rapi di tabel `inventory_ledger` dengan tipe `"IN"`.

---

### BIZ-09: Mekanisme Pembatalan Otomatis (Payment-Timeout)
* **Status**: `[TERBUKTI]`
* **File & Baris**: [server.js:2913-2946](file:///d:/Projects/marketplace%20new/server.js#L2913-L2946) dan [lib/payment-timeout.js:10-27](file:///d:/Projects/marketplace%20new/lib/payment-timeout.js#L10-L27)
* **Bukti Kode**:
  ```javascript
  // server.js:2922-2935
  for (const order of orders) {
    if (!shouldAutoCancelPayment(order, settings)) continue;
    try {
      await withTransaction(async () => {
        const fresh = await getQuery("SELECT * FROM orders WHERE id = ?", [order.id]);
        if (!shouldAutoCancelPayment(fresh, settings)) return;
        await reverseOrderEffects(fresh, { reason: "timeout" });
        await runQuery("UPDATE orders SET status = ?, void_reason = ?, shipment_status = ? WHERE id = ?", [
          "void",
          "timeout",
          "cancelled",
          order.id,
        ]);
      });
    }
  ```
* **Analisis**:
  - Dijalankan via `setInterval` setiap 60 detik ([server.js:5536](file:///d:/Projects/marketplace%20new/server.js#L5536)) dan dieksekusi secara reaktif setiap kali pengguna memuat riwayat pesanan ([server.js:4683](file:///d:/Projects/marketplace%20new/server.js#L4683)).
  - Mengabaikan metode COD: `payment_method !== 'cod'` tidak pernah di-cancel otomatis.
  - Menggunakan flag `paymentExpireRunning` untuk mencegah bentrok dua thread interval yang berjalan bersamaan.
  - Memverifikasi ulang baris `fresh` di dalam transaksi database sebelum membatalkan untuk mencegah pembatalan pesanan yang baru saja dilunasi.

---

## 5. Daftar File / Bagian yang BELUM Dibaca

1. File biner [PT Sahabat Jaya Sukses.pdf](file:///d:/Projects/marketplace%20new/PT%20Sahabat%20Jaya%20Sukses.pdf) (13,9 MB).
2. Kode pustaka eksternal pihak ketiga di browser (Google One-Tap auth dan generator PDF).
