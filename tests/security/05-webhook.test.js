const assert = require("assert");
const { api } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 05] Otentikasi Webhook WhatsApp & Anti-Abuse (SEC-14) ---");

  // 1. Request tanpa token rahasia (Penyerang acak dari internet)
  const unauthRes = await api("/api/whatsapp/webhook", {
    method: "POST",
    body: {
      sender: "081234567890",
      message: "Halo bot",
    },
  });

  assert.strictEqual(
    unauthRes.status,
    401,
    `VULNERABILITY DETECTED: Webhook terbuka untuk publik tanpa otentikasi token (status: ${unauthRes.status})! Penyerang bisa menghabiskan kuota AI / menyalahgunakan SMS relay.`
  );
  console.log("  [PASS] Request webhook tanpa token ditolak (401 Unauthorized).");

  // 2. Request dengan token salah
  const wrongTokenRes = await api("/api/whatsapp/webhook?token=invalid-secret-key", {
    method: "POST",
    body: {
      sender: "081234567890",
      message: "Halo bot",
    },
  });
  assert.strictEqual(wrongTokenRes.status, 401, "Webhook dengan token salah harus ditolak (401)");
  console.log("  [PASS] Request webhook dengan token salah ditolak (401 Unauthorized).");

  // 3. Request dengan token yang benar (Valid Fonnte Secret)
  const validTokenRes = await api("/api/whatsapp/webhook?token=my-secret-webhook-key-test", {
    method: "POST",
    body: {
      sender: "081234567890",
      message: "Halo bot",
    },
  });
  assert.strictEqual(validTokenRes.status, 200, "Webhook dengan token valid harus diterima (200)");
  console.log("  [PASS] Request webhook dengan token valid diterima (200 OK).");
}

module.exports = { runTest };
