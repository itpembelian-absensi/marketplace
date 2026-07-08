const API_BASE = "/api";
const DEFAULT_LOGO_URL = "/logo-sjs.png";
const CART_STORAGE_KEY = "marketplace_cart";
const AUTH_STORAGE_KEY = "marketplace_auth";
const SETTINGS_CACHE_KEY = "marketplace_settings_cache";
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number || 0);
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInlineMarkdown(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function formatProductDescription(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const blocks = raw.split(/\n\s*\n/);
  const parts = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;

    const isList = lines.every((line) => /^[-•]\s+/.test(line));
    if (isList) {
      const items = lines.map((line) => {
        const content = line.replace(/^[-•]\s+/, "");
        return `<li>${formatInlineMarkdown(content)}</li>`;
      });
      parts.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (lines.length === 1) {
      const line = lines[0];
      const headingMatch = line.match(/^#{2,3}\s+(.+)$/);
      if (headingMatch) {
        parts.push(`<h3 class="product-desc-heading">${formatInlineMarkdown(headingMatch[1])}</h3>`);
        continue;
      }
      if (/^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(line)) {
        parts.push(`<h3 class="product-desc-heading">${formatInlineMarkdown(line)}</h3>`);
        continue;
      }
    }

    const paragraphHtml = lines.map((line) => formatInlineMarkdown(line)).join("<br>");
    parts.push(`<p>${paragraphHtml}</p>`);
  }

  return parts.join("");
}

function getProductImages(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length) {
    return product.images.filter(Boolean);
  }
  if (typeof product.images === "string" && product.images.trim()) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length) return parsed.filter(Boolean);
    } catch {
      // ignore invalid JSON
    }
  }
  return product.image ? [product.image] : [];
}

function getCartLineKey(item) {
  return `${Number(item.id)}::${String(item.selectedSize || "").trim()}`;
}

function normalizeCartLine(item) {
  return {
    id: Number(item.id),
    name: item.name,
    image: item.image,
    category: item.category,
    subcategory: item.subcategory,
    price: item.price,
    discount: item.discount,
    stock: item.stock,
    sizes: item.sizes,
    selectedSize: String(item.selectedSize || "").trim(),
    selectedSizePrice: item.selectedSizePrice,
    stock_sjs: Math.max(0, Number(item.stock_sjs) || 0),
    stock_sjl: Math.max(0, Number(item.stock_sjl) || 0),
    qty: Math.max(1, Number(item.qty) || 1),
  };
}

function normalizeCart(rawCart) {
  if (!Array.isArray(rawCart) || !rawCart.length) return [];

  const grouped = new Map();
  rawCart.forEach((item) => {
    if (!item || Number.isNaN(Number(item.id))) return;
    const key = getCartLineKey(item);
    const qtyToAdd = item.qty !== undefined && item.qty !== null ? Math.max(1, Number(item.qty) || 1) : 1;
    if (grouped.has(key)) {
      grouped.get(key).qty += qtyToAdd;
      return;
    }
    grouped.set(key, normalizeCartLine({ ...item, qty: qtyToAdd }));
  });
  return Array.from(grouped.values());
}

function getCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    const normalized = normalizeCart(raw);
    if (raw.length && raw.some((item) => item.qty === undefined || item.qty === null)) {
      setCart(normalized);
    }
    return normalized;
  } catch (error) {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizeCart(cart)));
}

function getCartTotalQty(cart = getCart()) {
  return cart.reduce((sum, line) => sum + (line.qty || 1), 0);
}

function resolveCartQty(product, qty) {
  const parsed = Number(qty ?? product?.qty);
  return Math.max(1, Number.isFinite(parsed) ? parsed : 1);
}

function addToCart(product, qty) {
  const cart = getCart();
  const amount = resolveCartQty(product, qty);
  const key = getCartLineKey(product);
  const existing = cart.find((line) => getCartLineKey(line) === key);
  if (existing) {
    existing.qty += amount;
    if (product.stock_sjs !== undefined || product.stock_sjl !== undefined) {
      existing.stock_sjs = Math.max(0, Number(product.stock_sjs) || 0);
      existing.stock_sjl = Math.max(0, Number(product.stock_sjl) || 0);
    }
  } else {
    cart.push(normalizeCartLine({ ...product, qty: amount }));
  }
  setCart(cart);
}

