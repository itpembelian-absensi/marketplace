let products = [];

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const categorySidebar = document.getElementById("categorySidebar");
const clearCategoryButton = document.getElementById("clearCategory");
const activeFilterText = document.getElementById("activeFilterText");
const cartButton = document.getElementById("cartButton");
const cartPanel = document.getElementById("cartPanel");
const closeCartButton = document.getElementById("closeCartButton");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");
const checkoutNameInput = document.getElementById("checkoutName");
const checkoutPhoneInput = document.getElementById("checkoutPhone");
const checkoutAddressInput = document.getElementById("checkoutAddress");
const checkoutPaymentMethodSelect = document.getElementById("checkoutPaymentMethod");

const isShopPage = Boolean(productGrid && searchInput && sortSelect && categorySidebar);

const selected = {
  category: "all",
  subcategory: "all",
};

function normalizeDiscount(discount) {
  const num = Number(discount);
  if (Number.isNaN(num)) return 0;
  return Math.min(95, Math.max(0, Math.round(num)));
}

function getFinalPrice(product) {
  const basePrice = Number(product.price) || 0;
  const discount = normalizeDiscount(product.discount);
  return Math.round((basePrice * (100 - discount)) / 100);
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
    return matchesSearch && matchesCategory && matchesSub;
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
    productGrid.innerHTML = '<p class="empty-state">Produk tidak ditemukan.</p>';
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
          ${
            normalizeDiscount(product.discount) > 0
              ? `<p class="product-meta" style="color:#047857">Diskon ${normalizeDiscount(product.discount)}%</p>`
              : ""
          }
          <div class="price-row">
            <strong>${formatRupiah(getFinalPrice(product))}</strong>
            <div class="product-actions">
              <a href="/product.html?id=${product.id}" class="btn-secondary action-btn">Detail</a>
              ${
                getWhatsAppUrl(product.wa_phone, product.name)
                  ? `<a class="btn-wa action-btn" href="${getWhatsAppUrl(product.wa_phone, product.name)}" target="_blank" rel="noopener noreferrer"><span class="wa-icon">WA</span><span>Chat</span></a>`
                  : ""
              }
              <button class="btn-primary action-btn action-btn-cart add-to-cart" data-id="${product.id}">Keranjang</button>
              <button class="btn-buy action-btn action-btn-buy buy-now" data-id="${product.id}">Beli</button>
            </div>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

function updateCartUI() {
  if (!cartButton || !cartItems || !cartTotal) return;
  const cart = getCart();
  cartButton.textContent = `Keranjang (${cart.length})`;
  const total = cart.reduce((sum, item) => sum + getFinalPrice(item), 0);
  cartTotal.textContent = formatRupiah(total);

  if (!cart.length) {
    cartItems.innerHTML = '<p class="empty-state">Keranjang masih kosong.</p>';
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item, index) => `
      <div class="cart-item">
        <p><strong>${item.name}</strong></p>
        <p>${formatRupiah(getFinalPrice(item))}</p>
        <button class="btn-secondary remove-item" data-index="${index}">Hapus</button>
      </div>
    `
    )
    .join("");
}

function handleAddToCart(productId) {
  if (!isShopPage) return;
  const product = products.find((item) => item.id === Number(productId));
  if (!product) {
    return false;
  }
  addToCart(product);
  updateCartUI();
  return true;
}

async function handleCheckout() {
  if (!cartPanel) return;
  const cart = getCart();
  if (!cart.length) {
    alert("Keranjang masih kosong.");
    return;
  }

  if (!getToken()) {
    alert("Silakan login dulu untuk checkout.");
    window.location.href = "/login.html";
    return;
  }

  try {
    const customerName = checkoutNameInput?.value.trim() || "";
    const customerPhone = checkoutPhoneInput?.value.trim() || "";
    const customerAddress = checkoutAddressInput?.value.trim() || "";
    const paymentMethod = checkoutPaymentMethodSelect?.value || "";
    if (!customerName || !customerPhone || !customerAddress || !paymentMethod) {
      alert("Lengkapi nama, telepon, alamat, dan metode pembayaran.");
      return;
    }
    const result = await apiFetch("/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: cart.map((item) => item.id),
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
      }),
    });
    alert(
      `${result.message}\nOrder ID: ${result.orderId}\nMetode: ${result.paymentMethod}\nTotal: ${formatRupiah(
        result.total
      )}`
    );
    clearCart();
    updateCartUI();
    if (checkoutNameInput) checkoutNameInput.value = "";
    if (checkoutPhoneInput) checkoutPhoneInput.value = "";
    if (checkoutAddressInput) checkoutAddressInput.value = "";
    cartPanel.classList.add("hidden");
  } catch (error) {
    alert(error.message);
  }
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

    renderProducts();
  } catch (error) {
    products = [];
    productGrid.innerHTML = `<p class="empty-state">${error.message}</p>`;
    categorySidebar.innerHTML = `<p class="empty-state">Gagal memuat kategori.</p>`;
  }
}

if (isShopPage) {
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
      renderSidebar();
      renderProducts();
    });
  }

  productGrid.addEventListener("click", (event) => {
    const addToCartBtn = event.target.closest(".add-to-cart");
    const buyNowBtn = event.target.closest(".buy-now");

    if (addToCartBtn) {
      const added = handleAddToCart(addToCartBtn.dataset.id);
      if (added) {
        alert("Produk ditambahkan ke keranjang.");
      }
    }

    if (buyNowBtn) {
      handleAddToCart(buyNowBtn.dataset.id);
      cartPanel.classList.remove("hidden");
    }
  });

  cartItems.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("remove-item")) {
      removeFromCart(Number(target.dataset.index));
      updateCartUI();
    }
  });

  searchInput.addEventListener("input", renderProducts);
  sortSelect.addEventListener("change", renderProducts);

  cartButton.addEventListener("click", () => {
    cartPanel.classList.toggle("hidden");
  });

  closeCartButton.addEventListener("click", () => {
    cartPanel.classList.add("hidden");
  });

  checkoutButton.addEventListener("click", handleCheckout);

  renderUserArea();
  updateCartUI();
  loadProducts();
} else {
  renderUserArea();
}
