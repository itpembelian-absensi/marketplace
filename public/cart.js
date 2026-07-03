let products = [];
let selectedIndices = new Set();
let shippingQuoteState = null;
let checkoutDestCoords = null;
let cachedCheckoutAddresses = [];

const cartTableBody = document.getElementById("cartTableBody");
const cartSelectAll = document.getElementById("cartSelectAll");
const cartFooterCount = document.getElementById("cartFooterCount");
const cartFooterTotal = document.getElementById("cartFooterTotal");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");
const checkoutSection = document.getElementById("checkoutSection");
const checkoutNameInput = document.getElementById("checkoutName");
const checkoutPhoneInput = document.getElementById("checkoutPhone");
const checkoutAddressInput = document.getElementById("checkoutAddress");
const checkoutPaymentMethodSelect = document.getElementById("checkoutPaymentMethod");
const checkoutShippingMethodSelect = document.getElementById("checkoutShippingMethod");
const checkoutQuoteShippingBtn = document.getElementById("checkoutQuoteShippingBtn");
const checkoutUseGpsBtn = document.getElementById("checkoutUseGpsBtn");
const checkoutShippingMessage = document.getElementById("checkoutShippingMessage");
const checkoutShippingSummary = document.getElementById("checkoutShippingSummary");
const checkoutAddressSelect = document.getElementById("checkoutAddressSelect");
const checkoutAddressHint = document.getElementById("checkoutAddressHint");
const checkoutAddressBlock = document.getElementById("checkoutAddressBlock");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartShippingFee = document.getElementById("cartShippingFee");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");

function formatSku(line) {
  return `SJS-${String(line.id).padStart(5, "0")}`;
}

function getSelectedCart() {
  const cart = getCart();
  return cart.filter((_, index) => selectedIndices.has(index));
}

function syncSelectAllState() {
  const cart = getCart();
  if (!cartSelectAll) return;
  cartSelectAll.checked = cart.length > 0 && selectedIndices.size === cart.length;
  cartSelectAll.indeterminate =
    selectedIndices.size > 0 && selectedIndices.size < cart.length;
}

function updateFooterSummary() {
  const cart = getCart();
  const selected = getSelectedCart();
  const lineCount = selected.length;
  const total = getCartProductsSubtotal(cart, selectedIndices);

  if (cartFooterCount) cartFooterCount.textContent = String(lineCount);
  if (cartFooterTotal) cartFooterTotal.textContent = formatRupiah(total);
  if (confirmOrderBtn) confirmOrderBtn.disabled = lineCount === 0;

  if (checkoutSection && !checkoutSection.classList.contains("hidden")) {
    updateCheckoutTotalsDisplay();
  }
}

function updateCheckoutTotalsDisplay() {
  const cart = getCart();
  const subtotal = getCartProductsSubtotal(cart, selectedIndices);
  const shippingFee = shippingQuoteState?.fee ?? 0;
  if (cartSubtotal) cartSubtotal.textContent = formatRupiah(subtotal);
  if (cartShippingFee) {
    cartShippingFee.textContent = shippingQuoteState ? formatRupiah(shippingFee) : "—";
  }
  if (cartTotal) {
    cartTotal.textContent = formatRupiah(subtotal + (shippingQuoteState ? shippingFee : 0));
  }
}

