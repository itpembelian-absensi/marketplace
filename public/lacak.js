const trackGuest = document.getElementById("trackGuest");
const trackLoggedIn = document.getElementById("trackLoggedIn");
const trackMyList = document.getElementById("trackMyList");
const trackSearch = document.getElementById("trackSearch");
const trackMessage = document.getElementById("trackMessage");
const trackHeadHint = document.getElementById("trackHeadHint");
const trackLoginBtn = document.getElementById("trackLoginBtn");

let trackOrdersCache = [];

function shippingLabelFromOrder(order) {
  try {
    const meta = order.shipping_meta ? JSON.parse(order.shipping_meta) : {};
    if (meta?.label) return meta.label;
  } catch {
    /* ignore */
  }
  return order.shipping_method || "-";
}

function renderSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) return "";
  return `<ol class="track-steps">${steps
    .map(
      (step) =>
        `<li class="${step.done ? "done" : ""} ${step.current ? "current" : ""}">${escapeHtml(step.label)}</li>`
    )
    .join("")}</ol>`;
}

function renderTrackCard(data) {
  const items = Array.isArray(data.items)
    ? data.items
        .map((item) => `${escapeHtml(item.productName || item.product_name || "Produk")}${item.size ? ` (${escapeHtml(item.size)})` : ""} × ${item.qty || 1}`)
        .join("<br/>")
    : "";
  const resi = data.trackingNumber
    ? `<p class="my-order-meta"><strong>No. resi:</strong> ${escapeHtml(data.trackingNumber)}${
        data.trackingUrl
          ? ` · <a href="${escapeHtml(data.trackingUrl)}" target="_blank" rel="noopener">Cek resi</a>`
          : ""
      }</p>`
    : `<p class="my-order-meta">Nomor resi belum diisi admin.</p>`;
  const orderId = data.orderId || data.id;
  return `<article class="my-order-card">
    <div class="my-order-top">
      <div>
        <strong>Invoice #${orderId}</strong>
        <p class="my-order-meta">${data.createdAt || data.created_at ? new Date(data.createdAt || data.created_at).toLocaleString("id-ID") : ""}</p>
        <p class="my-order-meta">Jasa kirim: ${escapeHtml(data.shippingLabel || data.shipping_method || "-")}</p>
        ${resi}
        ${data.shipmentNote ? `<p class="my-order-meta">${escapeHtml(data.shipmentNote)}</p>` : ""}
      </div>
      <span class="my-order-badge ${String(data.shipmentStatus || "") === "delivered" ? "paid" : String(data.shipmentStatus || "") === "cancelled" ? "void" : "unpaid"}">${escapeHtml(data.shipmentStatusLabel || "Menunggu proses")}</span>
    </div>
    ${items ? `<p class="my-order-meta" style="margin-top:10px;">${items}</p>` : ""}
    ${renderSteps(data.shipmentSteps)}
    <div class="my-order-actions"><a class="btn-secondary" href="/invoice.html?id=${orderId}">Buka invoice</a></div>
  </article>`;
}

function orderMatchesQuery(order, query) {
  if (!query) return true;
  const hay = [
    `#${order.id}`,
    String(order.id),
    order.customer_name,
    order.trackingNumber,
    order.shipmentStatusLabel,
    shippingLabelFromOrder(order),
    ...(order.items || []).map((item) => item.productName || item.product_name || ""),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function renderTrackList() {
  if (!trackMyList) return;
  const q = String(trackSearch?.value || "").trim().toLowerCase();
  const rows = trackOrdersCache.filter((order) => orderMatchesQuery(order, q));
  if (!trackOrdersCache.length) {
    trackMyList.innerHTML = `<p class="empty-state">Belum ada pesanan. Belanja dulu di <a href="/shop.html">katalog</a>.</p>`;
    return;
  }
  if (!rows.length) {
    trackMyList.innerHTML = `<p class="empty-state">Tidak ada pesanan yang cocok dengan pencarian.</p>`;
    return;
  }
  trackMyList.innerHTML = rows
    .map((order) =>
      renderTrackCard({
        ...order,
        orderId: order.id,
        createdAt: order.created_at,
        shippingLabel: shippingLabelFromOrder(order),
        items: order.items || [],
      })
    )
    .join("");
}

function showGuestView() {
  trackGuest?.classList.remove("hidden");
  trackLoggedIn?.classList.add("hidden");
  if (trackHeadHint) {
    trackHeadHint.textContent = "Masuk ke akun untuk melihat status pengiriman pesanan Anda.";
  }
}

function showLoggedInView() {
  trackGuest?.classList.add("hidden");
  trackLoggedIn?.classList.remove("hidden");
  if (trackHeadHint) {
    trackHeadHint.textContent = "Hanya pesanan akun Anda yang tampil di sini. Gunakan kolom cari untuk nomor invoice, nama produk, atau resi.";
  }
}

async function loadMyTrackableOrders() {
  if (!getAuth()?.token) {
    showGuestView();
    trackOrdersCache = [];
    return;
  }
  showLoggedInView();
  if (trackMyList) trackMyList.innerHTML = `<p class="empty-state">Memuat pesanan...</p>`;
  try {
    const orders = await apiFetch("/orders/my");
    trackOrdersCache = Array.isArray(orders) ? orders : [];
    const prefillId = new URLSearchParams(window.location.search).get("id");
    if (prefillId && trackSearch && !trackSearch.value) {
      trackSearch.value = prefillId;
    }
    renderTrackList();
  } catch (error) {
    if (trackMessage) trackMessage.textContent = error.message;
    trackMyList.innerHTML = `<p class="empty-state">Gagal memuat pesanan.</p>`;
  }
}

trackSearch?.addEventListener("input", () => renderTrackList());

trackLoginBtn?.addEventListener("click", () => {
  document.getElementById("topLoginLink")?.click();
});

if (typeof setAuth === "function") {
  const originalSetAuth = setAuth;
  setAuth = function wrappedSetAuth(auth) {
    originalSetAuth(auth);
    loadMyTrackableOrders();
  };
}

if (typeof clearAuth === "function") {
  const originalClearAuth = clearAuth;
  clearAuth = function wrappedClearAuth() {
    originalClearAuth();
    loadMyTrackableOrders();
  };
}

loadMyTrackableOrders();
