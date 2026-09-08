let myOrdersCache = [];
let myOrdersFilter = "all";

const ordersList = document.getElementById("ordersList");
const ordersMessage = document.getElementById("ordersMessage");
const ordersSearch = document.getElementById("ordersSearch");
const ordersFilterBar = document.getElementById("ordersFilterBar");

function paymentMethodLabel(method) {
  const map = { transfer: "Transfer Bank", qris: "QRIS", cod: "COD", ewallet: "E-Wallet" };
  return map[String(method || "").toLowerCase()] || method || "-";
}

function orderStatusInfo(status) {
  const st = String(status || "").toLowerCase();
  if (st === "paid") return { key: "paid", label: "Lunas" };
  if (st === "void") return { key: "void", label: "Dibatalkan" };
  return { key: "unpaid", label: "Belum dibayar" };
}

function shippingLabel(order) {
  try {
    const meta = order.shipping_meta ? JSON.parse(order.shipping_meta) : {};
    if (meta?.label) return meta.label;
  } catch {
    /* ignore */
  }
  const method = order.shipping_method;
  if (method === "pickup") return "Ambil sendiri";
  if (method === "store") return "Kirim mobil toko";
  if (method === "lalamove") return "Lalamove";
  if (method === "gosend") return "GoSend";
  return method || "-";
}

function canUploadProof(order) {
  const st = String(order.status || "").toLowerCase();
  const method = String(order.payment_method || "").toLowerCase();
  return st !== "paid" && st !== "void" && method !== "cod";
}

