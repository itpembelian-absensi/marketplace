const assert = require("assert");
const { api, login } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 04] Keamanan File Upload Multer (SEC-08, SEC-09) ---");

  const adminAuth = await login("admin@test.com", "adminpassword123");
  const adminHeader = { Authorization: `Bearer ${adminAuth.token}` };

  // 1. Uji Bypass Ekstensi pada layananUpload (Spoofed MIME type + Executable extension)
  const fakeExeContent = "MZ\x90\x00\x03\x00\x00\x00MALICIOUS EXECUTABLE PAYLOAD";
  const spoofedBlob = new Blob([fakeExeContent], { type: "image/png" });
  const formLayanan = new FormData();
  formLayanan.append("file", spoofedBlob, "backdoor.exe");
  formLayanan.append("type", "konsultasi");
  formLayanan.append("name", "Attacker");
  formLayanan.append("phone", "081234567890");
  formLayanan.append("goal", "Security Audit");
  formLayanan.append("application", "Penetration Testing");
  formLayanan.append("message", "Testing upload bypass vulnerability");

  const resLayanan = await api("/api/layanan", {
    method: "POST",
    body: formLayanan,
  });

  assert.strictEqual(
    resLayanan.status,
    400,
    `VULNERABILITY DETECTED: Bypass ekstensi berhasil! File backdoor.exe dengan MIME image/png lolos validasi (status: ${resLayanan.status}) karena logika operator OR (||).`
  );
  console.log("  [PASS] File berekstensi berbahaya dengan MIME spoofing berhasil ditolak (400 Bad Request).");

  // 2. Uji Upload File SVG (Stored XSS)
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')"><circle cx="50" cy="50" r="40"/></svg>`;
  const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
  const formSvg = new FormData();
  formSvg.append("logo", svgBlob, "evil-logo.svg");

  const resSvg = await api("/api/admin/logo", {
    method: "POST",
    headers: adminHeader,
    body: formSvg,
  });

  assert.strictEqual(
    resSvg.status,
    400,
    `VULNERABILITY DETECTED: Upload file SVG berhasil diterima (status: ${resSvg.status})! Potensi Stored XSS via logo.`
  );
  console.log("  [PASS] Upload file SVG ditolak (400 Bad Request).");

  // 3. Uji Upload Logo PNG Valid (Harus Diterima)
  // Minimal valid 1x1 PNG image bytes
  const validPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const validBlob = new Blob([validPngBuffer], { type: "image/png" });
  const formValid = new FormData();
  formValid.append("logo", validBlob, "valid-logo.png");

  const resValid = await api("/api/admin/logo", {
    method: "POST",
    headers: adminHeader,
    body: formValid,
  });
  assert.strictEqual(resValid.status, 200, `Upload logo valid PNG harus berhasil (status: ${resValid.status})`);
  console.log("  [PASS] File gambar PNG valid berhasil diterima (200 OK).");

  // 4. Uji File .png berisi teks HTML/Script (Spoofed extension & MIME, invalid magic bytes)
  const fakePngContent = `<!DOCTYPE html><html><head><script>alert('pwned')</script></head><body>fake png</body></html>`;
  const fakePngBlob = new Blob([fakePngContent], { type: "image/png" });
  const formFakePng = new FormData();
  formFakePng.append("logo", fakePngBlob, "shell.png");

  const resFakePng = await api("/api/admin/logo", {
    method: "POST",
    headers: adminHeader,
    body: formFakePng,
  });

  assert.strictEqual(
    resFakePng.status,
    400,
    `VULNERABILITY DETECTED: File .png palsu berisi HTML/script berhasil diupload (status: ${resFakePng.status})! Magic bytes tidak divalidasi.`
  );
  console.log("  [PASS] File .png palsu berisi teks HTML/script berhasil ditolak (400 Bad Request).");

  // 5. Uji Header X-Content-Type-Options: nosniff pada Static Files
  const resStatic = await api("/logo-sjs.png", { method: "GET" });
  const nosniffHeader = resStatic.headers.get("x-content-type-options");
  assert.strictEqual(
    nosniffHeader,
    "nosniff",
    `X-Content-Type-Options harus bernilai nosniff pada static file serving (didapat: ${nosniffHeader})`
  );
  console.log("  [PASS] Header X-Content-Type-Options: nosniff terpasang dengan benar pada folder public.");
}

module.exports = { runTest };