function getCheckoutItemsFromCart(cart = getCart()) {
  return cart.map((line) => ({
    id: Number(line.id),
    size: String(line.selectedSize || "").trim(),
    qty: resolveCartQty(line),
  }));
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  setCart(cart);
}

function updateCartLineQty(index, qty) {
  const cart = getCart();
  if (index < 0 || index >= cart.length) return;
  const newQty = Math.max(0, parseInt(String(qty).trim(), 10) || 0);
  if (newQty <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].qty = newQty;
  }
  setCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
}

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function setAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getToken() {
  const auth = getAuth();
  return auth?.token || "";
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Server mengembalikan format tidak valid. Coba restart server (npm start) lalu refresh halaman."
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404 && String(data.message || "").includes("Endpoint API")) {
      throw new Error(
        "Endpoint belum aktif di server. Hentikan proses Node lama, jalankan ulang npm start, lalu refresh halaman admin."
      );
    }
    throw new Error(data.message || "Request gagal.");
  }
  return data;
}

async function loadSettings() {
  try {
    const cachedRaw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached?.ts && Date.now() - cached.ts < SETTINGS_CACHE_TTL_MS) {
        return cached.data || {};
      }
    }
  } catch (error) {
    // ignore cache errors
  }

  const data = await apiFetch("/settings");
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (error) {
    // ignore
  }
  return data;
}

async function renderLandingHeader() {
  const isLandingHeader =
    document.body.classList.contains("landing-page") || document.body.classList.contains("shop-page");
  if (!isLandingHeader) return;

  try {
    const settings = await loadSettings();
    const profile = settings?.companyProfile || {};
    const home = settings?.homePage || {};
    const nameEl = document.getElementById("companyNameText");
    const taglineEl = document.getElementById("companyTaglineText");
    if (nameEl && profile.name) nameEl.textContent = profile.name;
    if (taglineEl) {
      taglineEl.textContent = home.tagline || profile.tagline || taglineEl.textContent;
    }
  } catch (error) {
    // ignore
  }
}

async function renderBrandLogo() {
  const leftImg = document.getElementById("brandLogo");
  const topImg = document.getElementById("topLogo");
  const fallbackEl = document.getElementById("brandFallback");
  if (!leftImg && !topImg) return;

  let logoUrl = DEFAULT_LOGO_URL;
  try {
    const settings = await loadSettings();
    if (settings?.logoUrl) logoUrl = settings.logoUrl;
  } catch (error) {
    // use default logo
  }

  if (leftImg) {
    leftImg.src = logoUrl;
    leftImg.classList.remove("hidden");
  }
  if (topImg) {
    topImg.src = logoUrl;
    topImg.classList.remove("hidden");
  }
  if (fallbackEl) fallbackEl.classList.add("hidden");
}

async function renderHomeWatermark() {
  const path = window.location.pathname;
  const isHomePage = path === "/" || path === "/index.html";
  if (!isHomePage || document.body.classList.contains("landing-page")) return;

  try {
    const settings = await loadSettings();
    if (!settings?.logoUrl) return;
    document.body.style.setProperty("--home-watermark-image", `url("${settings.logoUrl}")`);
    document.body.classList.add("home-watermark-enabled");
  } catch (error) {
    // ignore
  }
}

async function renderHomeCompanyProfile() {
  const aboutEl = document.getElementById("companyAboutText");
  const visionEl = document.getElementById("companyVisionText");
  const missionEl = document.getElementById("companyMissionText");
  const emailEl = document.getElementById("companyEmailText");
  const phoneEl = document.getElementById("companyPhoneText");
  const addressEl = document.getElementById("companyAddressText");

  if (!aboutEl && !visionEl && !missionEl && !emailEl && !phoneEl && !addressEl) {
    return;
  }

  try {
    const settings = await loadSettings();
    const profile = settings?.companyProfile || {};
    if (aboutEl && profile.about) aboutEl.textContent = profile.about;
    if (visionEl && profile.vision) visionEl.textContent = profile.vision;
    if (missionEl && profile.mission) missionEl.textContent = profile.mission;
    if (emailEl && profile.email) emailEl.textContent = profile.email;
    if (phoneEl && profile.phone) phoneEl.textContent = profile.phone;
    if (addressEl && profile.address) addressEl.textContent = profile.address;
  } catch (error) {
    // ignore
  }
}

