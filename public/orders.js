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

function formatPurchaseDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "-";
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function orderPublicCode(order) {
  const date = new Date(order.created_at);
  const seq = String(order.id).padStart(4, "0");
  if (Number.isNaN(date.getTime())) return `SJS-${seq}`;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `SJS${yy}${mm}${dd}-${seq}`;
}

function orderStage(order) {
  const status = String(order.status || "").toLowerCase();
  const ship = String(order.shipmentStatus || "pending");
  if (status === "void" || ship === "cancelled") return "void";
  if (status !== "paid") return "unpaid";
  if (ship === "delivered") return "done";
  if (ship === "shipped" || ship === "ready_pickup") return "shipped";
  return "processing";
}

function stageBadge(stage, order) {
  if (stage === "void") return { label: "Dibatalkan", className: "is-void" };
  if (stage === "unpaid") return { label: "Menunggu Bayar", className: "is-wait" };
  if (stage === "done") return { label: "Selesai", className: "is-done" };
  if (stage === "shipped") {
    return {
      label: order.shipping_method === "pickup" ? "Siap Diambil" : "Dikirim",
      className: "is-shipped",
    };
  }
  return { label: "Diproses", className: "is-pack" };
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
    if (myOrdersFilter !== "all" && orderStage(order) !== myOrdersFilter) return false;
    if (!q) return true;
    const hay = [
      `#${order.id}`,
      orderPublicCode(order),
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
      const stage = orderStage(order);
      const badge = stageBadge(stage, order);
      const items = Array.isArray(order.items) ? order.items : [];
      const shown = items.slice(0, 3);
      const extra = items.length - shown.length;
      const thumbs = shown
        .map((item) =>
          item.image
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.productName || "Produk")}" />`
            : `<span class="hist-thumb"></span>`
        )
        .join("");
      const more = extra > 0 ? `<span class="hist-more">+${extra} produk lainnya</span>` : "";
      return `<article class="hist-card" id="order-${order.id}">
        <header class="hist-head">
          <p><span>No. Pesanan</span><strong>#${escapeHtml(orderPublicCode(order))}</strong></p>
          <p><span>Tanggal Pembelian</span><strong>${escapeHtml(formatPurchaseDate(order.created_at))}</strong></p>
          <em class="hist-badge ${badge.className}">${badge.label}</em>
        </header>
        <div class="hist-body">
          <div class="hist-thumbs">${thumbs}${more}</div>
          <div class="hist-pay">
            <span>Total pembayaran</span>
            <strong>${formatRupiah(order.total)}</strong>
            <small>Via ${escapeHtml(paymentMethodLabel(order.payment_method))}</small>
          </div>
          <a class="hist-detail" href="/invoice.html?id=${order.id}">Lihat Detail</a>
        </div>
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