function renderCartTable() {
  const cart = getCart();
  refreshHeaderCartBadge();

  if (!cart.length) {
    selectedIndices = new Set();
    if (cartTableBody) {
      cartTableBody.innerHTML = `
        <div class="cart-empty-wrap">
          <p class="cart-empty-state">Keranjang masih kosong.</p>
          <a href="/shop.html" class="btn-primary cart-empty-cta">Belanja Sekarang</a>
        </div>
      `;
    }
    updateFooterSummary();
    syncSelectAllState();
    return;
  }

  const validIndices = new Set(cart.map((_, index) => index));
  selectedIndices = new Set([...selectedIndices].filter((index) => validIndices.has(index)));
  if (!selectedIndices.size) {
    cart.forEach((_, index) => selectedIndices.add(index));
  }

  cartTableBody.innerHTML = cart
    .map((line, index) => {
      const product = products.find((item) => item.id === Number(line.id));
      const unitPrice = getCartLineUnitPrice(line);
      const lineTotal = unitPrice * (line.qty || 1);
      const maxStock = getCartLineAvailableStock(line, product);
      const imageSrc = line.image || "/logo-sjs.png";
      const variant = line.selectedSize || "—";
      const checked = selectedIndices.has(index) ? "checked" : "";

      return `
        <article class="cart-table-row" data-line-index="${index}">
          <label class="cart-col-check cart-row-check">
            <input type="checkbox" class="cart-item-check" data-line-index="${index}" ${checked} />
          </label>
          <div class="cart-col-image">
            <img src="${imageSrc}" alt="${line.name || "Produk"}" class="cart-row-image" />
          </div>
          <div class="cart-col-name">
            <a href="/product.html?id=${line.id}" class="cart-row-name">${line.name || "Produk"}</a>
            <button type="button" class="cart-row-remove" data-line-index="${index}">Hapus</button>
          </div>
          <div class="cart-col-sku">${formatSku(line)}</div>
          <div class="cart-col-variant">${variant}</div>
          <div class="cart-col-unit">${formatRupiah(unitPrice)}</div>
          <div class="cart-col-qty">
            <div class="cart-qty-control">
              <button type="button" class="cart-qty-minus" data-line-index="${index}" aria-label="Kurangi">−</button>
              <input type="number" class="cart-qty-input" data-line-index="${index}" value="${line.qty || 1}" min="1" max="${Math.max(1, maxStock)}" inputmode="numeric" />
              <button type="button" class="cart-qty-plus" data-line-index="${index}" aria-label="Tambah">+</button>
            </div>
          </div>
          <div class="cart-col-total">${formatRupiah(lineTotal)}</div>
        </article>
      `;
    })
    .join("");

  updateFooterSummary();
  syncSelectAllState();
}

async function loadProductsForCart() {
  try {
    const productData = await apiFetch("/products");
    products = Array.isArray(productData) ? productData : [];
  } catch {
    products = [];
  }
  renderCartTable();
}


function applyCheckoutAddress(addr) {
  if (!addr) return;
  if (checkoutNameInput) checkoutNameInput.value = addr.recipientName || "";
  if (checkoutPhoneInput) checkoutPhoneInput.value = addr.phone || "";
  if (checkoutAddressInput) checkoutAddressInput.value = addr.address || "";
  if (addr.lat != null && addr.lng != null && Number.isFinite(Number(addr.lat)) && Number.isFinite(Number(addr.lng))) {
    checkoutDestCoords = { lat: Number(addr.lat), lng: Number(addr.lng) };
  } else {
    checkoutDestCoords = null;
  }
  clearShippingQuote();
}

function fillCheckoutAddressSelect(addresses) {
  if (!checkoutAddressSelect) return;
  cachedCheckoutAddresses = Array.isArray(addresses) ? addresses : [];
  if (!getToken()) {
    checkoutAddressSelect.innerHTML = '<option value="manual">Isi alamat manual</option>';
    checkoutAddressSelect.value = "manual";
    if (checkoutAddressBlock) checkoutAddressBlock.classList.add("hidden");
    return;
  }
  if (checkoutAddressBlock) checkoutAddressBlock.classList.remove("hidden");
  if (!cachedCheckoutAddresses.length) {
    checkoutAddressSelect.innerHTML = '<option value="manual">+ Alamat lain (ketik manual)</option>';
    checkoutAddressSelect.value = "manual";
    if (checkoutAddressHint) {
      checkoutAddressHint.classList.remove("hidden");
      checkoutAddressHint.innerHTML =
        'Belum ada alamat. <a href="/addresses.html?action=new">Tambah di Master Alamat</a>.';
    }
    return;
  }
  if (checkoutAddressHint) checkoutAddressHint.classList.add("hidden");
  const options = cachedCheckoutAddresses
    .map((addr) => {
      const label = addr.label ? `${addr.label} — ` : "";
      const def = addr.isDefault ? " (Default)" : "";
      return `<option value="${addr.id}">${label}${addr.recipientName}${def}</option>`;
    })
    .join("");
  checkoutAddressSelect.innerHTML =
    options + '<option value="manual">+ Alamat lain (ketik manual)</option>';
  const defaultAddr = cachedCheckoutAddresses.find((a) => a.isDefault) || cachedCheckoutAddresses[0];
  checkoutAddressSelect.value = String(defaultAddr.id);
  applyCheckoutAddress(defaultAddr);
}