async function renderHeroBanners() {
  const bannerMainDiv = document.getElementById("bannerMainDiv");
  const bannerSide1Div = document.getElementById("bannerSide1Div");
  const bannerSide2Div = document.getElementById("bannerSide2Div");
  
  if (!bannerMainDiv && !bannerSide1Div && !bannerSide2Div) {
    return;
  }

  try {
    const settings = await loadSettings();
    const banners = settings?.heroBanners || {};

      const applyBanner = (divId, linkId, data) => {
        const div = document.getElementById(divId);
        const link = document.getElementById(linkId);
        if (div && data && data.imageUrl) {
          div.textContent = ""; // remove placeholder text
          const isVideo = data.imageUrl.toLowerCase().match(/\.(mp4|webm|ogg)$/);
          if (isVideo) {
            div.style.position = "relative";
            div.style.overflow = "hidden";
            div.style.backgroundImage = "none";
            div.style.backgroundColor = "transparent";
            div.innerHTML = `<video src="${data.imageUrl}" autoplay loop muted playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none;"></video>`;
          } else {
            div.innerHTML = "";
            div.style.backgroundImage = `url("${data.imageUrl}")`;
            div.style.backgroundSize = "cover";
            div.style.backgroundPosition = "center";
          }
        }
      if (link && data && data.link) {
        link.href = data.link;
      } else if (link) {
        link.removeAttribute("href"); // prevent default # click if no link
        link.style.cursor = "default";
      }
    };

    applyBanner("bannerMainDiv", "bannerMainLink", banners.main);
    applyBanner("bannerSide1Div", "bannerSide1Link", banners.side1);
    applyBanner("bannerSide2Div", "bannerSide2Link", banners.side2);
  } catch (error) {
    // ignore
  }
}

function renderUserArea() {
  const userArea = document.getElementById("userArea");
  const topLoginLink = document.getElementById("topLoginLink");
  const profileWrap = document.getElementById("profileWrap");
  const topProfileLink = document.getElementById("topProfileLink");
  const profileDropdownName = document.getElementById("profileDropdownName");
  const profileAdminLink = document.getElementById("profileAdminLink");
  const isLandingHeader = document.body.classList.contains("landing-page") || document.body.classList.contains("shop-page");

  if (!userArea && !topLoginLink) {
    return;
  }

  const auth = getAuth();
  if (!auth?.user) {
    if (topLoginLink) topLoginLink.classList.remove("hidden");
    if (profileWrap) profileWrap.classList.add("hidden");
    if (userArea) {
      if (isLandingHeader) {
        userArea.innerHTML = "";
      } else {
        userArea.innerHTML = `
          <a href="/login.html" class="btn-secondary">Login</a>
          <a href="/register.html" class="btn-primary">Register</a>
        `;
      }
    }
    return;
  }

  if (topLoginLink) topLoginLink.classList.add("hidden");
  if (profileWrap) profileWrap.classList.remove("hidden");

  const role = auth.user.role || "user";

  const profilePic = auth.user.profile_picture
    ? `<img src="${auth.user.profile_picture}" alt="Profile" />`
    : `<span class="sjs-profile-initial">${auth.user.name.charAt(0).toUpperCase()}</span>`;

  if (isLandingHeader) {
    if (topProfileLink) {
      topProfileLink.innerHTML = profilePic;
    }
    if (profileDropdownName) {
      profileDropdownName.textContent = auth.user.name;
    }
    if (profileAdminLink) {
      profileAdminLink.classList.toggle("hidden", role !== "admin" && role !== "manager");
    }
    if (userArea) userArea.innerHTML = "";
    return;
  }

  if (profileWrap) profileWrap.classList.add("hidden");

  if (!userArea) return;

  const profilePicOld = auth.user.profile_picture
    ? `<img src="${auth.user.profile_picture}" alt="Profile" class="user-avatar-small" />`
    : `<div class="user-avatar-placeholder">${auth.user.name.charAt(0).toUpperCase()}</div>`;

  userArea.innerHTML = `
    <a href="/profile.html" class="user-profile-link" title="Buka Profil">
      ${profilePicOld}
      <span>Hi, ${auth.user.name}</span>
    </a>
    <a href="/addresses.html" class="btn-secondary" title="Master alamat kirim">Alamat</a>
    <button id="logoutButton" class="btn-danger">Logout</button>
  `;

  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearAuth();
      window.location.reload();
    });
  }
}

