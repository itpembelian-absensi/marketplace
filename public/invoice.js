const invoiceContainer = document.getElementById("invoiceContainer");
const invoiceCloseBtn = document.getElementById("invoiceCloseBtn");
const invoicePrintBtn = document.getElementById("invoicePrintBtn");
const invoicePdfBtn = document.getElementById("invoicePdfBtn");

let currentOrderId = null;

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
    const companyAddress = company.address || "Alamat belum diatur";
    const companyPhone = company.phone || "-";
    const companyEmail = company.email || "-";

    const dateStr = new Date(order.created_at).toLocaleString('id-ID');
    let shippingMeta = {};
    try {
      shippingMeta = order.shipping_meta ? JSON.parse(order.shipping_meta) : {};
    } catch {
      shippingMeta = {};
    }
    const productsSubtotal = Number(order.products_subtotal) || order.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const shippingFee = Number(order.shipping_fee) || 0;
    const shippingMethodLabel =
      shippingMeta.label ||
      (order.shipping_method === "store"
        ? "Kirim mobil toko"
        : order.shipping_method === "lalamove"
          ? "Lalamove"
          : order.shipping_method === "gosend"
            ? "GoSend"
            : order.shipping_method || "-");

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
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280; max-width: 300px; line-height: 1.4;">${companyAddress}</p>
            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #6b7280;">Telp: ${companyPhone} | Email: ${companyEmail}</p>
          </div>
        </div>
        <div class="invoice-meta">
          <h1>INVOICE</h1>
          <p><strong>Order ID:</strong> #${order.id}</p>
          <p><strong>Tanggal:</strong> ${dateStr}</p>
          <p><strong>Status:</strong> <span style="color: #059669; font-weight: 600;">${order.status.toUpperCase()}</span></p>
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
        </div>
        <div>
          <h3>Info Pembayaran</h3>
          <p><strong>Metode Pembayaran:</strong> ${order.payment_method === 'qris' ? 'QRIS' : order.payment_method}</p>
          ${order.payment_method === 'qris' && settings?.qrisImageUrl ? `
            <div style="margin-top: 15px; padding: 15px; background: #fff; border-radius: 8px; border: 1px dashed #2563eb; text-align: center;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #1f2937;">Scan Barcode QRIS di bawah ini:</p>
              <img src="${settings.qrisImageUrl}" alt="QRIS Barcode" style="max-width: 100%; max-height: 250px; border-radius: 8px; margin: 0 auto; display: block;">
            </div>
          ` : ''}
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
        <p style="margin: 4px 0;">Ongkir: ${formatRupiah(shippingFee)}</p>
        <p style="margin: 12px 0 0; font-size: 1.15rem; font-weight: 700;">TOTAL KESELURUHAN: <span style="color: #2563eb;">${formatRupiah(order.total)}</span></p>
      </div>
      
      <div style="margin-top: 40px; font-size: 0.85rem; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        <p>Terima kasih atas pesanan Anda.</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
      </div>
    `;

    currentOrderId = order.id;
    document.title = `Invoice_Order_${order.id}`;
    setInvoiceActionsEnabled(true);

  } catch (error) {
    currentOrderId = null;
    setInvoiceActionsEnabled(false);
    invoiceContainer.innerHTML = `<div style="color:red; text-align:center;">Gagal memuat invoice: ${error.message}</div>`;
  }
}

loadInvoice();
