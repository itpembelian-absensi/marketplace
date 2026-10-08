const assert = require("assert");
const { api, login, register, queryRun, queryGet, queryAll } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 02] Redeem Poin Paralel / Anti Double-Spending (BIZ-05) ---");

  // 1. Buat reward di tabel point_rewards
  await queryRun(
    "INSERT INTO point_rewards (name, reward_type, reward_value, points_required, is_active) VALUES (?, ?, ?, ?, 1)",
    ["Voucher Diskon Rp 50.000", "voucher", 50000, 100]
  );
  const rewardRow = await queryGet("SELECT id FROM point_rewards ORDER BY id DESC LIMIT 1");
  const rewardId = rewardRow.id;

  // 2. Buat user dan beri saldo tepat 100 poin
  const userEmail = `race-user-${Date.now()}@test.com`;
  const regRes = await register({
    name: "Race User",
    email: userEmail,
    password: "password123",
  });
  assert.strictEqual(regRes.status, 201, "Gagal registrasi user");
  const userAuth = await login(userEmail, "password123");
  const userId = userAuth.user.id;
  const userHeader = { Authorization: `Bearer ${userAuth.token}` };

  await queryRun(
    "INSERT INTO user_points (user_id, total_points) VALUES (?, 100) ON CONFLICT(user_id) DO UPDATE SET total_points = 100",
    [userId]
  );

  // 3. Kirim 2 permintaan redeem secara bersamaan (Concurrent HTTP Requests)
  const req1 = api("/api/points/redeem", {
    method: "POST",
    headers: userHeader,
    body: { rewardId },
  });
  const req2 = api("/api/points/redeem", {
    method: "POST",
    headers: userHeader,
    body: { rewardId },
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const statuses = [res1.status, res2.status];
  const successCount = statuses.filter((s) => s === 200).length;

  const pointsRow = await queryGet("SELECT total_points FROM user_points WHERE user_id = ?", [userId]);
  const historyRows = await queryAll("SELECT id FROM user_point_history WHERE user_id = ? AND reward_id = ?", [userId, rewardId]);

  assert.strictEqual(
    successCount,
    1,
    `VULNERABILITY DETECTED: Double-spending berhasil! ${successCount} dari 2 request redeem paralel berhasil lolos (status: ${statuses.join(", ")}). Riwayat tercatat: ${historyRows.length} kali, saldo akhir: ${pointsRow?.total_points}`
  );

  assert.strictEqual(pointsRow?.total_points, 0, "Saldo poin akhir harus 0, tidak boleh minus");
  assert.strictEqual(historyRows.length, 1, "Hanya boleh 1 record penukaran yang tercatat di database");

  console.log("  [PASS] Race condition tertangani: Hanya 1 request berhasil, request kedua ditolak (400).");
}

module.exports = { runTest };
