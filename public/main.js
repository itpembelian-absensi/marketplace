let products = [];

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("headerSearchInput") || document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const categoryRail = document.getElementById("categoryRail");
const activeFilterText = document.getElementById("activeFilterText");
const catalogPager = document.getElementById("catalogPager");

const isShopPage = Boolean(productGrid && sortSelect && categoryRail);
const CATALOG_PAGE_SIZE = 16;
let catalogPage = 1;

const selected = {
  category: "all",
  subcategory: "all",
};

let promoOnly = false;

function isPromoProduct(product) {
  return normalizeDiscount(product.discount) > 0;
}

function syncPromoFromUrl() {
  const params = new URLSearchParams(window.location.search);
  promoOnly = params.get("promo") === "1";
  updateShopNavState();
  updateShopSectionTitle();
}

function clearPromoMode(updateUrl = true) {
  if (!promoOnly) return;
  promoOnly = false;
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.delete("promo");
    const next = url.search ? `${url.pathname}${url.search}` : url.pathname;
    window.history.replaceState({}, "", next);
  }
  updateShopNavState();
  updateShopSectionTitle();
}

function updateShopNavState() {
  if (!isShopPage) return;
  const promoLink = document.querySelector(".sjs-nav-promo");
  const allLink = document.querySelector(".sjs-nav-produk, .sjs-nav-all");
  if (promoLink) promoLink.classList.toggle("sjs-nav-active", promoOnly);
  if (allLink) allLink.classList.toggle("sjs-nav-active", !promoOnly);
}

function updateShopSectionTitle() {
  const title = document.getElementById("catalogTitle");
  if (!title) return;
  title.textContent = promoOnly ? "Promo Spesial" : "Temukan Material yang Tepat";
}

function normalizeDiscount(discount) {
  const num = Number(discount);
  if (Number.isNaN(num)) return 0;
  return Math.min(95, Math.max(0, Math.round(num)));
}

function getFinalPrice(product) {
  if (product.selectedSizePrice) {
    const discount = normalizeDiscount(product.discount);
    return Math.round((Number(product.selectedSizePrice) * (100 - discount)) / 100);
  }
  return getProductFinalPrice(product);
}

function getWhatsAppUrl(phone, productName) {
  const cleaned = String(phone || "").replace(/[^\d]/g, "");
  if (!cleaned) return "";
  const message = encodeURIComponent(`Halo, saya ingin tanya produk: ${productName}`);
  return `https://wa.me/${cleaned}?text=${message}`;
}

const CATEGORY_THUMBS = [
  [/plywood/i, "/home/cat-plywood.jpg"],
  [/particle/i, "/home/cat-particle.jpg"],
  [/mdf/i, "/home/cat-mdf.jpg"],
  [/hmr/i, "/home/cat-hmr.jpg"],
  [/block/i, "/home/banner-blockboard.jpg"],
  [/hpl/i, "/home/show-hpl.jpg"],
];

function categoryThumb(name) {
  const known = CATEGORY_THUMBS.find(([pattern]) => pattern.test(name));
  if (known) return known[1];
  const sample = products.find((item) => item.category === name && item.image);
  return sample?.image || "";
}

