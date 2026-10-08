const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PROJECT_ROOT } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 06] Pencegahan Stored XSS & Karakter Escape (<, >, \", ') ---");

  const payload = `<script>alert("XSS ' test")</script>`;
  const expectedEscaped = `&lt;script&gt;alert(&quot;XSS &#039; test&quot;)&lt;/script&gt;`;

  const filesToCheck = [
    "server.js",
    "public/common.js",
    "public/admin.js",
    "public/invoice.js",
    "public/home.js",
    "public/address-master.js",
  ];

  // 1. Verifikasi fungsi escapeHtml di setiap file
  for (const relPath of filesToCheck) {
    const fullPath = path.join(PROJECT_ROOT, relPath);
    const content = fs.readFileSync(fullPath, "utf8");

    const match = content.match(/function escapeHtml\([^\)]*\)\s*\{[\s\S]*?\n\}/);
    assert(match, `Fungsi escapeHtml tidak ditemukan di ${relPath}`);

    const escapeFn = new Function(`${match[0]}; return escapeHtml;`)();
    const result = escapeFn(payload);

    // Periksa bahwa karakter ', ", <, > semuanya di-escape
    assert(
      !result.includes("'"),
      `VULNERABILITY DETECTED: Karakter single quote (') tidak di-escape pada ${relPath}! Hasil: ${result}`
    );
    assert(
      !result.includes("\""),
      `VULNERABILITY DETECTED: Karakter double quote (\") tidak di-escape pada ${relPath}! Hasil: ${result}`
    );
    assert(
      !result.includes("<"),
      `VULNERABILITY DETECTED: Karakter < tidak di-escape pada ${relPath}! Hasil: ${result}`
    );
    assert(
      !result.includes(">"),
      `VULNERABILITY DETECTED: Karakter > tidak di-escape pada ${relPath}! Hasil: ${result}`
    );

    assert.strictEqual(
      result,
      expectedEscaped,
      `Output escapeHtml di ${relPath} tidak sesuai standar`
    );

    console.log(`  [PASS] ${relPath}: escapeHtml meng-escape <, >, ", dan ' dengan sempurna.`);
  }

  // 2. Verifikasi render email server (resetEmailBody)
  const serverContent = fs.readFileSync(path.join(PROJECT_ROOT, "server.js"), "utf8");
  const resetEmailMatch = serverContent.match(/function resetEmailBody[\s\S]*?\n\}/);
  const serverEscapeMatch = serverContent.match(/function escapeHtml\([^\)]*\)\s*\{[\s\S]*?\n\}/);

  const resetEmailFn = new Function(`
    ${serverEscapeMatch[0]}
    ${resetEmailMatch[0]}
    return resetEmailBody;
  `)();

  const emailRes = resetEmailFn({
    name: `<img src="x" onerror='alert(1)'>`,
    link: `https://test.com/reset?token="><script>'`,
  });

  assert(!emailRes.html.includes("<img"), "Tag <img> mentah tidak boleh lolos di template email");
  assert(!emailRes.html.includes("<script"), "Tag <script> mentah tidak boleh lolos di template email");
  assert(!emailRes.html.includes("'alert"), "Single quote mentah tidak boleh lolos di template email");
  console.log("  [PASS] server.js resetEmailBody: Template email HTML meng-escape seluruh tag dan karakter XSS.");
}

module.exports = { runTest };
