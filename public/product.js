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

function renderProductGallery(images, productName) {
  const safeName = escapeHtml(productName || "Produk");
  const hasMultiple = images.length > 1;
  const dotsHtml = hasMultiple
    ? `<div class="gallery-dots">${images.map((_, index) => `<button type="button" class="gallery-dot${index === 0 ? " active" : ""}" data-index="${index}" aria-label="Gambar ${index + 1}"></button>`).join("")}</div>`
    : "";

  return `
    <div class="product-gallery" data-gallery>
      <div class="product-gallery-main">
        ${
          hasMultiple
            ? `<button type="button" class="gallery-nav gallery-prev" aria-label="Gambar sebelumnya">&#8249;</button>`
            : ""
        }
        <button type="button" class="gallery-image-btn" aria-label="Perbesar gambar produk">
          <img class="detail-image gallery-image" src="${escapeHtml(images[0])}" alt="${safeName}" />
          <span class="gallery-zoom-hint">Klik untuk zoom</span>
        </button>
        ${
          hasMultiple
            ? `<button type="button" class="gallery-nav gallery-next" aria-label="Gambar berikutnya">&#8250;</button>`
            : ""
        }
      </div>
      ${dotsHtml}
    </div>
  `;
}

function initProductGallery(images, productName) {
  const gallery = detailCard.querySelector("[data-gallery]");
  if (!gallery || !images.length) return;

  let currentIndex = 0;
  const imageEl = gallery.querySelector(".gallery-image");
  const prevBtn = gallery.querySelector(".gallery-prev");
  const nextBtn = gallery.querySelector(".gallery-next");
  const dots = Array.from(gallery.querySelectorAll(".gallery-dot"));
  const zoomBtn = gallery.querySelector(".gallery-image-btn");

  function updateGallery(index) {
    currentIndex = (index + images.length) % images.length;
    if (imageEl) {
      imageEl.src = images[currentIndex];
      imageEl.alt = productName || "Produk";
    }
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === currentIndex);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      updateGallery(currentIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      updateGallery(currentIndex + 1);
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      updateGallery(Number(dot.dataset.index) || 0);
    });
  });

  let touchStartX = 0;
  gallery.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].screenX;
    },
    { passive: true }
  );
  gallery.addEventListener(
    "touchend",
    (event) => {
      if (images.length <= 1) return;
      const diff = event.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) < 50) return;
      updateGallery(diff > 0 ? currentIndex - 1 : currentIndex + 1);
    },
    { passive: true }
  );

  if (zoomBtn) {
    zoomBtn.addEventListener("click", () => {
      openProductLightbox(images, currentIndex, productName, updateGallery);
    });
  }
}

function ensureProductLightbox() {
  let lightbox = document.getElementById("productLightbox");
  if (lightbox) return lightbox;

  lightbox = document.createElement("div");
  lightbox.id = "productLightbox";
  lightbox.className = "product-lightbox hidden";
  lightbox.innerHTML = `
    <div class="product-lightbox-backdrop" data-close-lightbox></div>
    <div class="product-lightbox-content" role="dialog" aria-modal="true" aria-label="Pratinjau gambar produk">
      <button type="button" class="lightbox-close" aria-label="Tutup">&times;</button>
      <button type="button" class="lightbox-nav lightbox-prev" aria-label="Gambar sebelumnya">&#8249;</button>
      <img class="lightbox-image" src="" alt="" />
      <button type="button" class="lightbox-nav lightbox-next" aria-label="Gambar berikutnya">&#8250;</button>
      <p class="lightbox-counter"></p>
    </div>
  `;
  document.body.appendChild(lightbox);
  return lightbox;
}

function openProductLightbox(images, startIndex, productName, onIndexChange) {
  const lightbox = ensureProductLightbox();
  const imageEl = lightbox.querySelector(".lightbox-image");
  const counterEl = lightbox.querySelector(".lightbox-counter");
  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");
  const closeBtn = lightbox.querySelector(".lightbox-close");
  let index = startIndex;

  function renderLightbox() {
    index = (index + images.length) % images.length;
    imageEl.src = images[index];
    imageEl.alt = productName || "Produk";
    counterEl.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : "";
    prevBtn.classList.toggle("hidden", images.length <= 1);
    nextBtn.classList.toggle("hidden", images.length <= 1);
    counterEl.classList.toggle("hidden", images.length <= 1);
    if (typeof onIndexChange === "function") onIndexChange(index);
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    document.body.classList.remove("lightbox-open");
    lightbox.removeEventListener("click", handleLightboxClick);
    document.removeEventListener("keydown", handleLightboxKeydown);
    lightbox.removeEventListener("touchstart", handleTouchStart);
    lightbox.removeEventListener("touchend", handleTouchEnd);
  }

  function handleLightboxClick(event) {
    if (event.target.closest("[data-close-lightbox]") || event.target.closest(".lightbox-close")) {
      closeLightbox();
      return;
    }
    if (event.target.closest(".lightbox-prev")) {
      index -= 1;
      renderLightbox();
      return;
    }
    if (event.target.closest(".lightbox-next")) {
      index += 1;
      renderLightbox();
    }
  }

  function handleLightboxKeydown(event) {
    if (event.key === "Escape") {
      closeLightbox();
      return;
    }
    if (images.length <= 1) return;
    if (event.key === "ArrowLeft") {
      index -= 1;
      renderLightbox();
    }
    if (event.key === "ArrowRight") {
      index += 1;
      renderLightbox();
    }
  }

  let touchStartX = 0;
  function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
  }
  function handleTouchEnd(event) {
    if (images.length <= 1) return;
    const diff = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) < 50) return;
    index += diff > 0 ? -1 : 1;
    renderLightbox();
  }

  lightbox.addEventListener("click", handleLightboxClick);
  document.addEventListener("keydown", handleLightboxKeydown);
  lightbox.addEventListener("touchstart", handleTouchStart, { passive: true });
  lightbox.addEventListener("touchend", handleTouchEnd, { passive: true });

  renderLightbox();
  lightbox.classList.remove("hidden");
  document.body.classList.add("lightbox-open");
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
    const images = getProductImages(product);
    detailCard.innerHTML = `
      <div class="detail-layout">
        ${renderProductGallery(images, product.name)}
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
          <div class="product-description">${formatProductDescription(product.description)}</div>
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
    initProductGallery(images, product.name);

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
