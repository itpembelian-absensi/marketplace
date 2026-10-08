const assert = require("assert");
const { api, login, register, queryGet } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 07] Perlindungan Manipulasi Harga dari Client (Price Tampering) ---");

  // 1. Admin membuat produk dengan harga resmi Rp 150.000
  const adminAuth = await login("admin@test.com", "adminpassword123");
  const adminHeader = { Authorization: `Bearer ${adminAuth.token}` };

  const prodRes = await api("/api/admin/products", {
    method: "POST",
    headers: adminHeader,
    body: {
      name: "Semen Portland 50kg",
      category: "Material",
      price: 150000,
      stock: 20,
      stock_sjs: 20,
      stock_sjl: 0,
      description: "Harga resmi 150rb",
      image: "/picture/products/test-cement.webp",
    },
  });
  assert.strictEqual(prodRes.status, 201, `Gagal membuat produk untuk tes harga: ${JSON.stringify(prodRes.data)}`);
  const productId = prodRes.data.id;

  // 2. Pembeli mencoba checkout dengan manipulasi harga (Rp 500 per item)
  const buyerEmail = `tamper-buyer-${Date.now()}@test.com`;
  const regRes = await register({ name: "Buyer Tamper", email: buyerEmail, password: "password123" });
  assert.strictEqual(regRes.status, 201, "Gagal register buyer tamper");
  const buyerAuth = await login(buyerEmail, "password123");
  const buyerHeader = { Authorization: `Bearer ${buyerAuth.token}` };

  const tamperedOrderPayload = {
    items: [
      {
        id: productId,
        qty: 2,
        price: 500, // Dimanipulasi dari 150.000 menjadi 500
        final_price: 500,
        subtotal: 1000,
      },
    ],
    customerName: "Buyer Tamper",
    customerPhone: "081299998888",
    customerAddress: "Jl. Pengujian Harga",
    paymentMethod: "transfer",
    shippingMethod: "pickup",
    shippingFee: 0,
  };

  const checkoutRes = await api("/api/checkout", {
    method: "POST",
    headers: buyerHeader,
    body: tamperedOrderPayload,
  });

  assert.strictEqual(checkoutRes.status, 200, `Checkout gagal diproses: ${JSON.stringify(checkoutRes.data)}`);
  const orderId = checkoutRes.data.orderId;

  // 3. Verifikasi total tagihan di database
  const orderRow = await queryGet("SELECT products_subtotal, total FROM orders WHERE id = ?", [orderId]);

  // Subtotal produk harus 2 x 150.000 = 300.000, BUKAN 1.000
  assert.strictEqual(
    orderRow.products_subtotal,
    300000,
    `VULNERABILITY DETECTED: Manipulasi harga client diterima server! Subtotal dihitung Rp ${orderRow.products_subtotal}, padahal seharusnya Rp 300.000.`
  );

  console.log("  [PASS] Server mengabaikan harga manipulasi dari client dan menghitung harga valid dari database (Rp 300.000).");
}

module.exports = { runTest };