async function openPaymentProof(orderId) {
  const token = getToken();
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

function filteredOrders() {
  const q = String(ordersSearch?.value || "").trim().toLowerCase();
  return myOrdersCache.filter((order) => {
    const st = String(order.status || "unpaid").toLowerCase();
    if (myOrdersFilter !== "all" && st !== myOrdersFilter) return false;
    if (!q) return true;
    const hay = [
      `#${order.id}`,
      order.customer_name,
      order.customer_address,
      order.payment_method,
      shippingLabel(order),
      ...(order.items || []).map((item) => item.productName),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function renderOrders() {
  if (!ordersList) return;
  const rows = filteredOrders();
  if (!myOrdersCache.length) {
    ordersList.innerHTML = `<p class="empty-state">Belum ada pesanan. Belanja dulu di <a href="/shop.html">katalog</a>.</p>`;
    return;
  }
  if (!rows.length) {
    ordersList.innerHTML = `<p class="empty-state">Tidak ada pesanan yang cocok dengan filter.</p>`;
    return;
  }

  ordersList.innerHTML = rows
    .map((order) => {
      const status = orderStatusInfo(order.status);
      const items = Array.isArray(order.items) ? order.items : [];
      const itemsHtml = items
        .map((item) => {
          const name = escapeHtml(item.productName || "Produk");
          const size = item.size ? ` (${escapeHtml(item.size)})` : "";
          return `<li><span>${name}${size} × ${Number(item.qty) || 1}</span><span>${formatRupiah(item.subtotal)}</span></li>`;
        })
        .join("");
      const proofNote = order.hasPaymentProof
        ? `<span style="color:#047857;">Bukti bayar sudah diunggah${
            order.paymentProofAt ? ` · ${new Date(order.paymentProofAt).toLocaleString("id-ID")}` : ""
          }</span>`
        : canUploadProof(order)
          ? `<span style="color:#c2410c;">Belum ada bukti bayar</span>`
          : "";
      const uploadHtml = canUploadProof(order)
        ? `<div class="my-order-upload">
            <label for="proofFile-${order.id}" style="font-size:0.88rem;font-weight:600;">Unggah bukti bayar (JPG/PNG/PDF)</label>
            <input type="file" id="proofFile-${order.id}" accept="image/png,image/jpeg,image/webp,application/pdf" />
            <button type="button" class="btn-primary" data-action="upload-proof" data-order-id="${order.id}">Kirim bukti</button>
            <span class="empty-state" data-upload-msg="${order.id}"></span>
          </div>`
        : "";

      return `<article class="my-order-card" id="order-${order.id}">
        <div class="my-order-top">
          <div>
            <strong>Invoice #${order.id}</strong>
            <p class="my-order-meta">${new Date(order.created_at).toLocaleString("id-ID")}</p>
            <p class="my-order-meta">Pembayaran: ${escapeHtml(paymentMethodLabel(order.payment_method))} · Pengiriman: ${escapeHtml(shippingLabel(order))} · ${escapeHtml(order.shipmentStatusLabel || "Menunggu proses")}</p>
            <p class="my-order-meta">${escapeHtml(order.customer_address || "")}</p>
            <p class="my-order-meta">${proofNote}</p>
            ${
              String(order.status || "").toLowerCase() === "unpaid" &&
              order.paymentTimeoutEnabled &&
              order.paymentDueAt
                ? `<p class="my-order-meta" style="color:#c2410c;">Bayar sebelum ${new Date(
                    order.paymentDueAt
                  ).toLocaleString("id-ID")} atau pesanan dibatalkan otomatis${
                    order.paymentTimeoutLabel ? ` (${escapeHtml(order.paymentTimeoutLabel)})` : ""
                  }.</p>`
                : String(order.voidReason || "") === "timeout"
                  ? `<p class="my-order-meta">Dibatalkan otomatis karena melewati batas waktu bayar.</p>`
                  : ""
            }
          </div>
          <span class="my-order-badge ${status.key}">${status.label}</span>
        </div>
        <ul class="my-order-items">${itemsHtml}</ul>
        <p class="my-order-total">Total ${formatRupiah(order.total)}${order.shipping_fee ? ` · ongkir ${formatRupiah(order.shipping_fee)}` : ""}</p>
        <div class="my-order-actions">
          <a href="/invoice.html?id=${order.id}" class="btn-primary" target="_blank" rel="noopener">Buka Invoice</a>
          <a href="/lacak.html?id=${order.id}" class="btn-secondary">Lacak pengiriman</a>
          ${
            order.hasPaymentProof
              ? `<button type="button" class="btn-secondary" data-action="view-proof" data-order-id="${order.id}">Lihat bukti bayar</button>`
              : ""
          }
        </div>
        ${uploadHtml}
      </article>`;
    })
    .join("");
}

async function loadMyOrders() {
  if (!getAuth()?.token) {
    window.location.href = "/login.html";
    return;
  }
  try {
    myOrdersCache = await apiFetch("/orders/my");
    if (!Array.isArray(myOrdersCache)) myOrdersCache = [];
    if (ordersMessage) ordersMessage.textContent = "";
    renderOrders();
    const focusId = new URLSearchParams(window.location.search).get("id");
    if (focusId) {
      document.getElementById(`order-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    if (ordersMessage) ordersMessage.textContent = error.message;
    if (ordersList) ordersList.innerHTML = `<p class="empty-state">Gagal memuat pesanan.</p>`;
  }
}

ordersFilterBar?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-filter]");
  if (!btn) return;
  myOrdersFilter = btn.dataset.filter;
  ordersFilterBar.querySelectorAll("button").forEach((el) => el.classList.toggle("active", el === btn));
  renderOrders();
});

ordersSearch?.addEventListener("input", () => renderOrders());

ordersList?.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  const orderId = btn.dataset.orderId;
  if (btn.dataset.action === "view-proof") {
    try {
      await openPaymentProof(orderId);
    } catch (error) {
      alert(error.message);
    }
    return;
  }
  if (btn.dataset.action === "upload-proof") {
    const fileInput = document.getElementById(`proofFile-${orderId}`);
    const msg = document.querySelector(`[data-upload-msg="${orderId}"]`);
    const file = fileInput?.files?.[0];
    if (!file) {
      if (msg) msg.textContent = "Pilih file bukti bayar dulu.";
      return;
    }
    if (msg) msg.textContent = "Mengunggah...";
    btn.disabled = true;
    try {
      const body = new FormData();
      body.append("proof", file);
      const token = getToken();
      const response = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Gagal mengunggah bukti bayar.");
      if (msg) msg.textContent = data.message || "Bukti terkirim.";
      await loadMyOrders();
    } catch (error) {
      if (msg) msg.textContent = error.message;
    } finally {
      btn.disabled = false;
    }
  }
});

loadMyOrders();