function renderCategoryRail() {
  if (!isShopPage) return;
  const menu = Array.isArray(window.__menuCategories) ? window.__menuCategories : [];
  const preferred = ["Plywood", "Particle Board", "MDF", "HMR", "Block Board", "HPL", "ACP", "A PANEL"];
  const rank = (name) => {
    const index = preferred.findIndex((item) => item.toLowerCase() === String(name).toLowerCase());
    return index === -1 ? 99 : index;
  };
  const fromMenu = menu
    .filter((cat) => Number(cat.count) > 0 || products.some((item) => item.category === cat.name))
    .map((cat) => cat.name)
    .filter(Boolean);
  const names = (fromMenu.length
    ? fromMenu
    : Array.from(new Set(products.map((item) => item.category || "Lainnya")))
  ).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "id"));
  const allThumb = products.find((item) => item.image)?.image || "/home/cat-plywood.jpg";
  const chips = [{ name: "Semua Produk", cat: "all", image: allThumb }].concat(
    names.map((name) => ({ name, cat: name, image: categoryThumb(name) }))
  );

  const scrollLeft = categoryRail.scrollLeft;
  categoryRail.innerHTML = chips
    .map((chip) => {
      const active = selected.category === chip.cat ? " is-active" : "";
      const image = chip.image
        ? `<img src="${escapeHtml(chip.image)}" alt="" />`
        : `<span class="catalog-cat-fallback">${escapeHtml(chip.name.slice(0, 1))}</span>`;
      return `
        <button type="button" class="catalog-cat${active}" data-cat="${escapeHtml(chip.cat)}">
          <span class="catalog-cat-thumb">${image}</span>
          <span class="catalog-cat-name">${escapeHtml(chip.name)}</span>
        </button>`;
    })
    .join("");
  categoryRail.scrollLeft = scrollLeft;
}

function renderActiveFilterText() {
  if (!activeFilterText) return;
  const keyword = searchInput?.value.trim() || "";
  if (promoOnly && keyword) {
    activeFilterText.textContent = `Promo Spesial untuk “${keyword}”`;
    return;
  }
  if (promoOnly) {
    activeFilterText.textContent = "Menampilkan produk yang sedang promo.";
    return;
  }
  if (keyword) {
    activeFilterText.textContent = `Hasil untuk “${keyword}”`;
    return;
  }
  activeFilterText.textContent = "";
}

function getFilteredProducts() {
  if (!isShopPage) return [];
  const keyword = (searchInput?.value || "").toLowerCase().trim();
  const selectedSort = sortSelect.value;

  let result = products.filter((product) => {
    const haystack = `${product.name || ""} ${product.category || ""} ${product.subcategory || ""}`.toLowerCase();
    const matchesSearch = !keyword || haystack.includes(keyword);
    const matchesCategory = selected.category === "all" || product.category === selected.category;
    const matchesSub =
      selected.subcategory === "all" || (product.subcategory || "Umum") === selected.subcategory;
    const matchesPromo = !promoOnly || isPromoProduct(product);
    return matchesSearch && matchesCategory && matchesSub && matchesPromo;
  });

  if (selectedSort === "priceAsc") {
    result = [...result].sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
  } else if (selectedSort === "priceDesc") {
    result = [...result].sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
  } else if (selectedSort === "ratingDesc") {
    result = [...result].sort((a, b) => Number(b.rating) - Number(a.rating));
  }

  return result;
}

function formatThickness(product) {
  const nums = [];
  const sources = parseSizes(product).map((item) => String(item.size || ""));
  sources.push(String(product.name || ""));
  sources.forEach((text) => {
    const matches = text.match(/(\d+(?:[.,]\d+)?)\s*mm/gi) || [];
    matches.forEach((match) => {
      const value = Number(match.replace(/mm/i, "").replace(",", ".").trim());
      if (value > 0 && value < 80) nums.push(value);
    });
  });
  if (!nums.length) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const label = (value) => (Number.isInteger(value) ? String(value) : String(value).replace(".", ","));
  if (min === max) return `Tebal ${label(min)} mm`;
  return `Tebal ${label(min)} – ${label(max)} mm`;
}

function productSpecLine(product) {
  const thick = formatThickness(product);
  const brand = product.subcategory && product.subcategory !== "Umum" ? product.subcategory : "";
  if (thick && brand) return `${thick} · ${brand}`;
  return thick || brand || product.category || "";
}

