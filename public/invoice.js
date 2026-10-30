const invoiceContainer = document.getElementById("invoiceContainer");
const invoiceCloseBtn = document.getElementById("invoiceCloseBtn");
const invoicePrintBtn = document.getElementById("invoicePrintBtn");
const invoicePdfBtn = document.getElementById("invoicePdfBtn");
const invoiceAdminActions = document.getElementById("invoiceAdminActions");
const invoiceMarkPaidBtn = document.getElementById("invoiceMarkPaidBtn");
const invoiceVoidBtn = document.getElementById("invoiceVoidBtn");
const invoiceAdminMessage = document.getElementById("invoiceAdminMessage");

function isInvoiceAdmin() {
  return String(getAuth()?.user?.role || "").toLowerCase() === "admin";
}

function setAdminMessage(text, isSuccess = false) {
  if (!invoiceAdminMessage) return;
  invoiceAdminMessage.classList.toggle("success", isSuccess);
  invoiceAdminMessage.textContent = text || "";
}

function updateAdminStatusBar(order) {
  if (!invoiceAdminActions) return;
  if (!isInvoiceAdmin() || !order) {
    invoiceAdminActions.classList.add("hidden");
    return;
  }
  invoiceAdminActions.classList.remove("hidden");
  const st = String(order.status || "").toLowerCase();
  if (invoiceMarkPaidBtn) invoiceMarkPaidBtn.classList.toggle("hidden", st === "paid" || st === "void");
  if (invoiceVoidBtn) invoiceVoidBtn.classList.toggle("hidden", st === "void");
  if (st === "void") setAdminMessage("Invoice ini sudah dibatalkan.");
  else if (st === "paid") setAdminMessage("Invoice sudah lunas. Bisa dibatalkan (void) jika perlu.", true);
  else setAdminMessage("");
}

let currentOrderId = null;
let invoicePayCountdownTimer = null;

function formatPayCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function startInvoicePayCountdown(order) {
  if (invoicePayCountdownTimer) {
    clearInterval(invoicePayCountdownTimer);
    invoicePayCountdownTimer = null;
  }
  const el = document.getElementById("invoicePayCountdown");
  if (!el || !order?.paymentDueAt) return;
  const dueMs = new Date(order.paymentDueAt).getTime();
  if (!Number.isFinite(dueMs)) {
    el.textContent = "";
    return;
  }
  const tick = () => {
    const left = dueMs - Date.now();
    if (left <= 0) {
      const pill = el.closest(".inv-timer");
      if (pill) pill.textContent = "Waktu pembayaran habis";
      else el.textContent = "Waktu pembayaran habis. Pesanan akan dibatalkan otomatis.";
      if (invoicePayCountdownTimer) {
        clearInterval(invoicePayCountdownTimer);
        invoicePayCountdownTimer = null;
      }
      setTimeout(() => loadInvoice(), 1500);
      return;
    }
    el.textContent = formatPayCountdown(left);
  };
  tick();
  invoicePayCountdownTimer = setInterval(tick, 1000);
}

function paymentProofSectionHtml(order, isPaid, isVoid, paymentMethodRaw) {
  if (isVoid || paymentMethodRaw === "cod") return "";
  const canUpload = !isPaid;
  const hasProof = Boolean(order.hasPaymentProof);
  const proofName = typeof escapeHtml === "function" ? escapeHtml(order.paymentProofName || "bukti bayar") : order.paymentProofName || "bukti bayar";
  return `
    <div class="inv-proof no-print">
      <p>Bukti pembayaran</p>
      ${
        hasProof
          ? `<p class="inv-proof-ok">Sudah diunggah: ${proofName}${
              order.paymentProofAt ? ` · ${new Date(order.paymentProofAt).toLocaleString("id-ID")}` : ""
            }</p>
            <div id="paymentProofPreview" class="inv-proof-preview"></div>
            <button type="button" id="paymentProofViewBtn" class="inv-link-btn">Lihat bukti</button>`
          : ""
      }
      ${
        canUpload
          ? `<form id="paymentProofForm" class="inv-proof-form">
              <input type="file" id="paymentProofFile" class="inv-file" accept="image/png,image/jpeg,image/webp,application/pdf" />
              <button type="button" class="inv-drop" id="paymentProofDrop">
                <span class="inv-drop-icon" aria-hidden="true">↑</span>
                <span data-file-label>Seret file ke sini atau klik untuk mengunggah<br /><small>Format: JPG, PNG, PDF (maks. 10MB)</small></span>
              </button>
              <button type="submit" id="paymentProofSubmitBtn">${hasProof ? "Unggah ulang bukti" : "Unggah bukti pembayaran"}</button>
              <p id="paymentProofMessage" class="message"></p>
            </form>`
          : ""
      }
    </div>
  `;
}

