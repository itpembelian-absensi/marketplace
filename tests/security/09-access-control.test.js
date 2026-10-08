const assert = require("assert");
const { api, login, register } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 09] Kontrol Akses & Role-Based Access Control (RBAC) ---");

  // 1. Buat user biasa (role: user)
  const normalEmail = `normal-user-${Date.now()}@test.com`;
  const regRes = await register({ name: "User Biasa", email: normalEmail, password: "password123" });
  assert.strictEqual(regRes.status, 201, "Gagal registrasi user biasa");
  const normalAuth = await login(normalEmail, "password123");
  const normalHeader = { Authorization: `Bearer ${normalAuth.token}` };

  // Daftar rute admin yang wajib dilindungi
  const adminEndpoints = [
    { method: "GET", path: "/api/users" },
    { method: "PUT", path: "/api/admin/orders/1/status", body: { status: "paid" } },
    { method: "POST", path: "/api/admin/products", body: { name: "Produk Palsu", price: 1000 } },
    { method: "GET", path: "/api/admin/points/users" },
  ];

  // 2. Uji akses user biasa ke rute admin (Harus ditolak dengan HTTP 403 Forbidden)
  for (const ep of adminEndpoints) {
    const res = await api(ep.path, {
      method: ep.method,
      headers: normalHeader,
      body: ep.body,
    });
    assert.strictEqual(
      res.status,
      403,
      `VULNERABILITY DETECTED: User biasa dapat mengakses ${ep.method} ${ep.path} (status: ${res.status})!`
    );
  }
  console.log("  [PASS] Seluruh rute admin menolak user biasa dengan HTTP 403 Forbidden.");

  // 3. Uji akses tanpa token (Unauthenticated - Harus ditolak dengan HTTP 401 Unauthorized)
  const unauthRes = await api("/api/users", { method: "GET" });
  assert.strictEqual(unauthRes.status, 401, "Akses tanpa token harus mengembalikan HTTP 401");

  const unauthOrders = await api("/api/orders/my", { method: "GET" });
  assert.strictEqual(unauthOrders.status, 401, "Akses pesanan saya tanpa token harus mengembalikan HTTP 401");

  console.log("  [PASS] Akses anonim tanpa token ditolak dengan HTTP 401 Unauthorized.");
}

module.exports = { runTest };
