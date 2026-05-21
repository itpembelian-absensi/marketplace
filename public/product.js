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
  const discount = normalizeDiscount(product.discount);
  return Math.round((Number(product.price || 0) * (100 - discount)) / 100);
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
    detailCard.innerHTML = `
      <div class="detail-layout">
        <img class="detail-image" src="${product.image}" alt="${product.name}" />
        <div>
          <h2 class="detail-product-title">${product.name}</h2>
          <p class="product-meta">${product.category} | Rating ${product.rating}</p>
          ${
            normalizeDiscount(product.discount) > 0
              ? `<p class="product-meta" style="color:#047857">Diskon ${normalizeDiscount(product.discount)}%</p>`
              : ""
          }
          <p><strong>${formatRupiah(getFinalPrice(product))}</strong></p>
          <p>${product.description}</p>
          ${
            getWhatsAppUrl(product.wa_phone, product.name)
              ? `<a href="${getWhatsAppUrl(product.wa_phone, product.name)}" target="_blank" rel="noopener noreferrer" class="btn-wa"><span class="wa-icon">WA</span><span>Chat WhatsApp</span></a>`
              : ""
          }
          <button id="addDetailToCart" class="btn-primary">Tambah ke Keranjang</button>
          <button id="buyNowButton" class="btn-buy detail-buy-btn">Beli Sekarang</button>
        </div>
      </div>
    `;

    const button = document.getElementById("addDetailToCart");
    button.addEventListener("click", () => {
      addToCart(product);
      alert("Produk ditambahkan ke keranjang.");
    });
    const buyNowButton = document.getElementById("buyNowButton");
    if (buyNowButton) {
      buyNowButton.addEventListener("click", () => {
        addToCart(product);
        alert("Produk ditambahkan. Lanjut ke checkout.");
        window.location.href = "/shop.html";
      });
    }
  } catch (error) {
    renderError(error.message);
  }
}

renderUserArea();
loadProductDetail();