async function loadCheckoutAddresses() {
  if (!checkoutAddressSelect || !getToken()) {
    fillCheckoutAddressSelect([]);
    return;
  }
  try {
    const addresses = await apiFetch("/addresses");
    fillCheckoutAddressSelect(addresses);
  } catch {
    fillCheckoutAddressSelect([]);
  }
}

function handleCheckoutAddressSelectChange() {
  const val = checkoutAddressSelect?.value;
  if (!val || val === "manual") {
    checkoutDestCoords = null;
    clearShippingQuote();
    return;
  }
  const addr = cachedCheckoutAddresses.find((a) => String(a.id) === String(val));
  if (addr) applyCheckoutAddress(addr);
}

function clearShippingQuote() {
  shippingQuoteState = null;
  if (checkoutShippingMessage) {
    checkoutShippingMessage.textContent = "";
    checkoutShippingMessage.classList.remove("success");
  }
  if (checkoutShippingSummary) {
    checkoutShippingSummary.textContent = "";
    checkoutShippingSummary.classList.add("empty-state");
  }
  updateCheckoutTotalsDisplay();
}

async function loadShippingOptions() {
  if (!checkoutShippingMethodSelect) return;
  try {
    const data = await apiFetch("/shipping/options");
    const options = Array.isArray(data?.options) ? data.options : [];
    checkoutShippingMethodSelect.innerHTML =
      '<option value="">— Pilih jasa kirim —</option>' +
      options.map((opt) => `<option value="${opt.id}">${opt.label}</option>`).join("");
  } catch {
    checkoutShippingMethodSelect.innerHTML = `
      <option value="">— Pilih jasa kirim —</option>
      <option value="store">Kirim mobil toko</option>
      <option value="lalamove">Lalamove</option>
      <option value="gosend">GoSend</option>
    `;
  }
}

async function handleQuoteShipping() {
  if (!checkoutShippingMethodSelect) return;
  const method = checkoutShippingMethodSelect.value;
  const address = checkoutAddressInput?.value.trim() || "";
  if (!method) {
    alert("Pilih jasa kirim terlebih dahulu.");
    return;
  }
  if (method !== "store" && !address && !checkoutDestCoords) {
    alert("Isi alamat pengiriman atau gunakan GPS.");
    return;
  }

  if (checkoutShippingMessage) checkoutShippingMessage.textContent = "Menghitung ongkir...";
  if (checkoutQuoteShippingBtn) checkoutQuoteShippingBtn.disabled = true;

  try {
    const cart = getCart();
    const quote = await apiFetch("/shipping/quote", {
      method: "POST",
      body: JSON.stringify({
        method,
        address,
        destLat: checkoutDestCoords?.lat,
        destLng: checkoutDestCoords?.lng,
        productsSubtotal: getCartProductsSubtotal(cart, selectedIndices),
      }),
    });
    shippingQuoteState = {
      method,
      fee: Number(quote.fee) || 0,
      label: quote.label || method,
      estimated: Boolean(quote.estimated),
      note: quote.note || "",
    };
    if (checkoutShippingMessage) {
      checkoutShippingMessage.classList.add("success");
      checkoutShippingMessage.textContent = quote.estimated
        ? "Estimasi ongkir (bukan tarif final mitra)."
        : "Ongkir berhasil dihitung.";
    }
    if (checkoutShippingSummary) {
      checkoutShippingSummary.classList.remove("empty-state");
      const estTag = quote.estimated ? " (estimasi)" : "";
      checkoutShippingSummary.textContent = `${quote.label}${estTag}: ${formatRupiah(quote.fee)}${quote.note ? ` — ${quote.note}` : ""}`;
    }
    updateCheckoutTotalsDisplay();
  } catch (error) {
    clearShippingQuote();
    if (checkoutShippingMessage) {
      checkoutShippingMessage.classList.remove("success");
      checkoutShippingMessage.textContent = error.message;
    }
  } finally {
    if (checkoutQuoteShippingBtn) checkoutQuoteShippingBtn.disabled = false;
  }
}

