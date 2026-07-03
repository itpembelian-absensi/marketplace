let products = [];

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const categorySidebar = document.getElementById("categorySidebar");
const clearCategoryButton = document.getElementById("clearCategory");
const activeFilterText = document.getElementById("activeFilterText");
const shopSectionTitle = document.getElementById("shopSectionTitle");

const isShopPage = Boolean(productGrid && searchInput && sortSelect && categorySidebar);

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
  const allLink = document.querySelector(".sjs-nav-all");
  if (promoLink) promoLink.classList.toggle("sjs-nav-active", promoOnly);
  if (allLink) allLink.classList.toggle("sjs-nav-active", !promoOnly);
}

function updateShopSectionTitle() {
  if (!shopSectionTitle) return;
  shopSectionTitle.textContent = promoOnly ? "Promo Spesial" : "Daftar Produk";
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

function buildCategoryTree(items) {
  const tree = new Map();
  items.forEach((p) => {
    const cat = p.category || "Lainnya";
    const sub = p.subcategory || "Umum";
    if (!tree.has(cat)) tree.set(cat, new Map());
    const subMap = tree.get(cat);
    subMap.set(sub, (subMap.get(sub) || 0) + 1);
  });
  return tree;
}

function renderSidebar() {
  if (!isShopPage) return;
  // prefer menu from DB (api/categories) if available
  const menu = window.__menuCategories || null;
  if (menu && Array.isArray(menu) && menu.length) {
    const totalAll = menu.reduce((sum, c) => sum + Number(c.count || 0), 0);
    categorySidebar.innerHTML = `
      <button class="cat-item ${selected.category === "all" ? "active" : ""}" data-cat="all" data-sub="all">
        Semua Produk
        <small>${totalAll} item</small>
      </button>
      ${menu
        .map((cat) => {
          const subs = (cat.subcategories || []).slice().sort((a, b) => a.name.localeCompare(b.name, "id"));
          const total = Number(cat.count || 0);
          return `
            <details class="cat-group" ${selected.category === cat.name ? "open" : ""}>
              <summary class="cat-summary">${cat.name} <span style="color:#6b7280; font-weight:400">(${total})</span></summary>
              <div class="cat-list">
                <button class="cat-item ${
                  selected.category === cat.name && selected.subcategory === "all" ? "active" : ""
                }" data-cat="${cat.name}" data-sub="all">
                  Semua ${cat.name}
                  <small>${total} item</small>
                </button>
                ${subs
                  .map((sub) => {
                    const count = Number(sub.count || 0);
                    const active = selected.category === cat.name && selected.subcategory === sub.name;
                    return `
                      <button class="cat-item ${active ? "active" : ""}" data-cat="${cat.name}" data-sub="${sub.name}">
                        ${sub.name}
                        <small>${count} item</small>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </details>
          `;
        })
        .join("")}
    `;
    return;
  }

  // fallback: derive from products
  const tree = buildCategoryTree(products);
  const cats = Array.from(tree.keys()).sort((a, b) => a.localeCompare(b, "id"));

  categorySidebar.innerHTML = `
    <button class="cat-item ${selected.category === "all" ? "active" : ""}" data-cat="all" data-sub="all">
      Semua Produk
      <small>${products.length} item</small>
    </button>
    ${cats
      .map((cat) => {
        const subMap = tree.get(cat);
        const subs = Array.from(subMap.keys()).sort((a, b) => a.localeCompare(b, "id"));
        const total = Array.from(subMap.values()).reduce((a, b) => a + b, 0);
        return `
          <details class="cat-group" ${
            selected.category === cat ? "open" : ""
          }>
            <summary class="cat-summary">${cat} <span style="color:#6b7280; font-weight:400">(${total})</span></summary>
            <div class="cat-list">
              <button class="cat-item ${
                selected.category === cat && selected.subcategory === "all" ? "active" : ""
              }" data-cat="${cat}" data-sub="all">
                Semua ${cat}
                <small>${total} item</small>
              </button>
              ${subs
                .map((sub) => {
                  const count = subMap.get(sub);
                  const active =
                    selected.category === cat && selected.subcategory === sub;
                  return `
                    <button class="cat-item ${active ? "active" : ""}" data-cat="${cat}" data-sub="${sub}">
                      ${sub}
                      <small>${count} item</small>
                    </button>
                  `;
                })
                .join("")}
            </div>
          </details>
        `;
      })
      .join("")}
  `;
}

function renderActiveFilterText() {
  if (!activeFilterText) return;
  if (promoOnly) {
    if (selected.category === "all") {
      activeFilterText.textContent = "Menampilkan produk yang sedang promo saja.";
      return;
    }
    if (selected.subcategory === "all") {
      activeFilterText.textContent = `Promo Spesial • Kategori: ${selected.category}`;
      return;
    }
    activeFilterText.textContent = `Promo Spesial • Kategori: ${selected.category} → ${selected.subcategory}`;
    return;
  }
  if (selected.category === "all") {
    activeFilterText.textContent = "Menampilkan semua produk.";
    return;
  }
  if (selected.subcategory === "all") {
    activeFilterText.textContent = `Kategori: ${selected.category} (semua sub-kategori)`;
    return;
  }
  activeFilterText.textContent = `Kategori: ${selected.category} → ${selected.subcategory}`;
}

function getFilteredProducts() {
  if (!isShopPage) return [];
  const keyword = searchInput.value.toLowerCase().trim();
  const selectedSort = sortSelect.value;

  let result = products.filter((product) => {
    const matchesSearch = String(product.name || "")
      .toLowerCase()
      .includes(keyword);
    const matchesCategory =
      selected.category === "all" || product.category === selected.category;
    const matchesSub =
      selected.subcategory === "all" ||
      (product.subcategory || "Umum") === selected.subcategory;
    const matchesPromo = !promoOnly || isPromoProduct(product);
    return matchesSearch && matchesCategory && matchesSub && matchesPromo;
  });

  if (selectedSort === "priceAsc") {
    result = [...result].sort((a, b) => a.price - b.price);
  } else if (selectedSort === "priceDesc") {
    result = [...result].sort((a, b) => b.price - a.price);
  } else if (selectedSort === "ratingDesc") {
    result = [...result].sort((a, b) => b.rating - a.rating);
  }

  return result;
}

function renderProducts() {
  if (!isShopPage) return;
  renderActiveFilterText();
  const filtered = getFilteredProducts();

  if (!filtered.length) {
    productGrid.innerHTML = `<p class="empty-state">${promoOnly ? "Tidak ada produk promo saat ini." : "Produk tidak ditemukan."}</p>`;
    return;
  }

  productGrid.innerHTML = filtered
    .map(
      (product) => `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}" />
        <div class="product-content">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-meta">${product.category} • ${product.subcategory || "Umum"} | Rating ${product.rating}</p>
          <p class="product-meta" style="color: ${(product.stock || 0) > 0 ? 'var(--primary)' : 'var(--danger)'}; font-weight: 500;">
            ${(product.stock || 0) > 0 ? `Stok: ${product.stock}` : 'Stok Habis'}
          </p>
          ${
            normalizeDiscount(product.discount) > 0
              ? `<p class="product-meta" style="color:#047857">Diskon ${normalizeDiscount(product.discount)}%</p>`
              : ""
          }
          ${
            (product.points_per_purchase || 0) > 0
              ? `<span style="display: inline-block; background: #fef3c7; color: #d97706; font-size: 0.75rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px;">🏆 +${product.points_per_purchase} Poin</span>`
              : ""
          }
          <p class="product-price">${formatRupiah(getFinalPrice(product))}</p>
          <div class="product-card-footer">
            ${
              getWhatsAppUrl(product.wa_phone, product.name)
                ? `<a class="btn-wa action-btn-wa-full" href="${getWhatsAppUrl(product.wa_phone, product.name)}" target="_blank" rel="noopener noreferrer"><span class="wa-icon">WA</span><span>Chat WhatsApp</span></a>`
                : ""
            }
            <div class="product-actions">
              <a href="/product.html?id=${product.id}" class="btn-secondary action-btn">Detail</a>
              <button class="btn-primary action-btn add-to-cart" data-id="${product.id}" ${(product.stock || 0) <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Keranjang</button>
              <button class="btn-buy action-btn buy-now" data-id="${product.id}" ${(product.stock || 0) <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Beli</button>
            </div>
          </div>
        </div>
      </article>
    `
    )
    .join("");
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
      renderSidebar();
    } catch (error) {
      categorySidebar.innerHTML = `<p class="empty-state">Gagal memuat kategori.</p>`;
    }

    refreshCartLineStocks();
    renderProducts();
    refreshHeaderCartBadge();
  } catch (error) {
    products = [];
    productGrid.innerHTML = `<p class="empty-state">${error.message}</p>`;
    categorySidebar.innerHTML = `<p class="empty-state">Gagal memuat kategori.</p>`;
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

  categorySidebar.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-cat]");
    if (!btn) return;
    selected.category = btn.dataset.cat;
    selected.subcategory = btn.dataset.sub;
    renderSidebar();
    renderProducts();
  });

  if (clearCategoryButton) {
    clearCategoryButton.addEventListener("click", () => {
      selected.category = "all";
      selected.subcategory = "all";
      clearPromoMode();
      renderSidebar();
      renderProducts();
    });
  }

  productGrid.addEventListener("click", (event) => {
    const addToCartBtn = event.target.closest(".add-to-cart");
    const buyNowBtn = event.target.closest(".buy-now");

    if (addToCartBtn) {
      const pId = addToCartBtn.dataset.id;
      const product = products.find((p) => p.id === Number(pId));
      showAddToCartModal(product, (chosenSize, qty) => {
        const added = handleAddToCart(pId, chosenSize, qty);
        if (added) alert(`${qty} produk ditambahkan ke keranjang.`);
      });
    } else if (buyNowBtn) {
      const pId = buyNowBtn.dataset.id;
      const product = products.find((p) => p.id === Number(pId));

      showAddToCartModal(product, (chosenSize, qty) => {
        const added = handleAddToCart(pId, chosenSize, qty);
        if (added) {
          window.location.href = "/cart.html";
        }
      });
    }
  });

  searchInput.addEventListener("input", renderProducts);
  sortSelect.addEventListener("change", renderProducts);

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
