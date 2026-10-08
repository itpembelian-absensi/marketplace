const { startTestServer, stopTestServer } = require("./test-helpers");

const testSuites = [
  { name: "01. Poin Reward Lifecycle (BIZ-04)", file: "./01-points.test" },
  { name: "02. Redeem Poin Paralel / Anti Double-Spending (BIZ-05)", file: "./02-points-race.test" },
  { name: "03. Checkout Stok Paralel / Anti Overselling (BIZ-06)", file: "./03-stock-race.test" },
  { name: "04. Keamanan File Upload Multer (SEC-08, SEC-09)", file: "./04-upload.test" },
  { name: "05. Otentikasi Webhook WhatsApp & Anti-Abuse (SEC-14)", file: "./05-webhook.test" },
  { name: "06. Pencegahan Stored XSS & Karakter Escape (<, >, \", ')", file: "./06-xss.test" },
  { name: "07. Integritas Harga dari Client (Price Tampering)", file: "./07-price-tampering.test" },
  { name: "08. Pencegahan IDOR & Kebocoran PII Chatbot (SEC-15)", file: "./08-idor.test" },
  { name: "09. Kontrol Akses & Role-Based Access Control (RBAC)", file: "./09-access-control.test" },
  { name: "10. Pencegahan Mass Assignment & Privilege Escalation", file: "./10-mass-assignment.test" },
];

async function main() {
  const startTime = Date.now();
  console.log("================================================================================");
  console.log("                 SECURITY AUDIT AUTOMATED TEST SUITE RUNNER                     ");
  console.log("================================================================================");

  let serverStarted = false;
  const results = [];

  try {
    console.log("[INIT] Mempersiapkan server dan database test sementara...");
    await startTestServer();
    serverStarted = true;
    console.log("[INIT] Server test aktif di http://127.0.0.1:5099 (DB terisolasi).");

    for (const suite of testSuites) {
      const suiteModule = require(suite.file);
      try {
        await suiteModule.runTest();
        results.push({ name: suite.name, status: "PASSED", error: null });
      } catch (err) {
        console.error(`\n  [FAIL] ${suite.name}`);
        console.error(`  Penyebab: ${err.message}`);
        results.push({ name: suite.name, status: "FAILED", error: err.message });
      }
    }
  } catch (initErr) {
    console.error("[FATAL ERROR]", initErr);
  } finally {
    if (serverStarted) {
      console.log("\n[CLEANUP] Menghentikan server test dan memulihkan database...");
      await stopTestServer();
      console.log("[CLEANUP] Selesai.");
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const passedCount = results.filter((r) => r.status === "PASSED").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;

  console.log("\n================================================================================");
  console.log("                           RINGKASAN HASIL PENGUJIAN                            ");
  console.log("================================================================================");
  console.log(`Durasi Eksekusi : ${durationSec} detik`);
  console.log(`Total Pengujian : ${results.length}`);
  console.log(`Lolos (PASS)    : ${passedCount}`);
  console.log(`Gagal (FAIL)    : ${failedCount}`);
  console.log("--------------------------------------------------------------------------------");

  results.forEach((r, idx) => {
    const badge = r.status === "PASSED" ? "[PASS]" : "[FAIL]";
    console.log(`${String(idx + 1).padStart(2, " ")}. ${badge} ${r.name}`);
    if (r.error) {
      console.log(`       -> Detail: ${r.error}`);
    }
  });
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Unhandled runner error:", err);
  process.exit(1);
});