function renderCatalogCard(product) {
  const discount = normalizeDiscount(product.discount);
  const finalPrice = getFinalPrice(product);
  const rating = Number(product.rating);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "";
  const outOfStock = (product.stock || 0) <= 0;
  const spec = productSpecLine(product);
  const wasPrice =
    discount > 0
      ? `<p class="catalog-was"><s>${formatRupiah(getProductBasePrice(product))}</s> Diskon ${discount}%</p>`
      : "";

  return `
    <a class="catalog-card${outOfStock ? " is-out" : ""}" href="/product.html?id=${product.id}">
      <span class="catalog-card-media">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
        ${outOfStock ? `<span class="catalog-stock">Stok habis</span>` : ""}
      </span>
      <span class="catalog-card-body">
        ${spec ? `<span class="catalog-spec">${escapeHtml(spec)}</span>` : ""}
        <span class="catalog-name">${escapeHtml(product.name)}</span>
        <span class="catalog-price">${formatRupiah(finalPrice)}</span>
        ${wasPrice}
        ${
          ratingLabel
            ? `<span class="catalog-rating"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2.6l2.7 6.3 6.8.6-5.2 4.5 1.6 6.6L12 17.8 6.1 20.6l1.6-6.6L2.5 9.5l6.8-.6L12 2.6z"/></svg>${ratingLabel}</span>`
            : ""
        }
      </span>
    </a>`;
}

function renderPager(pageCount) {
  if (!catalogPager) return;
  if (pageCount <= 1) {
    catalogPager.innerHTML = "";
    catalogPager.hidden = true;
    return;
  }
  catalogPager.hidden = false;
  const pages = pageCount <= 7
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : (() => {
        const set = new Set([1, pageCount, catalogPage - 1, catalogPage, catalogPage + 1].filter((n) => n >= 1 && n <= pageCount));
        const list = [...set].sort((a, b) => a - b);
        const out = [];
        list.forEach((page, index) => {
          if (index && page - list[index - 1] > 1) out.push("…");
          out.push(page);
        });
        return out;
      })();
  const prevDisabled = catalogPage <= 1 ? " disabled" : "";
  const nextDisabled = catalogPage >= pageCount ? " disabled" : "";
  catalogPager.innerHTML = `
    <button type="button" data-page="prev" aria-label="Halaman sebelumnya"${prevDisabled}>‹</button>
    ${pages
      .map((page) =>
        page === "…"
          ? `<span class="catalog-ellipsis">…</span>`
          : `<button type="button" data-page="${page}" class="${page === catalogPage ? "is-current" : ""}">${page}</button>`
      )
      .join("")}
    <button type="button" data-page="next" aria-label="Halaman berikutnya"${nextDisabled}>›</button>`;
}

function renderProducts() {
  if (!isShopPage) return;
  renderActiveFilterText();
  const filtered = getFilteredProducts();
  const pageCount = Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE));
  if (catalogPage > pageCount) catalogPage = pageCount;

  if (!filtered.length) {
    productGrid.innerHTML = `<p class="catalog-empty">${promoOnly ? "Tidak ada produk promo saat ini." : "Produk tidak ditemukan."}</p>`;
    renderPager(0);
    return;
  }

  const start = (catalogPage - 1) * CATALOG_PAGE_SIZE;
  productGrid.innerHTML = filtered.slice(start, start + CATALOG_PAGE_SIZE).map(renderCatalogCard).join("");
  renderPager(pageCount);
}

function refreshCartLineStocks() {
  const cart = getCart();
  let changed = false;
  cart.forEach((line) => {
    const product = products.find((item) => item.id === Number(line.id));
    if (!product) return;
    const sizeName = String(line.selectedSize || "").trim();
    if (sizeName) {
      const matched = findSizeOption(parseSizes(product), sizeName);
      if (matched) {
        const stockSjs = Math.max(0, Number(matched.stock_sjs) || 0);
        const stockSjl = Math.max(0, Number(matched.stock_sjl) || 0);
        if (line.stock_sjs !== stockSjs || line.stock_sjl !== stockSjl) {
          line.stock_sjs = stockSjs;
          line.stock_sjl = stockSjl;
          changed = true;
        }
      }
    } else {
      const stockSjs = Math.max(0, Number(product.stock_sjs) || 0);
      const stockSjl = Math.max(0, Number(product.stock_sjl) || 0);
      if (line.stock_sjs !== stockSjs || line.stock_sjl !== stockSjl) {
        line.stock_sjs = stockSjs;
        line.stock_sjl = stockSjl;
        changed = true;
      }
    }
  });
  if (changed) setCart(cart);
}

function handleAddToCart(productId, chosenSize, qty = 1) {
  if (!isShopPage) return false;
  const product = products.find((item) => item.id === Number(productId));
  if (!product) {
    return false;
  }
  
  const cart = getCart();
  const sizeName = chosenSize?.size || null;
  const availableStock = getProductAvailableStock(product, chosenSize);
  const qtyInCart = countCartQtyForProduct(cart, product.id, sizeName);
  if (availableStock < qtyInCart + qty) {
    alert(`Maaf, stok tidak mencukupi untuk menambah ${qty} item. (Tersisa: ${availableStock}, Di keranjang: ${qtyInCart})`);
    return false;
  }

  const cartItem = buildCartLineFromProduct(product, chosenSize, qty);
  addToCart(cartItem);
  refreshHeaderCartBadge();
  return true;
}

async function loadProducts() {
  if (!isShopPage) return;
  productGrid.innerHTML = '<p class="empty-state">Memuat produk...</p>';
  try {
    try {
      window.__menuCategories = await apiFetch("/categories");
    } catch (error) {
      window.__menuCategories = null;
    }

    const productData = await apiFetch("/products");
    products = Array.isArray(productData) ? productData : [];

    try {
      renderCategoryRail();
    } catch (error) {
      categoryRail.innerHTML = `<p class="catalog-empty">Gagal memuat kategori.</p>`;
    }

    refreshCartLineStocks();
    renderProducts();
    refreshHeaderCartBadge();
  } catch (error) {
    products = [];
    productGrid.innerHTML = `<p class="catalog-empty">${error.message}</p>`;
    categoryRail.innerHTML = "";
  }
}

if (isShopPage) {
  window.addEventListener("pageshow", () => {
    syncPromoFromUrl();
    loadProducts();
  });

  window.addEventListener("focus", () => {
    if (products.length) {
      refreshCartLineStocks();
      refreshHeaderCartBadge();
    }
  });

  categoryRail.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-cat]");
    if (!btn) return;
    selected.category = btn.dataset.cat || "all";
    selected.subcategory = "all";
    catalogPage = 1;
    renderCategoryRail();
    renderProducts();
  });

  document.getElementById("catPrev")?.addEventListener("click", () => {
    categoryRail.scrollBy({ left: -320, behavior: "smooth" });
  });
  document.getElementById("catNext")?.addEventListener("click", () => {
    categoryRail.scrollBy({ left: 320, behavior: "smooth" });
  });

  catalogPager?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;
    const target = btn.dataset.page;
    const pageCount = Math.max(1, Math.ceil(getFilteredProducts().length / CATALOG_PAGE_SIZE));
    if (target === "prev") catalogPage = Math.max(1, catalogPage - 1);
    else if (target === "next") catalogPage = Math.min(pageCount, catalogPage + 1);
    else catalogPage = Number(target) || 1;
    renderProducts();
    document.getElementById("catalogTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  searchInput?.addEventListener("input", () => {
    catalogPage = 1;
    renderProducts();
  });
  document.getElementById("headerSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    catalogPage = 1;
    renderProducts();
  });
  sortSelect.addEventListener("change", () => {
    catalogPage = 1;
    renderProducts();
  });

  const urlQuery = new URLSearchParams(window.location.search).get("q");
  if (urlQuery && searchInput) {
    searchInput.value = urlQuery;
  }

  syncPromoFromUrl();

  renderUserArea();
  refreshHeaderCartBadge();
  loadProducts();
} else {
  renderUserArea();
}
