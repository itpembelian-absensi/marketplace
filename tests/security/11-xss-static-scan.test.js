const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PROJECT_ROOT } = require("./test-helpers");

async function runTest() {
  console.log("\n--- [TEST 11] Pemindaian Statis DOM XSS Sinks di public/ (Anti-Regresi) ---");

  const publicDir = path.join(PROJECT_ROOT, "public");
  const jsFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith(".js"));

  const unescapedViolations = [];

  // Pola nama variabel yang berpotensi memuat data user/API
  const dangerousVars = [
    "user.name",
    "user.email",
    "customer.name",
    "customer.email",
    "product.name",
    "product.category",
    "product.subcategory",
    "product.description",
    "product.image",
    "order.customer_name",
    "order.customer_email",
    "order.customer_address",
    "order.customer_phone",
    "order.shipmentNote",
    "order.trackingNumber",
    "r.name",
    "r.description",
    "u.name",
    "u.email",
    "h.user_name",
    "h.user_email",
    "h.description",
    "cat.name",
    "sub.name",
    "row.product_name",
    "row.name",
    "row.customer_name",
    "brand.name",
    "item.name",
    "line.name",
  ];

  jsFiles.forEach((file) => {
    const filePath = path.join(publicDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      // Hanya periksa baris yang menghasilkan struktur tag HTML / DOM Sink
      const isHtmlSink = line.includes("<") || line.includes("innerHTML") || line.includes("outerHTML") || line.includes("insertAdjacentHTML");
      if (!isHtmlSink) return;

      // Abaikan komentar atau property non-HTML
      if (line.trim().startsWith("//") || line.includes(".value =") || line.includes("textContent") || line.includes("console.log") || line.includes("confirm(")) {
        return;
      }

      dangerousVars.forEach((v) => {
        const needle = "${" + v + "}";
        if (line.includes(needle)) {
          // Cek apakah ada escapeHtml(v) di baris tersebut
          if (!line.includes("escapeHtml(" + v + ")") && !line.includes("encodeURIComponent(" + v + ")")) {
            unescapedViolations.push({
              file,
              line: idx + 1,
              variable: v,
              snippet: line.trim().slice(0, 120),
            });
          }
        }
      });
    });
  });

  if (unescapedViolations.length > 0) {
    console.error("  Ditemukan variabel data user/API tanpa escapeHtml pada DOM template literal:");
    unescapedViolations.forEach((v) => {
      console.error(`    - [${v.file}:${v.line}] Var: ${v.variable} -> ${v.snippet}`);
    });
  }

  assert.strictEqual(
    unescapedViolations.length,
    0,
    `VULNERABILITY DETECTED: Ditemukan ${unescapedViolations.length} variabel user/API tanpa escapeHtml di public/!`
  );

  console.log("  [PASS] Scan statis bersih: Seluruh variabel data user/API pada DOM templates di public/ telah di-escape.");
}

module.exports = { runTest };
