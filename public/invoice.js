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
      el.textContent = "Waktu pembayaran habis. Pesanan akan dibatalkan otomatis.";
      if (invoicePayCountdownTimer) {
        clearInterval(invoicePayCountdownTimer);
        invoicePayCountdownTimer = null;
      }
      setTimeout(() => loadInvoice(), 1500);
      return;
    }
    el.textContent = `Sisa waktu bayar: ${formatPayCountdown(left)}`;
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
    <div class="no-print" style="margin-top: 14px; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid #dbeafe;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #1f2937;">Bukti pembayaran</p>
      ${
        hasProof
          ? `<p style="margin: 0 0 8px; font-size: 0.9rem; color: #047857;">Sudah diunggah: ${proofName}${
              order.paymentProofAt ? ` · ${new Date(order.paymentProofAt).toLocaleString("id-ID")}` : ""
            }</p>
            <div id="paymentProofPreview" style="margin-bottom: 8px;"></div>
            <button type="button" id="paymentProofViewBtn" class="btn-secondary" style="font-size: 0.85rem; padding: 6px 10px;">Lihat bukti</button>`
          : `<p style="margin: 0 0 8px; font-size: 0.9rem; color: #6b7280;">Unggah foto/screenshot atau PDF bukti transfer. Admin akan mendapat notifikasi.</p>`
      }
      ${
        canUpload
          ? `<form id="paymentProofForm" style="margin-top: 10px; display: grid; gap: 8px;">
              <input type="file" id="paymentProofFile" accept="image/png,image/jpeg,image/webp,application/pdf" required />
              <button type="submit" id="paymentProofSubmitBtn" class="btn-primary" style="font-size: 0.9rem; padding: 8px 12px;">${
                hasProof ? "Unggah ulang bukti" : "Unggah bukti bayar"
              }</button>
              <p id="paymentProofMessage" class="message" style="margin: 0;"></p>
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
    
    const settings = await apiFetch("/settings").catch(() => ({}));
    const company = settings?.companyProfile || {};
    const logoUrl = settings?.logoUrl || "";

    const companyLogoHtml = logoUrl ? `<img src="${logoUrl}" class="company-logo" alt="Logo">` : "";
    let companyName = company.name || "PT SAHABAT JAYA SUKSES"; 
    if (order.fulfillment_entity === "SJL") {
      companyName = "PT SUKSES JAYA LESTARI";
    }
    const orderStatus = String(order.status || "").toLowerCase();
    const isPaid = orderStatus === "paid";
    const isVoid = orderStatus === "void";
    const statusLabel = isVoid ? "VOID / DIBATALKAN" : isPaid ? "LUNAS" : "BELUM DIBAYAR";
    const statusColor = isVoid ? "#4b5563" : isPaid ? "#059669" : "#c2410c";
    const dateStr = new Date(order.created_at).toLocaleString('id-ID');
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
        ? `<p style="margin: 4px 0;">${
            taxMode === "include"
              ? `PPN ${taxPercent}% (include): termasuk ${formatRupiah(taxAmount)}`
              : `PPN ${taxPercent}%: ${formatRupiah(taxAmount)}`
          }</p>`
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
    const paymentTimeoutHtml = (() => {
      if (paymentMethodRaw === "cod") return "";
      if (isVoid && String(order.voidReason || order.void_reason || "") === "timeout") {
        return `<p style="margin-top: 10px; color: #4b5563;"><strong>Batas bayar:</strong> pesanan dibatalkan otomatis karena melewati durasi pembayaran${
          order.paymentTimeoutLabel ? ` (${escapeHtml(order.paymentTimeoutLabel)})` : ""
        }.</p>`;
      }
      if (!order.paymentTimeoutEnabled || isPaid || isVoid) return "";
      const dueText = order.paymentDueAt ? new Date(order.paymentDueAt).toLocaleString("id-ID") : "-";
      const durationText = order.paymentTimeoutLabel ? escapeHtml(order.paymentTimeoutLabel) : "";
      return `<p style="margin-top: 10px;"><strong>Batas bayar:</strong> ${dueText}${
        durationText ? ` <span style="color:#6b7280;">(durasi ${durationText})</span>` : ""
      }</p>
      <p id="invoicePayCountdown" style="margin: 4px 0 0; font-weight: 700; color: #c2410c;">Menghitung sisa waktu...</p>`;
    })();
    const paymentMethodLabel =
      paymentMethodRaw === "qris"
        ? "QRIS"
        : paymentMethodRaw === "transfer"
          ? "Transfer Bank"
          : paymentMethodRaw === "cod"
            ? "COD"
            : paymentMethodRaw === "ewallet"
              ? "E-Wallet"
              : order.payment_method || "-";
    const banks = Array.isArray(settings?.banks) ? settings.banks.filter((b) => b && b.accountNumber) : [];
    const bankAccountsHtml =
      !isVoid && paymentMethodRaw === "transfer"
        ? banks.length
          ? `<div style="margin-top: 12px; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">${
                isPaid ? "Rekening tujuan transfer:" : "Silakan transfer ke rekening berikut:"
              }</p>
              ${banks
                .map((bank, index) => {
                  const name = typeof escapeHtml === "function" ? escapeHtml(bank.bankName) : bank.bankName;
                  const number =
                    typeof escapeHtml === "function" ? escapeHtml(bank.accountNumber) : bank.accountNumber;
                  const owner = bank.accountName
                    ? typeof escapeHtml === "function"
                      ? escapeHtml(bank.accountName)
                      : bank.accountName
                    : "";
                  return `<div style="padding: 8px 0;${index ? " border-top: 1px solid #f3f4f6;" : ""}">
                    <p style="margin: 0; font-weight: 600; color: #111827;">${name}</p>
                    <p style="margin: 2px 0 0; font-size: 1.05rem; letter-spacing: 0.02em; color: #1f2937;">${number}</p>
                    ${owner ? `<p style="margin: 2px 0 0; font-size: 0.85rem; color: #6b7280;">a.n. ${owner}</p>` : ""}
                  </div>`;
                })
                .join("")}
            </div>`
          : `<p style="margin-top: 10px; font-size: 0.9rem; color: #c2410c;">Nomor rekening belum diatur. Hubungi admin.</p>`
        : "";

    let itemsHtml = order.items.map(item => {
      const qty = Math.max(1, Number(item.qty) || 1);
      const unitPrice = Number(item.final_price ?? item.price) || 0;
      return `
      <tr>
        <td>${item.product_name}${item.size ? ` <span style="color: #2563eb; font-size: 0.85rem;">(${item.size})</span>` : ""}</td>
        <td style="text-align: center;">${qty}</td>
        <td style="text-align: right;">${formatRupiah(unitPrice)}</td>
        <td style="text-align: right;">${Number(item.discount) || 0}%</td>
        <td style="text-align: right;">${formatRupiah(item.subtotal)}</td>
      </tr>
    `;
    }).join("");

    invoiceContainer.innerHTML = `
      <div class="invoice-header">
        <div class="company-info">
          ${companyLogoHtml}
          <div>
            <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 1.4rem;">${companyName}</h2>
          </div>
        </div>
        <div class="invoice-meta">
          <h1>INVOICE</h1>
          <p><strong>Order ID:</strong> #${order.id}</p>
          <p><strong>Tanggal:</strong> ${dateStr}</p>
          <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span></p>
        </div>
      </div>

      <div class="invoice-details">
        <div>
          <h3>Info Penagihan & Pengiriman</h3>
          <p><strong>Nama:</strong> ${order.customer_name}</p>
          <p><strong>Email:</strong> ${order.customer_email || '-'}</p>
          <p><strong>Telepon:</strong> ${order.customer_phone}</p>
          <p><strong>Alamat:</strong><br/>${order.customer_address.replace(/\n/g, '<br/>')}</p>
          <p style="margin-top: 10px;"><strong>Jasa kirim:</strong> ${shippingMethodLabel}${shippingMeta.estimated ? ' <span style="color:#6b7280;">(estimasi)</span>' : ''}</p>
          <p style="margin-top: 8px;"><strong>Status kirim:</strong> ${escapeHtml(order.shipmentStatusLabel || "Menunggu proses")}</p>
          ${
            order.trackingNumber
              ? `<p><strong>No. resi:</strong> ${escapeHtml(order.trackingNumber)}${
                  order.trackingUrl
                    ? ` · <a href="${escapeHtml(order.trackingUrl)}" target="_blank" rel="noopener">Cek resi</a>`
                    : ""
                }</p>`
              : ""
          }
          ${order.shipmentNote ? `<p><strong>Catatan kirim:</strong> ${escapeHtml(order.shipmentNote)}</p>` : ""}
          <p class="no-print" style="margin-top: 8px;"><a href="/lacak.html?id=${order.id}" class="btn-secondary" style="font-size: 0.85rem; padding: 6px 10px; display: inline-block;">Lacak pengiriman</a></p>
        </div>
        <div>
          <h3>Info Pembayaran</h3>
          <p><strong>Metode Pembayaran:</strong> ${paymentMethodLabel}</p>
          <p><strong>Pembayaran:</strong> ${isVoid ? "Dibatalkan (void)" : isPaid ? "Sudah diterima" : "Menunggu pembayaran"}</p>
          ${paymentTimeoutHtml}
          ${bankAccountsHtml}
          ${!isPaid && !isVoid && paymentMethodRaw === 'qris' && settings?.qrisImageUrl ? `
            <div style="margin-top: 15px; padding: 15px; background: #fff; border-radius: 8px; border: 1px dashed #2563eb; text-align: center;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #1f2937;">Scan Barcode QRIS di bawah ini:</p>
              <img src="${settings.qrisImageUrl}" alt="QRIS Barcode" style="max-width: 100%; max-height: 250px; border-radius: 8px; margin: 0 auto; display: block;">
            </div>
          ` : ''}
          ${paymentProofSectionHtml(order, isPaid, isVoid, paymentMethodRaw)}
        </div>
      </div>

      <table class="invoice-items">
        <thead>
          <tr>
            <th>Produk</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Harga Satuan</th>
            <th style="text-align: right;">Diskon</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="invoice-total" style="text-align: right;">
        <p style="margin: 4px 0;">Subtotal produk: ${formatRupiah(productsSubtotal)}</p>
        ${taxLine}
        <p style="margin: 4px 0;">Ongkir: ${formatRupiah(shippingFee)}</p>
        <p style="margin: 12px 0 0; font-size: 1.15rem; font-weight: 700;">TOTAL KESELURUHAN: <span style="color: #2563eb;">${formatRupiah(order.total)}</span></p>
      </div>
      
      <div style="margin-top: 40px; font-size: 0.85rem; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        <p>${
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
                  : "Invoice ini belum lunas. Silakan selesaikan pembayaran."
        }</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
      </div>
    `;

    currentOrderId = order.id;
    document.title = `Invoice_Order_${order.id}`;
    setInvoiceActionsEnabled(true);
    bindPaymentProofForm(order);
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