function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) {
    window.location.href = "/login.html";
    return;
  }
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("headerLoginEmail")?.focus();
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  const msg = document.getElementById("headerLoginMessage");
  if (msg) {
    msg.textContent = "";
    msg.classList.remove("success");
  }
}

function toggleProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  if (!dropdown) return;
  dropdown.classList.toggle("hidden");
}

function initLandingAuth() {
  const isLandingHeader =
    document.body.classList.contains("landing-page") || document.body.classList.contains("shop-page");
  if (!isLandingHeader) return;

  const topLoginLink = document.getElementById("topLoginLink");
  const authModal = document.getElementById("authModal");
  if (!authModal) return;

  topLoginLink?.addEventListener("click", openAuthModal);
  document.getElementById("authModalClose")?.addEventListener("click", closeAuthModal);
  document.getElementById("authModalBackdrop")?.addEventListener("click", closeAuthModal);

  document.getElementById("headerLogoutBtn")?.addEventListener("click", () => {
    clearAuth();
    window.location.reload();
  });

  document.addEventListener("click", (e) => {
    const profileLink = e.target.closest("#topProfileLink");
    if (profileLink) {
      e.stopPropagation();
      toggleProfileDropdown();
      return;
    }

    const wrap = document.getElementById("profileWrap");
    const dropdown = document.getElementById("profileDropdown");
    if (wrap && dropdown && !wrap.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  const loginForm = document.getElementById("headerLoginForm");
  const loginMessage = document.getElementById("headerLoginMessage");
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loginMessage) {
      loginMessage.textContent = "";
      loginMessage.classList.remove("success");
    }
    const email = document.getElementById("headerLoginEmail")?.value.trim();
    const password = document.getElementById("headerLoginPassword")?.value;
    try {
      const result = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(result);
      closeAuthModal();
      renderUserArea();
    } catch (error) {
      if (loginMessage) loginMessage.textContent = error.message;
    }
  });

  initHeaderGoogleAuth();
}

async function initHeaderGoogleAuth() {
  const container = document.getElementById("headerGoogleSignIn");
  if (!container) return;
  try {
    const res = await apiFetch("/settings/google-client-id");
    if (!res.clientId) return;

    const handleGoogle = async (response) => {
      const loginMessage = document.getElementById("headerLoginMessage");
      if (loginMessage) loginMessage.textContent = "Memproses login Google...";
      try {
        const result = await apiFetch("/auth/google", {
          method: "POST",
          body: JSON.stringify({ credential: response.credential }),
        });
        setAuth(result);
        closeAuthModal();
        renderUserArea();
      } catch (error) {
        if (loginMessage) loginMessage.textContent = error.message;
      }
    };

    const renderBtn = () => {
      if (!window.google?.accounts?.id) return;
      google.accounts.id.initialize({ client_id: res.clientId, callback: handleGoogle });
      google.accounts.id.renderButton(container, { theme: "outline", size: "large", text: "signin_with" });
    };

    if (window.google?.accounts?.id) {
      renderBtn();
    } else {
      window.addEventListener("load", renderBtn, { once: true });
    }
  } catch (error) {
    // Google login optional
  }
}

function getCartLineUnitPrice(line) {
  if (line.selectedSizePrice) {
    return calcFinalPriceCommon(line.selectedSizePrice, line.discount);
  }
  return calcFinalPriceCommon(line.price, line.discount);
}

function getCartProductsSubtotal(cart = getCart(), selectedIndices = null) {
  return cart.reduce((sum, line, index) => {
    if (selectedIndices && !selectedIndices.has(index)) return sum;
    return sum + getCartLineUnitPrice(line) * (line.qty || 1);
  }, 0);
}