function handleUseGps() {
  if (!navigator.geolocation) {
    alert("Browser tidak mendukung GPS.");
    return;
  }
  checkoutUseGpsBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      checkoutDestCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      clearShippingQuote();
      if (checkoutShippingMessage) {
        checkoutShippingMessage.classList.add("success");
        checkoutShippingMessage.textContent = `Koordinat GPS: ${checkoutDestCoords.lat.toFixed(5)}, ${checkoutDestCoords.lng.toFixed(5)}`;
      }
      checkoutUseGpsBtn.disabled = false;
    },
    () => {
      alert("Gagal mengambil lokasi GPS. Izinkan akses lokasi di browser.");
      checkoutUseGpsBtn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

function getCheckoutItemsFromSelection() {
  const cart = getCart();
  return cart
    .map((line, index) => ({ line, index }))
    .filter(({ index }) => selectedIndices.has(index))
    .map(({ line }) => ({
      id: Number(line.id),
      size: String(line.selectedSize || "").trim(),
      qty: resolveCartQty(line),
    }));
}

async function handleCheckout() {
  const cart = getCart();
  const selected = getSelectedCart();
  if (!selected.length) {
    alert("Pilih minimal satu produk untuk checkout.");
    return;
  }

  if (!getToken()) {
    alert("Silakan login dulu untuk checkout.");
    window.location.href = "/login.html?redirect=/cart.html";
    return;
  }

  try {
    const customerName = checkoutNameInput?.value.trim() || "";
    const customerPhone = checkoutPhoneInput?.value.trim() || "";
    const customerAddress = checkoutAddressInput?.value.trim() || "";
    const paymentMethod = checkoutPaymentMethodSelect?.value || "";
    const shippingMethod = checkoutShippingMethodSelect?.value || "";
    if (!customerName || !customerPhone || !customerAddress || !paymentMethod) {
      alert("Lengkapi nama, telepon, alamat, dan metode pembayaran.");
      return;
    }
    if (!shippingMethod || !shippingQuoteState || shippingQuoteState.method !== shippingMethod) {
      alert("Pilih jasa kirim dan klik Hitung ongkir terlebih dahulu.");
      return;
    }

    const checkoutItems = getCheckoutItemsFromSelection();
    const totalQty = checkoutItems.reduce((sum, item) => sum + item.qty, 0);
    const confirmLines = checkoutItems
      .map((item) => {
        const line = cart.find(
          (c, idx) =>
            selectedIndices.has(idx) &&
            Number(c.id) === item.id &&
            String(c.selectedSize || "").trim() === item.size
        );
        const label = line?.name || `Produk #${item.id}`;
        const sizeLabel = item.size ? ` (${item.size})` : "";
        return `• ${label}${sizeLabel}: ${item.qty} item`;
      })
      .join("\n");
    const subtotal = getCartProductsSubtotal(cart, selectedIndices);
    const confirmed = window.confirm(
      `Konfirmasi pesanan (${totalQty} item):\n\n${confirmLines}\n\nSubtotal: ${formatRupiah(subtotal)}\nOngkir (${shippingQuoteState.label}): ${formatRupiah(shippingQuoteState.fee)}\nTotal: ${formatRupiah(subtotal + shippingQuoteState.fee)}\n\nLanjutkan pembayaran?`
    );
    if (!confirmed) return;

    const result = await apiFetch("/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: checkoutItems,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        shippingMethod,
        shippingFee: shippingQuoteState.fee,
        destLat: checkoutDestCoords?.lat,
        destLng: checkoutDestCoords?.lng,
      }),
    });

    const remaining = cart.filter((_, index) => !selectedIndices.has(index));
    setCart(remaining);
    clearShippingQuote();
    checkoutDestCoords = null;
    if (checkoutShippingMethodSelect) checkoutShippingMethodSelect.value = "";
    if (checkoutNameInput) checkoutNameInput.value = "";
    if (checkoutSection) checkoutSection.classList.add("hidden");

    if (result.pointsEarned && result.pointsEarned > 0) {
      alert(`Pembayaran berhasil! Anda mendapatkan ${result.pointsEarned} poin loyalitas dari pembelian ini.`);
    }
    window.location.href = `/invoice.html?id=${result.orderId}`;
  } catch (error) {
    alert(error.message);
  }
}

