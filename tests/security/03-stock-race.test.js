const assert = require("assert");
const { api, login, register, queryGet, queryAll } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 03] Checkout Stok Paralel / Anti Overselling (BIZ-06) ---");
  // CATATAN ARSITEKTUR:
  // Pada SQLite (single process/file), write transaction menggunakan BEGIN IMMEDIATE TRANSACTION
  // sehingga transaksi dieksekusi secara serialized pada level DB engine. Jika 2 request paralel
  // masuk bersamaan, request kedua akan tertolak oleh lock DB ("cannot start a transaction within a transaction"
  // atau BUSY) sebelum sempat mengeksekusi logika pengurangan stok, atau menunggu antrean.
  // Oleh karena itu, pengujian ini memvalidasi integritas state akhir (stok tidak menjadi minus & tidak oversold).

  // 1. Admin membuat produk dengan sisa stok tepat 1 unit
  const adminAuth = await login("admin@test.com", "adminpassword123");
  const adminHeader = { Authorization: `Bearer ${adminAuth.token}` };

  const prodRes = await api("/api/admin/products", {
    method: "POST",
    headers: adminHeader,
    body: {
      name: "Barang Terakhir Langka",
      category: "Material",
      price: 50000,
      stock: 1,
      stock_sjs: 1,
      stock_sjl: 0,
      description: "Hanya sisa 1 unit",
      image: "/picture/products/test-rare.webp",
    },
  });
  assert.strictEqual(prodRes.status, 201, `Gagal membuat produk untuk tes stok: ${JSON.stringify(prodRes.data)}`);
  const productId = prodRes.data.id;

  // 2. Buat 2 user pembeli terpisah
  const user1Email = `stock-buyer1-${Date.now()}@test.com`;
  const user2Email = `stock-buyer2-${Date.now()}@test.com`;
  const r1 = await register({ name: "Buyer 1", email: user1Email, password: "password123" });
  const r2 = await register({ name: "Buyer 2", email: user2Email, password: "password123" });
  assert.strictEqual(r1.status, 201, "Gagal register buyer 1");
  assert.strictEqual(r2.status, 201, "Gagal register buyer 2");

  const auth1 = await login(user1Email, "password123");
  const auth2 = await login(user2Email, "password123");

  const checkoutPayload = {
    items: [{ id: productId, qty: 1 }],
    customerName: "Pembeli Kilat",
    customerPhone: "08111222333",
    customerAddress: "Jl. Lapangan No. 5",
    paymentMethod: "cod",
    shippingMethod: "pickup",
    shippingFee: 0,
  };

  // 3. Eksekusi checkout secara paralel
  const req1 = api("/api/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${auth1.token}` },
    body: checkoutPayload,
  });
  const req2 = api("/api/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${auth2.token}` },
    body: checkoutPayload,
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const statuses = [res1.status, res2.status];
  const successCount = statuses.filter((s) => s === 200).length;

  const productRow = await queryGet("SELECT stock, stock_sjs, stock_sjl FROM products WHERE id = ?", [productId]);
  const orderItems = await queryAll("SELECT * FROM order_items WHERE product_id = ?", [productId]);

  assert.strictEqual(
    successCount,
    1,
    `VULNERABILITY DETECTED: Overselling terjadi! Kedua request checkout paralel berhasil lolos (status: ${statuses.join(", ")}). Total order item terjual: ${orderItems.length}, padahal stok awal hanya 1!`
  );

  assert.strictEqual(productRow.stock, 0, "Stok sisa harus 0, tidak boleh minus");
  assert.strictEqual(orderItems.length, 1, "Hanya boleh ada 1 pesanan yang tercatat untuk stok 1 unit");

  console.log("  [PASS] Race condition overselling tertangani: 1 pesanan sukses, 1 pesanan gagal karena stok habis.");
}

module.exports = { runTest };
