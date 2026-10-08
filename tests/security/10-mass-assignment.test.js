const assert = require("assert");
const { api, login, register, queryGet } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 10] Pencegahan Mass Assignment & Eskalasi Privilege ---");

  // Siapkan produk untuk pengujian checkout
  const adminAuth = await login("admin@test.com", "adminpassword123");
  const prodRes = await api("/api/admin/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminAuth.token}` },
    body: {
      name: "Produk Mass Assignment Test",
      category: "Material",
      price: 20000,
      stock: 10,
      stock_sjs: 10,
      stock_sjl: 0,
      description: "Tes Mass Assignment",
      image: "/picture/products/test-mass.webp",
    },
  });
  assert.strictEqual(prodRes.status, 201, "Gagal membuat produk untuk pengujian");
  const productId = prodRes.data.id;

  // 1. Uji Registrasi dengan injeksi parameter 'role': 'admin'
  const email = `mass-assign-${Date.now()}@test.com`;
  const regRes = await register({
    name: "Hacker Role",
    email,
    password: "password123",
    role: "admin", // Upaya eskalasi privilege melalui registrasi publik
  });

  assert.strictEqual(regRes.status, 201, "Registrasi harus berhasil");

  // Cek langsung ke database apakah role tetap 'user'
  const userRow = await queryGet("SELECT role FROM users WHERE email = ?", [email]);
  assert.strictEqual(
    userRow.role,
    "user",
    `VULNERABILITY DETECTED: Mass assignment pada registrasi berhasil! User mendapat role "${userRow.role}"!`
  );
  console.log("  [PASS] Registrasi dengan injeksi role='admin' tetap menghasilkan role 'user'.");

  // 2. Uji Update Profil dengan injeksi 'role': 'admin'
  const auth = await login(email, "password123");
  const userHeader = { Authorization: `Bearer ${auth.token}` };

  const updateProfileRes = await api("/api/auth/profile", {
    method: "PUT",
    headers: userHeader,
    body: {
      name: "Hacker Renamed",
      role: "admin", // Upaya eskalasi privilege melalui profile update
    },
  });
  assert.strictEqual(updateProfileRes.status, 200, "Update profile harus berhasil");

  const updatedUserRow = await queryGet("SELECT role, name FROM users WHERE email = ?", [email]);
  assert.strictEqual(
    updatedUserRow.role,
    "user",
    `VULNERABILITY DETECTED: Mass assignment pada update profil berhasil! Role berubah menjadi "${updatedUserRow.role}"!`
  );
  console.log("  [PASS] Update profil dengan injeksi role='admin' diabaikan, role tetap 'user'.");

  // 3. Uji Pembuatan Pesanan dengan injeksi 'status': 'paid'
  const orderRes = await api("/api/checkout", {
    method: "POST",
    headers: userHeader,
    body: {
      items: [{ id: productId, qty: 1 }],
      customerName: "Hacker Order",
      customerPhone: "0812345678",
      customerAddress: "Jl. Test",
      paymentMethod: "transfer",
      shippingMethod: "pickup",
      shippingFee: 0,
      status: "paid", // Upaya memalsukan status pembayaran langsung saat order dibuat
    },
  });

  assert.strictEqual(orderRes.status, 200, "Pembuatan pesanan gagal");
  const orderId = orderRes.data.orderId;

  const orderRow = await queryGet("SELECT status FROM orders WHERE id = ?", [orderId]);
  assert.strictEqual(
    orderRow.status,
    "unpaid",
    `VULNERABILITY DETECTED: Mass assignment order status berhasil! Status pesanan langsung menjadi "${orderRow.status}"!`
  );
  console.log("  [PASS] Pembuatan pesanan dengan injeksi status='paid' diabaikan, status tetap 'unpaid'.");
}

module.exports = { runTest };