function refreshHeaderCartBadge() {
  const cartButton = document.getElementById("cartButton");
  const cartBadge = document.getElementById("cartCountBadge");
  if (!cartButton) return;
  const qty = getCartTotalQty();
  if (cartBadge) {
    cartBadge.textContent = qty;
    cartBadge.style.display = qty > 0 ? "flex" : "none";
  } else {
    cartButton.textContent = `Keranjang (${qty})`;
  }
}

function goToCartPage() {
  window.location.href = "/cart.html";
}

function isShopPath() {
  const path = window.location.pathname;
  return path === "/shop.html" || path === "/shop" || path.endsWith("/shop.html");
}

function renderHeaderCartButton() {
  const cartButton = document.getElementById("cartButton");
  if (!cartButton) return;

  refreshHeaderCartBadge();
  window.addEventListener("storage", refreshHeaderCartBadge);
  cartButton.addEventListener("click", goToCartPage);
}

function parseSizes(product) {
  if (!product.sizes) return [];
  try {
    const parsed = typeof product.sizes === "string" ? JSON.parse(product.sizes) : product.sizes;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function normalizeDiscountCommon(discount) {
  const num = Number(discount);
  if (Number.isNaN(num)) return 0;
  return Math.min(95, Math.max(0, Math.round(num)));
}

function calcFinalPriceCommon(price, discount) {
  const d = normalizeDiscountCommon(discount);
  return Math.round((Number(price || 0) * (100 - d)) / 100);
}

function getProductBasePrice(product) {
  const sizes = parseSizes(product);
  if (sizes.length > 0 && Number(sizes[0].price) > 0) {
    return Number(sizes[0].price);
  }
  return Number(product.selectedSizePrice || product.price) || 0;
}

function getProductFinalPrice(product) {
  return calcFinalPriceCommon(getProductBasePrice(product), product.discount);
}

function getSizeItemStock(sizeItem) {
  const stockSjs = Math.max(0, Number(sizeItem?.stock_sjs) || 0);
  const stockSjl = Math.max(0, Number(sizeItem?.stock_sjl) || 0);
  return stockSjs + stockSjl;
}

function findSizeOption(sizes, sizeName) {
  const target = String(sizeName || "").trim();
  if (!target || !Array.isArray(sizes)) return null;
  return (
    sizes.find((item) => String(item.size || "").trim() === target) ||
    sizes.find((item) => String(item.size || "").trim().toLowerCase() === target.toLowerCase()) ||
    null
  );
}

function getProductAvailableStock(product, chosenSize) {
  if (chosenSize) {
    if (chosenSize.stock_sjs !== undefined || chosenSize.stock_sjl !== undefined) {
      return getSizeItemStock(chosenSize);
    }
    const matched = findSizeOption(parseSizes(product), chosenSize.size);
    if (matched) return getSizeItemStock(matched);
    return getSizeItemStock(chosenSize);
  }
  const sizes = parseSizes(product);
  if (sizes.length > 0) return getSizeItemStock(sizes[0]);
  return Math.max(0, Number(product.stock) || 0);
}

function getCartLineAvailableStock(line, product) {
  if (!line) return 0;
  const sizeName = String(line.selectedSize || "").trim();

  if (product && sizeName) {
    const matched = findSizeOption(parseSizes(product), sizeName);
    if (matched) return getSizeItemStock(matched);
    return 0;
  }

  if (sizeName) {
    return getSizeItemStock(line);
  }

  if (product) {
    const stockSjs = Math.max(0, Number(product.stock_sjs) || 0);
    const stockSjl = Math.max(0, Number(product.stock_sjl) || 0);
    return stockSjs + stockSjl || Math.max(0, Number(product.stock) || 0);
  }

  return Math.max(0, Number(line.stock) || 0);
}

function buildCartLineFromProduct(product, chosenSize, qty = 1) {
  const line = normalizeCartLine({
    ...product,
    selectedSize: chosenSize?.size || "",
    selectedSizePrice: chosenSize?.price,
    qty,
  });
  if (chosenSize) {
    const matched = findSizeOption(parseSizes(product), chosenSize.size) || chosenSize;
    line.stock_sjs = Math.max(0, Number(matched.stock_sjs) || 0);
    line.stock_sjl = Math.max(0, Number(matched.stock_sjl) || 0);
    line.selectedSizePrice = Number(matched.price) || line.selectedSizePrice;
  } else {
    line.stock_sjs = Math.max(0, Number(product.stock_sjs) || 0);
    line.stock_sjl = Math.max(0, Number(product.stock_sjl) || 0);
  }
  return line;
}

function countCartQtyForProduct(cart, productId, sizeName) {
  const key = `${Number(productId)}::${String(sizeName || "").trim()}`;
  const line = cart.find((item) => getCartLineKey(item) === key);
  return line ? line.qty : 0;
}

function showAddToCartModal(product, callback) {
  const sizes = parseSizes(product);
  
  // Remove any existing modal
  const existing = document.getElementById("sizeSelectionModal");
  if (existing) existing.remove();

  const discount = normalizeDiscountCommon(product.discount);

  const overlay = document.createElement("div");
  overlay.id = "sizeSelectionModal";
  overlay.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease;";

  const modal = document.createElement("div");
  modal.style.cssText = "background: #fff; border-radius: 14px; padding: 24px; max-width: 440px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25);";

  let html = `
    <div style="display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px;">
      <img src="${product.image}" alt="${product.name}" style="width: 90px; height: 90px; object-fit: cover; border-radius: 10px; border: 1px solid #e5e7eb; flex-shrink: 0;" />
      <div style="flex: 1; min-width: 0;">
        <h3 style="margin: 0 0 4px; font-size: 1.15rem; color: #111827;">Tambahkan ke Keranjang</h3>
        <p class="modal-selected-size-text" style="margin: 0; font-size: 0.88rem; color: #6b7280; word-break: break-word;">${sizes.length > 0 && sizes[0] ? sizes[0].size : product.name}</p>
      </div>
    </div>
  `;

  if (sizes.length > 0) {
    html += `<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
      <p style="margin: 0; font-size: 0.9rem; font-weight: 600; color: #374151;">Pilih Ukuran:</p>
    `;
    sizes.forEach((s, i) => {
      const finalPrice = calcFinalPriceCommon(s.price, product.discount);
      const itemStock = getSizeItemStock(s);
      const stockColor = itemStock > 0 ? "#059669" : "#dc2626";
      const discountLabel = discount > 0 ? `<span style="text-decoration: line-through; color: #9ca3af; font-size: 0.82rem; margin-left: 6px;">${formatRupiah(s.price)}</span> <span style="color: #059669; font-size: 0.78rem;">-${discount}%</span>` : "";
      html += `
        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: border-color 0.15s, background 0.15s;" class="size-option-label" data-index="${i}">
          <input type="radio" name="sizeSelection" value="${i}" style="accent-color: #2563eb; width: 18px; height: 18px;" ${i === 0 ? "checked" : ""} />
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: #111827; font-size: 0.95rem; word-break: break-word;">${s.size}</div>
            <div style="font-size: 0.8rem; color: ${stockColor}; margin-top: 2px; font-weight: 500;">Stok: ${itemStock}</div>
          </div>
          <div style="text-align: right; color: #2563eb; font-weight: 700; font-size: 0.9rem; white-space: nowrap;">
            ${formatRupiah(finalPrice)} ${discountLabel}
          </div>
        </label>
      `;
    });
    html += `</div>`;
  } else {
    const finalPrice = getProductFinalPrice(product);
    const discountLabel =
      discount > 0
        ? `<span style="text-decoration: line-through; color: #9ca3af; font-size: 0.82rem; margin-left: 6px;">${formatRupiah(product.price)}</span> <span style="color: #059669; font-size: 0.78rem;">-${discount}%</span>`
        : "";
    html += `<p style="margin: 0 0 16px; font-weight: 700; color: #2563eb; font-size: 0.95rem;">${formatRupiah(finalPrice)} ${discountLabel}</p>`;
  }

  const initialStock = getProductAvailableStock(product, sizes[0] || null);
  html += `
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 8px; font-size: 0.9rem; font-weight: 600; color: #374151;">Jumlah:</p>
      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="modalQtyMinus" type="button" style="width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>
        <input id="modalQtyInput" type="number" inputmode="numeric" value="1" min="1" max="${Math.max(1, initialStock)}" style="width: 72px; height: 36px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px; font-weight: 600;" aria-label="Jumlah pesanan" />
        <button id="modalQtyPlus" type="button" style="width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
        <span id="modalRemainingStock" style="font-size: 0.85rem; color: #6b7280; margin-left: 8px;">Tersisa: ${initialStock}</span>
      </div>
    </div>
  `;

  html += `
    <div style="display: flex; gap: 10px; margin-top: 18px;">
      <button id="sizeModalCancel" type="button" style="flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: #374151;">Batal</button>
      <button id="sizeModalConfirm" type="button" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; font-size: 0.9rem; font-weight: 600;">Simpan</button>
    </div>
  `;
  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Qty Logic
  const qtyInput = modal.querySelector("#modalQtyInput");

  function clampModalQty() {
    const max = Math.max(1, parseInt(qtyInput.max, 10) || 1);
    let val = parseInt(String(qtyInput.value).trim(), 10);
    if (Number.isNaN(val) || val < 1) val = 1;
    if (val > max) val = max;
    qtyInput.value = val;
    return val;
  }

  modal.querySelector("#modalQtyMinus").addEventListener("click", () => {
    const current = clampModalQty();
    if (current > 1) qtyInput.value = current - 1;
  });
  modal.querySelector("#modalQtyPlus").addEventListener("click", () => {
    const max = Math.max(1, parseInt(qtyInput.max, 10) || 1);
    const current = clampModalQty();
    if (current < max) qtyInput.value = current + 1;
  });
  qtyInput.addEventListener("blur", clampModalQty);
  qtyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      clampModalQty();
    }
  });

  const remainingStockEl = modal.querySelector("#modalRemainingStock");

  function updateQtyForSelectedSize() {
    const selected = modal.querySelector("input[name='sizeSelection']:checked");
    const chosen = selected ? sizes[Number(selected.value)] : null;
    const stock = getProductAvailableStock(product, chosen);
    qtyInput.max = Math.max(1, stock);
    if (parseInt(qtyInput.value, 10) > stock) {
      qtyInput.value = stock > 0 ? stock : 1;
    }
    if (remainingStockEl) {
      remainingStockEl.textContent = `Tersisa: ${stock}`;
      remainingStockEl.style.color = stock > 0 ? "#6b7280" : "#dc2626";
    }
    return stock;
  }

  // Size Logic
  if (sizes.length > 0) {
    const labels = modal.querySelectorAll(".size-option-label");
    const radios = modal.querySelectorAll("input[name='sizeSelection']");
    const selectedSizeTextEl = modal.querySelector(".modal-selected-size-text");

    function highlightSelected() {
      labels.forEach((lbl) => {
        const radio = lbl.querySelector("input[type='radio']");
        if (radio && radio.checked) {
          lbl.style.borderColor = "#2563eb";
          lbl.style.background = "#eff6ff";
          if (selectedSizeTextEl) {
            const idx = Number(radio.value);
            selectedSizeTextEl.textContent = sizes[idx] ? sizes[idx].size : product.name;
          }
        } else {
          lbl.style.borderColor = "#e5e7eb";
          lbl.style.background = "#fff";
        }
      });
      updateQtyForSelectedSize();
    }
    highlightSelected();

    radios.forEach((r) => r.addEventListener("change", highlightSelected));
    labels.forEach((lbl) => lbl.addEventListener("click", () => {
      const radio = lbl.querySelector("input[type='radio']");
      if (radio) { radio.checked = true; highlightSelected(); }
    }));
  }

  modal.querySelector("#sizeModalCancel").addEventListener("click", () => {
    overlay.remove();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  modal.querySelector("#sizeModalConfirm").addEventListener("click", () => {
    let chosenSize = null;
    if (sizes.length > 0) {
      const selected = modal.querySelector("input[name='sizeSelection']:checked");
      if (selected) {
        const idx = Number(selected.value);
        chosenSize = sizes[idx];
      }
    }
    const qty = clampModalQty();
    overlay.remove();
    callback(chosenSize, qty);
  });
}

renderBrandLogo();
renderLandingHeader();
renderUserArea();
initLandingAuth();
renderHomeWatermark();
renderHomeCompanyProfile();
renderHeaderCartButton();
renderHeroBanners();
