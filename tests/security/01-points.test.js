const assert = require("assert");
const { api, login, register, queryGet } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 01] Poin Reward Lifecycle (BIZ-04) ---");

  // 1. Login sebagai Admin
  const adminAuth = await login("admin@test.com", "adminpassword123");
  const adminHeader = { Authorization: `Bearer ${adminAuth.token}` };

  // 2. Buat produk dengan reward poin 50
  const productRes = await api("/api/admin/products", {
    method: "POST",
    headers: adminHeader,
    body: {
      name: "Produk Poin Test",
      category: "Material",
      price: 25000,
      stock: 10,
      stock_sjs: 10,
      stock_sjl: 0,
      points_per_purchase: 50,
      description: "Test reward poin",
      image: "/picture/products/test-points.webp",
    },
  });
  assert.strictEqual(productRes.status, 201, `Gagal membuat produk test: ${JSON.stringify(productRes.data)}`);
  const productId = productRes.data.id;

  // 3. Daftarkan user pembeli baru
  const buyerEmail = `buyer-points-${Date.now()}@test.com`;
  const regRes = await register({
    name: "Buyer Poin",
    email: buyerEmail,
    password: "password123",
  });
  assert.strictEqual(regRes.status, 201, "Gagal mendaftarkan user pembeli");
  const buyerAuth = await login(buyerEmail, "password123");
  const buyerHeader = { Authorization: `Bearer ${buyerAuth.token}` };
  const buyerId = buyerAuth.user.id;

  // 4. Pembeli membuat pesanan (status awal: unpaid)
  const orderRes = await api("/api/checkout", {
    method: "POST",
    headers: buyerHeader,
    body: {
      items: [{ id: productId, qty: 1 }],
      customerName: "Buyer Poin",
      customerPhone: "081234567890",
      customerAddress: "Jl. Test No. 123",
      paymentMethod: "transfer",
      shippingMethod: "pickup",
      shippingFee: 0,
    },
  });
  assert.strictEqual(orderRes.status, 200, `Gagal membuat order: ${JSON.stringify(orderRes.data)}`);
  const orderId = orderRes.data.orderId;

  // 5. Verifikasi saldo poin saat pesanan MASIH 'unpaid'
  const pointsRowUnpaid = await queryGet("SELECT total_points FROM user_points WHERE user_id = ?", [buyerId]);
  const currentPointsUnpaid = pointsRowUnpaid ? pointsRowUnpaid.total_points : 0;

  // Harusnya 0 (belum dibayar). Bug lama di main memberikan 50 poin langsung saat checkout.
  assert.strictEqual(
    currentPointsUnpaid,
    0,
    `VULNERABILITY DETECTED: Poin sudah diberikan (${currentPointsUnpaid} poin) padahal pesanan masih 'unpaid'!`
  );
  console.log("  [PASS] Order status 'unpaid' tidak memberikan poin gratis.");

  // 6. Admin menandai pesanan menjadi 'paid'
  const markPaidRes = await api(`/api/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: adminHeader,
    body: { status: "paid" },
  });
  assert.strictEqual(markPaidRes.status, 200, "Gagal menandai order lunas");

  // 7. Verifikasi poin bertambah setelah 'paid'
  const pointsRowPaid = await queryGet("SELECT total_points FROM user_points WHERE user_id = ?", [buyerId]);
  const currentPointsPaid = pointsRowPaid ? pointsRowPaid.total_points : 0;
  assert.strictEqual(currentPointsPaid, 50, "Poin harus bernilai 50 setelah status menjadi paid");
  console.log("  [PASS] Order status 'paid' berhasil mengkreditkan 50 poin ke saldo pembeli.");

  // 8. Admin membatalkan kembali status pesanan dari 'paid' ke 'unpaid'
  const revertRes = await api(`/api/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: adminHeader,
    body: { status: "unpaid" },
  });
  assert.strictEqual(revertRes.status, 200, "Gagal membatalkan status lunas");

  // 9. Verifikasi poin ditarik kembali
  const pointsRowRevert = await queryGet("SELECT total_points FROM user_points WHERE user_id = ?", [buyerId]);
  const currentPointsRevert = pointsRowRevert ? pointsRowRevert.total_points : 0;
  assert.strictEqual(currentPointsRevert, 0, "Poin harus ditarik kembali menjadi 0 setelah status dikembalikan ke unpaid");
  console.log("  [PASS] Perubahan status 'paid' -> 'unpaid' berhasil menarik kembali poin.");
}

module.exports = { runTest };
