const assert = require("assert");
const path = require("path");
const { api, login, register, queryGet, PROJECT_ROOT } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 08] Pencegahan IDOR & Kebocoran Data Pribadi (SEC-15) ---");

  // 1. Admin membuat produk dasar untuk pengujian
  const adminAuth = await login("admin@test.com", "adminpassword123");
  const prodRes = await api("/api/admin/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminAuth.token}` },
    body: {
      name: "Barang Uji IDOR",
      category: "Material",
      price: 10000,
      stock: 5,
      stock_sjs: 5,
      stock_sjl: 0,
      description: "Tes IDOR",
      image: "/picture/products/test-idor.webp",
    },
  });
  assert.strictEqual(prodRes.status, 201, "Gagal membuat produk uji IDOR");
  const productId = prodRes.data.id;

  // 2. Buat User Korban (User A) dan User Penyerang (User B)
  const userAEmail = `victim-a-${Date.now()}@test.com`;
  const userBEmail = `attacker-b-${Date.now()}@test.com`;

  const rA = await register({ name: "Korban A Rahasia", email: userAEmail, password: "password123" });
  const rB = await register({ name: "Penyerang B", email: userBEmail, password: "password123" });
  assert.strictEqual(rA.status, 201, "Gagal register korban A");
  assert.strictEqual(rB.status, 201, "Gagal register penyerang B");

  const authA = await login(userAEmail, "password123");
  const authB = await login(userBEmail, "password123");

  // 3. User A membuat pesanan pribadi
  const orderRes = await api("/api/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${authA.token}` },
    body: {
      items: [{ id: productId, qty: 1 }],
      customerName: "Korban A Rahasia",
      customerPhone: "081987654321",
      customerAddress: "Alamat Rahasia Korban No. 77",
      paymentMethod: "cod",
      shippingMethod: "pickup",
      shippingFee: 0,
    },
  });
  assert.strictEqual(orderRes.status, 200, `Gagal membuat order untuk User A: ${JSON.stringify(orderRes.data)}`);
  const orderId = orderRes.data.orderId;

  // 4. User B mencoba mengakses data pesanan User A via API (/api/orders/:id)
  const idorRes = await api(`/api/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${authB.token}` },
  });

  // Hanya boleh diakses oleh pemiliknya (User A) atau admin. User B harus ditolak (HTTP 403)
  assert.strictEqual(
    idorRes.status,
    403,
    `VULNERABILITY DETECTED: IDOR pada /api/orders/${orderId}! User B berhasil membaca data pesanan User A (status: ${idorRes.status}). Data: ${JSON.stringify(idorRes.data)}`
  );
  console.log("  [PASS] Endpoint order terisolasi: User B ditolak saat mencoba mengakses order User A (403 Forbidden).");

  // 5. Uji Kebocoran Data Melalui Logika Chatbot CS AI (lib/cs-ai.js findOrder)
  // Membaca file lib/cs-ai.js untuk memeriksa apakah findOrder membocorkan customer_name
  const csAiPath = path.join(PROJECT_ROOT, "lib/cs-ai.js");
  delete require.cache[require.resolve(csAiPath)];
  const fs = require("fs");
  const csAiContent = fs.readFileSync(csAiPath, "utf8");

  // Periksa apakah query di cs-ai.js mengekspos customer_name
  const exposesCustomerName = csAiContent.includes("customer_name FROM orders") ||
                              csAiContent.includes("${order.customer_name}");

  assert(
    !exposesCustomerName,
    `VULNERABILITY DETECTED: Chatbot CS AI menyertakan customer_name dari database pesanan ke prompt publik! Potensi IDOR/PII Leakage.`
  );
  console.log("  [PASS] Logika CS AI aman: Data pribadi/nama pelanggan tidak diekspos melalui chatbot publik.");
}

module.exports = { runTest };
