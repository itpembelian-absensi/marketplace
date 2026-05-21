const API_BASE = "/api";
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

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(product) {
  const cart = getCart();
  cart.push(product);
  setCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
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

async function renderBrandLogo() {
  const leftImg = document.getElementById("brandLogo");
  const topImg = document.getElementById("topLogo");
  if (!leftImg && !topImg) return;
  if (leftImg) leftImg.classList.add("hidden");
  if (topImg) topImg.classList.add("hidden");
}

async function renderHomeWatermark() {
  const path = window.location.pathname;
  const isHomePage = path === "/" || path === "/index.html";
  if (!isHomePage) return;

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

function renderUserArea() {
  const userArea = document.getElementById("userArea");
  const topLoginLink = document.getElementById("topLoginLink");
  if (!userArea) {
    return;
  }

  const auth = getAuth();
  if (!auth?.user) {
    if (topLoginLink) {
      topLoginLink.classList.remove("hidden");
    }
    userArea.innerHTML = `
      <a href="/login.html" class="btn-secondary">Login</a>
      <a href="/register.html" class="btn-primary">Register</a>
    `;
    return;
  }

  if (topLoginLink) {
    topLoginLink.classList.add("hidden");
  }

  const role = auth.user.role || "user";
  const adminLink =
    role === "admin" || role === "manager"
      ? `<a href="/admin.html" class="btn-secondary">Admin</a>`
      : "";

  userArea.innerHTML = `
    <span>Hi, ${auth.user.name} (${role})</span>
    ${adminLink}
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

function isShopPath() {
  const path = window.location.pathname;
  return path === "/shop.html" || path.endsWith("/shop.html");
}

function renderHeaderCartButton() {
  const cartButton = document.getElementById("cartButton");
  if (!cartButton) return;

  const refreshCount = () => {
    const cart = getCart();
    cartButton.textContent = `Keranjang (${cart.length})`;
  };

  refreshCount();
  window.addEventListener("storage", refreshCount);

  // Di halaman produk, klik keranjang dibuka oleh main.js (panel samping).
  // Redirect hanya untuk halaman lain (mis. beranda).
  if (!isShopPath()) {
    cartButton.addEventListener("click", () => {
      window.location.href = "/shop.html";
    });
  }
}

renderBrandLogo();
renderUserArea();
renderHomeWatermark();
renderHomeCompanyProfile();
renderHeaderCartButton();