function handleConfirmOrder() {
  if (!getSelectedCart().length) {
    alert("Pilih minimal satu produk.");
    return;
  }
  if (!getToken()) {
    alert("Silakan login dulu untuk melanjutkan pesanan.");
    window.location.href = "/login.html?redirect=/cart.html";
    return;
  }
  if (checkoutSection) {
    checkoutSection.classList.remove("hidden");
    updateCheckoutTotalsDisplay();
    checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  loadCheckoutAddresses();
}

function handleCartTableClick(event) {
  const target = event.target;

  const removeBtn = target.closest(".cart-row-remove");
  if (removeBtn) {
    const index = Number(removeBtn.dataset.lineIndex);
    removeFromCart(index);
    renderCartTable();
    return;
  }

  const minusBtn = target.closest(".cart-qty-minus");
  if (minusBtn) {
    const index = Number(minusBtn.dataset.lineIndex);
    const cart = getCart();
    const line = cart[index];
    if (line) updateCartLineQty(index, (line.qty || 1) - 1);
    renderCartTable();
    return;
  }

  const plusBtn = target.closest(".cart-qty-plus");
  if (plusBtn) {
    const index = Number(plusBtn.dataset.lineIndex);
    const cart = getCart();
    const line = cart[index];
    if (!line) return;
    const product = products.find((item) => item.id === Number(line.id));
    const availableStock = getCartLineAvailableStock(line, product);
    if ((line.qty || 1) >= availableStock) {
      alert(`Stok maksimum untuk item ini: ${availableStock}`);
      return;
    }
    updateCartLineQty(index, (line.qty || 1) + 1);
    renderCartTable();
    return;
  }

  const check = target.closest(".cart-item-check");
  if (check) {
    const index = Number(check.dataset.lineIndex);
    if (check.checked) selectedIndices.add(index);
    else selectedIndices.delete(index);
    updateFooterSummary();
    syncSelectAllState();
  }
}

function handleCartQtyChange(event) {
  const target = event.target;
  if (!target.classList.contains("cart-qty-input")) return;
  const index = Number(target.dataset.lineIndex);
  const cart = getCart();
  const line = cart[index];
  if (!line) return;

  let newQty = parseInt(target.value, 10) || 1;
  const product = products.find((item) => item.id === Number(line.id));
  const availableStock = getCartLineAvailableStock(line, product);
  if (newQty > availableStock) {
    alert(`Stok maksimum untuk item ini: ${availableStock}`);
    newQty = availableStock;
  }
  if (newQty < 1) newQty = 1;
  updateCartLineQty(index, newQty);
  renderCartTable();
}

if (cartSelectAll) {
  cartSelectAll.addEventListener("change", () => {
    const cart = getCart();
    if (cartSelectAll.checked) {
      cart.forEach((_, index) => selectedIndices.add(index));
    } else {
      selectedIndices.clear();
    }
    renderCartTable();
  });
}

if (cartTableBody) {
  cartTableBody.addEventListener("click", handleCartTableClick);
  cartTableBody.addEventListener("change", handleCartQtyChange);
}

if (confirmOrderBtn) confirmOrderBtn.addEventListener("click", handleConfirmOrder);
if (checkoutButton) checkoutButton.addEventListener("click", handleCheckout);
if (checkoutQuoteShippingBtn) checkoutQuoteShippingBtn.addEventListener("click", handleQuoteShipping);
if (checkoutUseGpsBtn) checkoutUseGpsBtn.addEventListener("click", handleUseGps);
if (checkoutShippingMethodSelect) {
  checkoutShippingMethodSelect.addEventListener("change", clearShippingQuote);
}
if (checkoutAddressInput) {
  checkoutAddressInput.addEventListener("input", () => {
    checkoutDestCoords = null;
    clearShippingQuote();
    if (checkoutAddressSelect && checkoutAddressSelect.value !== "manual") {
      checkoutAddressSelect.value = "manual";
    }
  });
}
if (checkoutAddressSelect) {
  checkoutAddressSelect.addEventListener("change", handleCheckoutAddressSelectChange);
}

window.addEventListener("pageshow", () => {
  loadProductsForCart();
});

renderUserArea();
loadShippingOptions();
loadProductsForCart();
