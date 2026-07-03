const detailCard = document.getElementById("detailCard");
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

function renderError(message) {
  detailCard.innerHTML = `<p class="empty-state">${message}</p>`;
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

async function loadProductDetail() {
  if (!productId) {
    renderError("ID produk tidak valid.");
    return;
  }

  try {
    const product = await apiFetch(`/products/${productId}`);
    const sizes = parseSizes(product);
    const showHeaderPrice = sizes.length === 0;
    detailCard.innerHTML = `
      <div class="detail-layout">
        <img class="detail-image" src="${product.image}" alt="${product.name}" />
        <div>
          <h2 class="detail-product-title">${product.name}</h2>
          <p class="product-meta">${product.category} | Rating ${product.rating}</p>
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
              ? `<span style="display: inline-block; background: #fef3c7; color: #d97706; font-size: 0.85rem; font-weight: 600; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px; margin-top: 4px;">🏆 +${product.points_per_purchase} Poin dari produk ini</span>`
              : ""
          }
          ${showHeaderPrice ? `<p><strong>${formatRupiah(getFinalPrice(product))}</strong></p>` : ""}
          <p>${product.description}</p>
          <div class="detail-actions">
            ${
              getWhatsAppUrl(product.wa_phone, product.name)
                ? `<a href="${getWhatsAppUrl(product.wa_phone, product.name)}" target="_blank" rel="noopener noreferrer" class="btn-wa"><span class="wa-icon">WA</span><span>Chat WhatsApp</span></a>`
                : ""
            }
            <button id="addDetailToCart" class="btn-primary" ${(product.stock || 0) <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Tambah ke Keranjang</button>
            <button id="buyNowButton" class="btn-buy detail-buy-btn" ${(product.stock || 0) <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Beli Sekarang</button>
          </div>
        </div>
      </div>
    `;
    if (sizes.length > 0) {
      const sizesInfoDiv = document.createElement("div");
      sizesInfoDiv.style.cssText = "margin-top: 12px; margin-bottom: 8px;";
      sizesInfoDiv.innerHTML = `
        <p style="font-weight: 600; margin: 0 0 8px; font-size: 0.95rem; color: #374151;">Pilihan Ukuran:</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${sizes.map(s => {
            const fp = calcFinalPriceCommon(s.price, product.discount);
            const itemStock = getSizeItemStock(s);
            const stockLabel = itemStock > 0 ? `Stok: ${itemStock}` : "Stok Habis";
            const stockColor = itemStock > 0 ? "#059669" : "#dc2626";
            return `<span style="padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.85rem; background: #f9fafb; display: inline-flex; flex-direction: column; gap: 2px;"><strong>${s.size}</strong><span>${formatRupiah(fp)}</span><span style="color: ${stockColor}; font-size: 0.78rem;">${stockLabel}</span></span>`;
          }).join("")}
        </div>
      `;
      const detailDiv = detailCard.querySelector(".detail-layout > div:last-child");
      const actionsDiv = detailCard.querySelector(".detail-actions");
      if (detailDiv && actionsDiv) {
        detailDiv.insertBefore(sizesInfoDiv, actionsDiv);
      }
    }

    function addToCartWithSize(product, chosenSize, qty = 1) {
      const cartItem = buildCartLineFromProduct(product, chosenSize, qty);
      addToCart(cartItem);
    }

    const button = document.getElementById("addDetailToCart");
    button.addEventListener("click", () => {
      showAddToCartModal(product, (chosenSize, qty) => {
        const cart = getCart();
        const sizeName = chosenSize?.size || null;
        const availableStock = getProductAvailableStock(product, chosenSize);
        const qtyInCart = countCartQtyForProduct(cart, product.id, sizeName);
        if (availableStock < qtyInCart + qty) {
          alert(`Maaf, stok tidak mencukupi untuk menambah ${qty} item. (Tersisa: ${availableStock}, Di keranjang: ${qtyInCart})`);
          return;
        }
        addToCartWithSize(product, chosenSize, qty);
        alert(`${qty} produk ditambahkan ke keranjang.`);
      });
    });
    
    const buyNowButton = document.getElementById("buyNowButton");
    if (buyNowButton) {
      buyNowButton.addEventListener("click", () => {
        showAddToCartModal(product, (chosenSize, qty) => {
          const cart = getCart();
          const sizeName = chosenSize?.size || null;
          const availableStock = getProductAvailableStock(product, chosenSize);
          const qtyInCart = countCartQtyForProduct(cart, product.id, sizeName);
          if (availableStock < qtyInCart + qty) {
            alert(`Maaf, stok tidak mencukupi untuk menambah ${qty} item. (Tersisa: ${availableStock}, Di keranjang: ${qtyInCart})`);
            return;
          }
          addToCartWithSize(product, chosenSize, qty);
          window.location.href = "/cart.html";
        });
      });
    }
  } catch (error) {
    renderError(error.message);
  }
}

renderUserArea();
loadProductDetail();