async function openPaymentProof(orderId) {
  const token = typeof getToken === "function" ? getToken() : null;
  const response = await fetch(`/api/orders/${orderId}/payment-proof`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Gagal membuka bukti bayar.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

async function previewPaymentProof(orderId) {
  const box = document.getElementById("paymentProofPreview");
  if (!box) return;
  try {
    const token = typeof getToken === "function" ? getToken() : null;
    const response = await fetch(`/api/orders/${orderId}/payment-proof`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return;
    const blob = await response.blob();
    if (!String(blob.type || "").startsWith("image/")) {
      box.innerHTML = "";
      return;
    }
    const url = URL.createObjectURL(blob);
    box.innerHTML = `<img src="${url}" alt="Bukti bayar" style="max-width: 100%; max-height: 220px; border-radius: 8px; display: block;">`;
  } catch (_error) {}
}

function bindPaymentProofForm(order) {
  const viewBtn = document.getElementById("paymentProofViewBtn");
  if (viewBtn) {
    viewBtn.addEventListener("click", async () => {
      try {
        await openPaymentProof(order.id);
      } catch (error) {
        alert(error.message);
      }
    });
  }
  if (order.hasPaymentProof) previewPaymentProof(order.id);

  const form = document.getElementById("paymentProofForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById("paymentProofFile");
    const messageEl = document.getElementById("paymentProofMessage");
    const submitBtn = document.getElementById("paymentProofSubmitBtn");
    const file = fileInput?.files?.[0];
    if (!file) {
      if (messageEl) messageEl.textContent = "Pilih file bukti bayar terlebih dahulu.";
      return;
    }
    if (messageEl) {
      messageEl.className = "message";
      messageEl.textContent = "Mengunggah...";
    }
    if (submitBtn) submitBtn.disabled = true;
    try {
      const token = typeof getToken === "function" ? getToken() : null;
      const body = new FormData();
      body.append("proof", file);
      const response = await fetch(`/api/orders/${order.id}/payment-proof`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Gagal mengunggah bukti bayar.");
      if (messageEl) {
        messageEl.className = "message success";
        messageEl.textContent = data.message || "Bukti bayar terkirim.";
      }
      await loadInvoice();
    } catch (error) {
      if (messageEl) {
        messageEl.className = "message";
        messageEl.textContent = error.message;
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function itemSpecLine(item) {
  const name = String(item.product_name || "");
  const thick = name.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  const brand = name.match(/^([A-Z][A-Z0-9]{1,})/);
  const bits = [];
  if (thick) bits.push(`${thick[1].replace(",", ".")} mm`);
  else if (item.size) bits.push(String(item.size));
  if (brand) bits.push(brand[1]);
  return bits.join(" · ");
}

function bindInvoiceExtras() {
  document.querySelectorAll("[data-copy-account]").forEach((button) => {
    button.addEventListener("click", async () => {
      const number = button.getAttribute("data-copy-account") || "";
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(number);
        button.textContent = "Tersalin";
      } catch {
        button.textContent = "Gagal menyalin";
      }
      setTimeout(() => {
        button.textContent = original;
      }, 1400);
    });
  });

  const drop = document.getElementById("paymentProofDrop");
  const fileInput = document.getElementById("paymentProofFile");
  if (!drop || !fileInput) return;
  const label = drop.querySelector("[data-file-label]");
  const showFile = () => {
    if (label && fileInput.files?.[0]) label.textContent = fileInput.files[0].name;
  };
  drop.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", showFile);
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("is-over");
    const file = event.dataTransfer?.files?.[0];
    if (!file || typeof DataTransfer === "undefined") return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    showFile();
  });
}

function setInvoiceActionsEnabled(enabled) {
  if (invoicePrintBtn) invoicePrintBtn.disabled = !enabled;
  if (invoicePdfBtn) invoicePdfBtn.disabled = !enabled;
}

async function exportInvoicePdf() {
  if (!invoiceContainer || !currentOrderId) return;
  if (typeof html2pdf === "undefined") {
    alert("Fitur PDF belum siap. Gunakan tombol Cetak lalu pilih Simpan sebagai PDF.");
    return;
  }
  if (invoicePdfBtn) {
    invoicePdfBtn.disabled = true;
    invoicePdfBtn.textContent = "Membuat PDF...";
  }
  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `Invoice_Order_${currentOrderId}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(invoiceContainer)
      .save();
  } catch (error) {
    alert("Gagal export PDF. Coba gunakan tombol Cetak.");
  } finally {
    if (invoicePdfBtn) {
      invoicePdfBtn.disabled = false;
      invoicePdfBtn.textContent = "Export PDF";
    }
  }
}

if (invoiceCloseBtn) {
  invoiceCloseBtn.addEventListener("click", () => {
    window.location.href = "/";
  });
}

if (invoicePrintBtn) {
  invoicePrintBtn.addEventListener("click", () => window.print());
}

if (invoicePdfBtn) {
  invoicePdfBtn.addEventListener("click", exportInvoicePdf);
}

setInvoiceActionsEnabled(false);

async function loadInvoice() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  if (!orderId) {
    invoiceContainer.innerHTML = "<div style='color:red; text-align:center;'>ID Pesanan tidak ditemukan.</div>";
    return;
  }

  try {
    const order = await apiFetch(`/orders/${orderId}`);
    
    const [settings, products] = await Promise.all([
      apiFetch("/settings").catch(() => ({})),
      apiFetch("/products").catch(() => []),
    ]);
    const imageById = {};
    (Array.isArray(products) ? products : []).forEach((product) => {
      const images = getProductImages(product);
      imageById[product.id] = images[0] || product.image || "";
    });
    const orderStatus = String(order.status || "").toLowerCase();
    const isPaid = orderStatus === "paid";
    const isVoid = orderStatus === "void";
    const statusLabel = isVoid ? "DIBATALKAN" : isPaid ? "LUNAS" : "BELUM DIBAYAR";
    const dateStr = new Date(order.created_at).toLocaleDateString("id-ID");
    const statusClass = isVoid ? "is-void" : isPaid ? "is-paid" : "is-unpaid";
    let shippingMeta = {};
    try {
      shippingMeta = order.shipping_meta ? JSON.parse(order.shipping_meta) : {};
    } catch {
      shippingMeta = {};
    }
    const productsSubtotal = Number(order.products_subtotal) || order.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const shippingFee = Number(order.shipping_fee) || 0;
    const taxAmount = Number(order.tax_amount) || 0;
    const taxMode = order.tax_mode || "none";
    const taxPercent = Number(order.tax_percent) || 0;
    const taxLine =
      taxMode !== "none" && taxPercent > 0
        ? `<div class="inv-sum-row"><span>${
            taxMode === "include" ? `PPN ${taxPercent}% (include)` : `PPN ${taxPercent}%`
          }</span><span>${formatRupiah(taxAmount)}</span></div>`
        : "";
    const shippingMethodLabel =
      shippingMeta.label ||
      (order.shipping_method === "pickup"
        ? "Ambil sendiri"
        : order.shipping_method === "store"
        ? "Kirim mobil toko"
        : order.shipping_method === "lalamove"
          ? "Lalamove"
          : order.shipping_method === "gosend"
            ? "GoSend"
            : order.shipping_method || "-");
    const paymentMethodRaw = String(order.payment_method || "").toLowerCase();
    const dueText = order.paymentDueAt ? new Date(order.paymentDueAt).toLocaleString("id-ID") : "-";
    const durationText = order.paymentTimeoutLabel ? escapeHtml(order.paymentTimeoutLabel) : "";
    const showTimer = paymentMethodRaw !== "cod" && order.paymentTimeoutEnabled && !isPaid && !isVoid && order.paymentDueAt;
    const paymentTimeoutHtml = (() => {
      if (paymentMethodRaw === "cod") return "";
      if (isVoid && String(order.voidReason || order.void_reason || "") === "timeout") {
        return `<div class="inv-field"><span>Batas bayar</span><span>:</span><span>Dibatalkan otomatis${
          durationText ? ` (durasi ${durationText})` : ""
        }</span></div>`;
      }
      if (!order.paymentTimeoutEnabled || isPaid || isVoid) return "";
      return `<div class="inv-field"><span>Batas bayar</span><span>:</span><span>${dueText}${
        durationText ? ` <small>(durasi ${durationText})</small>` : ""
      }</span></div>`;
    })();
    const paymentMethodLabel =
      paymentMethodRaw === "qris"
        ? "QRIS"
        : paymentMethodRaw === "transfer"
          ? "Transfer bank"
          : paymentMethodRaw === "cod"
            ? "COD"
            : paymentMethodRaw === "ewallet"
              ? "E-Wallet"
              : order.payment_method || "-";
    const banks = Array.isArray(settings?.banks) ? settings.banks.filter((b) => b && b.accountNumber) : [];
    const bankAccountsHtml =
      !isVoid && paymentMethodRaw === "transfer"
        ? banks.length
          ? `<p class="inv-transfer-title">${isPaid ? "Rekening tujuan transfer:" : "Silakan transfer ke rekening berikut:"}</p>
            ${banks
              .map((bank) => {
                const number = escapeHtml(bank.accountNumber);
                const owner = bank.accountName ? escapeHtml(bank.accountName) : "";
                const mark = escapeHtml(String(bank.bankName || "BANK").slice(0, 4).toUpperCase());
                return `<div class="inv-bank">
                  <div class="inv-bank-mark">${mark}</div>
                  <div>
                    <p>Nomor rekening</p>
                    <strong>${number}</strong>
                    ${owner ? `<small>a.n. ${owner}</small>` : ""}
                  </div>
                  <button type="button" class="inv-copy" data-copy-account="${number}">Salin rekening</button>
                </div>`;
              })
              .join("")}`
          : `<p class="inv-warn-text">Nomor rekening belum diatur. Hubungi admin.</p>`
        : "";

    const itemsHtml = order.items
      .map((item) => {
        const qty = Math.max(1, Number(item.qty) || 1);
        const unitPrice = Number(item.final_price ?? item.price) || 0;
        const image = imageById[item.product_id] || "";
        const spec = itemSpecLine(item);
        const sizeNote = item.size ? ` (${escapeHtml(item.size)})` : "";
        return `
        <tr>
          <td>
            <div class="inv-product">
              ${image ? `<img src="${escapeHtml(image)}" alt="" />` : `<span class="inv-product-fallback"></span>`}
              <span>
                <strong>${escapeHtml(item.product_name)}${sizeNote}</strong>
                ${spec ? `<small>${escapeHtml(spec)}</small>` : ""}
              </span>
            </div>
          </td>
          <td>${qty}</td>
          <td>${formatRupiah(unitPrice)}</td>
          <td>${Number(item.discount) || 0}%</td>
          <td>${formatRupiah(item.subtotal)}</td>
        </tr>`;
      })
      .join("");

    const noticeText =
      isVoid && String(order.voidReason || order.void_reason || "") === "timeout"
        ? "Invoice ini dibatalkan otomatis karena melewati batas waktu pembayaran."
        : isVoid
          ? "Invoice ini dibatalkan (void)."
          : isPaid
            ? "Terima kasih atas pembayaran Anda."
            : order.paymentTimeoutEnabled
              ? `Invoice ini belum lunas. Selesaikan pembayaran sebelum batas waktu atau pesanan dibatalkan otomatis${
                  order.paymentTimeoutLabel ? ` (durasi ${escapeHtml(order.paymentTimeoutLabel)})` : ""
                }.`
              : "Invoice ini belum lunas. Silakan selesaikan pembayaran.";
    const payStateLabel = isVoid ? "Dibatalkan" : isPaid ? "Sudah diterima" : "Menunggu pembayaran";

    invoiceContainer.innerHTML = `
      <header class="inv-head">
        <h1>Invoice</h1>
        <div class="inv-head-meta">
          <p>Order ID: ${order.id}</p>
          <p>Tanggal: ${dateStr}</p>
        </div>
        <span class="inv-badge ${statusClass}">${statusLabel}</span>
      </header>

      <section class="inv-grid">
        <article class="inv-card inv-bill">
          <h2>Info Penagihan dan Pengiriman</h2>
          <div class="inv-field"><span>Nama</span><span>:</span><span>${escapeHtml(order.customer_name)}</span></div>
          <div class="inv-field"><span>Email</span><span>:</span><span>${escapeHtml(order.customer_email || "-")}</span></div>
          <div class="inv-field"><span>Telepon</span><span>:</span><span>${escapeHtml(order.customer_phone)}</span></div>
          <div class="inv-field"><span>Alamat</span><span>:</span><span>${escapeHtml(order.customer_address || "-").replace(/\n/g, "<br>")}</span></div>
          <div class="inv-field"><span>Jasa kirim</span><span>:</span><span>${escapeHtml(shippingMethodLabel)}${shippingMeta.estimated ? " (estimasi)" : ""}</span></div>
          <div class="inv-field"><span>Status kirim</span><span>:</span><span><em class="inv-pill">${escapeHtml(order.shipmentStatusLabel || "Menunggu proses")}</em></span></div>
          ${
            order.trackingNumber
              ? `<div class="inv-field"><span>No. resi</span><span>:</span><span>${escapeHtml(order.trackingNumber)}${
                  order.trackingUrl
                    ? ` · <a href="${escapeHtml(order.trackingUrl)}" target="_blank" rel="noopener">Cek resi</a>`
                    : ""
                }</span></div>`
              : ""
          }
          ${order.shipmentNote ? `<div class="inv-field"><span>Catatan kirim</span><span>:</span><span>${escapeHtml(order.shipmentNote)}</span></div>` : ""}
          <a class="inv-track no-print" href="/lacak.html?id=${order.id}">Lacak pengiriman</a>
        </article>

        <article class="inv-card inv-pay">
          ${showTimer ? `<span class="inv-timer">Sisa waktu bayar <strong id="invoicePayCountdown">--:--:--</strong></span>` : ""}
          <h2>Pembayaran</h2>
          <div class="inv-field"><span>Metode pembayaran</span><span>:</span><span>${escapeHtml(paymentMethodLabel)}</span></div>
          <div class="inv-field"><span>Status pembayaran</span><span>:</span><span class="${isPaid ? "is-paid" : isVoid ? "" : "is-wait"}">${payStateLabel}</span></div>
          ${paymentTimeoutHtml}
          ${bankAccountsHtml}
          ${
            !isPaid && !isVoid && paymentMethodRaw === "qris" && settings?.qrisImageUrl
              ? `<div class="inv-qris">
                  <p>Scan barcode QRIS di bawah ini:</p>
                  <img src="${escapeHtml(settings.qrisImageUrl)}" alt="QRIS" />
                </div>`
              : ""
          }
          ${paymentProofSectionHtml(order, isPaid, isVoid, paymentMethodRaw)}
        </article>
      </section>

      <table class="inv-items">
        <thead>
          <tr>
            <th>Produk</th>
            <th>Quantity</th>
            <th>Harga satuan</th>
            <th>Diskon</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <section class="inv-bottom">
        <div class="inv-notice">
          <span aria-hidden="true">!</span>
          <div>
            <p>${noticeText}</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan</p>
          </div>
        </div>
        <div class="inv-sum">
          <div class="inv-sum-row"><span>Subtotal produk</span><span>${formatRupiah(productsSubtotal)}</span></div>
          ${taxLine}
          <div class="inv-sum-row"><span>Ongkir</span><span>${formatRupiah(shippingFee)}</span></div>
          <div class="inv-sum-row inv-sum-total"><span>TOTAL KESELURUHAN</span><span>${formatRupiah(order.total)}</span></div>
        </div>
      </section>
    `;

    currentOrderId = order.id;
    document.title = `Invoice_Order_${order.id}`;
    setInvoiceActionsEnabled(true);
    bindPaymentProofForm(order);
    bindInvoiceExtras();
    updateAdminStatusBar(order);
    startInvoicePayCountdown(order);

  } catch (error) {
    currentOrderId = null;
    setInvoiceActionsEnabled(false);
    invoiceContainer.innerHTML = `<div style="color:red; text-align:center;">Gagal memuat invoice: ${error.message}</div>`;
  }
}

loadInvoice();

invoiceMarkPaidBtn?.addEventListener("click", async () => {
  if (!currentOrderId || !isInvoiceAdmin()) return;
  if (!confirm(`Tandai invoice #${currentOrderId} sebagai LUNAS?`)) return;
  setAdminMessage("Menyimpan status...");
  invoiceMarkPaidBtn.disabled = true;
  try {
    const result = await apiFetch(`/admin/orders/${currentOrderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "paid" }),
    });
    setAdminMessage(result.message || "Invoice ditandai lunas.", true);
    await loadInvoice();
  } catch (error) {
    setAdminMessage(error.message || "Gagal mengubah status.");
  } finally {
    invoiceMarkPaidBtn.disabled = false;
  }
});

invoiceVoidBtn?.addEventListener("click", async () => {
  if (!currentOrderId || !isInvoiceAdmin()) return;
  if (!confirm(`Batalkan (void) invoice #${currentOrderId}?\nStok akan dikembalikan. Invoice tetap tersimpan dengan status dibatalkan.`)) return;
  setAdminMessage("Membatalkan invoice...");
  invoiceVoidBtn.disabled = true;
  try {
    const result = await apiFetch(`/admin/orders/${currentOrderId}/void`, { method: "POST" });
    setAdminMessage(result.message || "Invoice dibatalkan.", true);
    await loadInvoice();
  } catch (error) {
    setAdminMessage(error.message || "Gagal membatalkan invoice.");
  } finally {
    invoiceVoidBtn.disabled = false;
  }
});
