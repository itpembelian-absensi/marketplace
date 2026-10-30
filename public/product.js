const detailCard = document.getElementById("detailCard");
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const SAVE_KEY = "sjs_saved_products";
const COMPARE_KEY = "sjs_compare_products";
const REVIEW_KEY = "sjs_product_reviews";

function renderError(message) {
  detailCard.innerHTML = `<p class="pdp-loading">${escapeHtml(message)}</p>`;
}

function readIdList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter((id) => id > 0) : [];
  } catch {
    return [];
  }
}

function writeIdList(key, ids) {
  localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
}

function readReviews(id) {
  try {
    const all = JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}");
    const list = all[String(id)];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeReview(id, review) {
  const all = JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}");
  const list = Array.isArray(all[String(id)]) ? all[String(id)] : [];
  list.unshift(review);
  all[String(id)] = list.slice(0, 40);
  localStorage.setItem(REVIEW_KEY, JSON.stringify(all));
}

function showPdpToast(message) {
  let toast = document.getElementById("pdpToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "pdpToast";
    toast.className = "pdp-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-on");
  clearTimeout(showPdpToast.timer);
  showPdpToast.timer = setTimeout(() => toast.classList.remove("is-on"), 2200);
}

function formatPreviewPrice(number) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(number || 0)}`;
}

function parseThickness(name) {
  const match = String(name || "").match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function formatSheetSize(name) {
  const match = String(name || "").match(/(\d+)\s*[x×]\s*(\d+)\s*mm/i);
  if (!match) return "-";
  const width = Number(match[1]);
  const height = Number(match[2]);
  const feet = (mm) => {
    const value = mm / 304.8;
    return Math.abs(value - Math.round(value)) < 0.08 ? String(Math.round(value)) : value.toFixed(1);
  };
  return `${width} × ${height} mm (${feet(width)} × ${feet(height)} feet)`;
}

function materialName(product) {
  const sub = String(product.subcategory || "").trim();
  if (sub && sub.toLowerCase() !== "umum") return sub;
  return product.category || "-";
}

function displayTitle(product) {
  const material = String(product.subcategory || "").replace(/\s*\([^)]*\)/g, "").trim();
  if (material && material.toLowerCase() !== "umum") return `${product.category} - ${material}`;
  return product.name;
}

function displayBrand(product) {
  const match = String(product.name || "").match(/^([A-Z][A-Z0-9&]{1,})/);
  const brand = match ? match[1] : "";
  if (brand && product.category) return `${brand} ${product.category}`.toUpperCase();
  return String(product.category || "SJS").toUpperCase();
}

function sameFamily(a, b) {
  const sub = String(a.subcategory || "").trim().toLowerCase();
  if (!sub || sub === "umum") return false;
  return a.category === b.category && String(b.subcategory || "").trim().toLowerCase() === sub;
}

function splitDescription(text) {
  const lines = String(text || "").split(/\n/);
  let mode = "desc";
  const desc = [];
  const usage = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.length < 70 && /spesifikasi/i.test(trimmed)) {
      mode = "spec";
      return;
    }
    if (trimmed.length < 80 && /rekomendasi/i.test(trimmed)) {
      mode = "usage";
      return;
    }
    if (mode === "usage") usage.push(line);
    else if (mode === "desc") desc.push(line);
  });
  return { desc: desc.join("\n").trim(), usage: usage.join("\n").trim() };
}

function renderUsage(text) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return "";
  const intro = [];
  const items = [];
  lines.forEach((line) => {
    const cleaned = line.replace(/^[-•]\s+/, "");
    const splitAt = cleaned.indexOf(":");
    if (splitAt > 0 && splitAt < 42) {
      items.push(`<li><strong>${formatInlineMarkdown(cleaned.slice(0, splitAt))}:</strong> ${formatInlineMarkdown(cleaned.slice(splitAt + 1).trim())}</li>`);
      return;
    }
    if (!items.length) intro.push(formatInlineMarkdown(cleaned));
    else items.push(`<li>${formatInlineMarkdown(cleaned)}</li>`);
  });
  return `
    ${intro.length ? `<p>${intro.join("<br>")}</p>` : ""}
    ${items.length ? `<ul>${items.join("")}</ul>` : ""}
  `;
}

function starMarkup(value) {
  const score = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return `<span class="pdp-stars" aria-hidden="true">${"★".repeat(score)}${"☆".repeat(5 - score)}</span>`;
}

function similarCard(product) {
  const image = getProductImages(product)[0] || product.image || "";
  const thick = parseThickness(product.name);
  const spec = [thick ? `Tebal ${thick} mm` : "", displayBrand(product).split(" ")[0]].filter(Boolean).join(" · ");
  return `
    <a class="catalog-card pdp-similar-card" href="/product.html?id=${product.id}">
      <span class="catalog-card-media">${image ? `<img src="${escapeHtml(image)}" alt="" />` : ""}</span>
      <span class="catalog-card-body">
        <span class="catalog-spec">${escapeHtml(spec)}</span>
        <span class="catalog-name">${escapeHtml(displayTitle(product))}</span>
        <span class="catalog-price">${formatPreviewPrice(getProductFinalPrice(product))}</span>
        <span class="catalog-rating">${starMarkup(product.rating)} ${Number(product.rating || 0).toFixed(1)}</span>
      </span>
    </a>
  `;
}

function renderReviewList(reviews, expanded) {
  if (!reviews.length) {
    return `<p class="pdp-review-empty">Belum ada ulasan tertulis. Jadilah yang pertama menilai material ini.</p>`;
  }
  const visible = expanded ? reviews : reviews.slice(0, 2);
  return visible
    .map(
      (review) => `
      <article class="pdp-review">
        <header>
          <strong>${escapeHtml(review.name || "Pengguna")}</strong>
          <time>${escapeHtml(review.date || "")}</time>
        </header>
        ${starMarkup(review.rating)}
        <p>${escapeHtml(review.text || "")}</p>
      </article>`
    )
    .join("");
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

function openProductLightbox(images, startIndex, productName) {
  const lightbox = ensureProductLightbox();
  const imageEl = lightbox.querySelector(".lightbox-image");
  const counterEl = lightbox.querySelector(".lightbox-counter");
  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");
  let index = startIndex;

  function renderLightbox() {
    index = (index + images.length) % images.length;
    imageEl.src = images[index];
    imageEl.alt = productName || "Produk";
    counterEl.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : "";
    prevBtn.classList.toggle("hidden", images.length <= 1);
    nextBtn.classList.toggle("hidden", images.length <= 1);
    const main = detailCard.querySelector(".pdp-photo");
    if (main) main.src = images[index];
    detailCard.querySelectorAll(".pdp-thumb").forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("is-active", thumbIndex === index);
    });
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    document.body.classList.remove("lightbox-open");
    lightbox.removeEventListener("click", handleLightboxClick);
    document.removeEventListener("keydown", handleLightboxKeydown);
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
    if (event.key === "Escape") closeLightbox();
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

  lightbox.addEventListener("click", handleLightboxClick);
  document.addEventListener("keydown", handleLightboxKeydown);
  renderLightbox();
  lightbox.classList.remove("hidden");
  document.body.classList.add("lightbox-open");
}

function setSaveState(id, saved) {
  document.querySelectorAll("[data-save-toggle]").forEach((button) => {
    button.classList.toggle("is-on", saved);
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    if (button.id === "saveProductButton") {
      button.textContent = saved ? "Tersimpan" : "Simpan";
    }
  });
  const heart = document.getElementById("headerSaveButton");
  if (heart) {
    heart.classList.toggle("is-on", saved);
    heart.setAttribute("aria-pressed", saved ? "true" : "false");
  }
  const ids = readIdList(SAVE_KEY).filter((item) => item !== Number(id));
  if (saved) ids.push(Number(id));
  writeIdList(SAVE_KEY, ids);
}

async function loadProductDetail() {
  if (!productId) {
    renderError("ID produk tidak valid.");
    return;
  }

  try {
    const [product, catalog] = await Promise.all([
      apiFetch(`/products/${productId}`),
      apiFetch("/products"),
    ]);
    const sizes = parseSizes(product);
    const images = getProductImages(product);
    const family = (Array.isArray(catalog) ? catalog : [])
      .filter((item) => sameFamily(product, item) || Number(item.id) === Number(product.id))
      .map((item) => ({ item, thick: parseThickness(item.name) }))
      .filter((entry) => entry.thick !== null)
      .sort((a, b) => a.thick - b.thick || a.item.id - b.item.id);
    const thicknesses = [];
    family.forEach((entry) => {
      const key = String(entry.thick);
      const existing = thicknesses.find((row) => row.key === key);
      if (!existing) {
        thicknesses.push({ key, thick: entry.thick, id: entry.item.id });
        return;
      }
      if (Number(entry.item.id) === Number(product.id)) existing.id = entry.item.id;
    });
    const parts = splitDescription(product.description);
    const similar = (Array.isArray(catalog) ? catalog : [])
      .filter((item) => Number(item.id) !== Number(product.id))
      .filter((item) => item.category === product.category)
      .slice(0, 8);
    const reviews = readReviews(product.id);
    const summaryRating = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
      : Number(product.rating || 0);
    const pageUrl = window.location.href;
    const shareText = encodeURIComponent(`${displayTitle(product)} ${pageUrl}`);
    const saved = readIdList(SAVE_KEY).includes(Number(product.id));
    const compared = readIdList(COMPARE_KEY).includes(Number(product.id));
    document.title = `${displayTitle(product)} - PT Sahabat Jaya Sukses`;

    detailCard.innerHTML = `
      <div class="pdp-hero">
        <div class="pdp-gallery">
          <button type="button" class="pdp-stage" id="pdpZoom" aria-label="Perbesar gambar produk">
            <img class="pdp-photo" src="${escapeHtml(images[0] || "")}" alt="${escapeHtml(product.name)}" />
          </button>
          <div class="pdp-thumbs-wrap${images.length > 1 ? "" : " is-single"}">
            <button type="button" class="pdp-thumb-nav" id="thumbPrev" aria-label="Gambar sebelumnya">‹</button>
            <div class="pdp-thumbs" id="pdpThumbs">
              ${images
                .map(
                  (src, index) => `
                <button type="button" class="pdp-thumb${index === 0 ? " is-active" : ""}" data-index="${index}">
                  <img src="${escapeHtml(src)}" alt="" />
                </button>`
                )
                .join("")}
            </div>
            <button type="button" class="pdp-thumb-nav" id="thumbNext" aria-label="Gambar berikutnya">›</button>
          </div>
        </div>
        <div class="pdp-buy">
          <h1>${escapeHtml(displayTitle(product))}</h1>
          <p class="pdp-brand">${escapeHtml(displayBrand(product))}</p>
          <p class="pdp-price" id="pdpPrice">${formatPreviewPrice(getProductFinalPrice({ ...product, selectedSizePrice: sizes[0]?.price }))}</p>
          ${
            thicknesses.length
              ? `<div class="pdp-option">
                  <p>Variasi Ketebalan</p>
                  <div class="pdp-chips">
                    ${thicknesses
                      .map(
                        (row) => `
                      <a class="pdp-chip${Number(row.id) === Number(product.id) ? " is-selected" : ""}" href="/product.html?id=${row.id}">${row.thick} MM</a>`
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }
          ${
            sizes.length
              ? `<div class="pdp-option">
                  <p>Variasi Grade</p>
                  <div class="pdp-chips" id="gradeChips">
                    ${sizes
                      .map(
                        (size, index) => `
                      <button type="button" class="pdp-chip${index === 0 ? " is-selected" : ""}" data-grade="${index}">${escapeHtml(size.size)}</button>`
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }
          <div class="pdp-cart-row">
            <div class="pdp-qty">
              <button type="button" id="qtyMinus" aria-label="Kurangi">−</button>
              <input id="qtyInput" type="number" min="1" value="1" aria-label="Jumlah" />
              <button type="button" id="qtyPlus" aria-label="Tambah">+</button>
            </div>
            <button type="button" class="pdp-add" id="addDetailToCart">Tambahkan ke Keranjang</button>
          </div>
          <div class="pdp-tools">
            <div class="pdp-share">
              <span>Bagikan:</span>
              <a href="https://wa.me/?text=${shareText}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan ke WhatsApp">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3zm5 12.4c-.2.6-1.2 1.1-1.7 1.1-.4 0-.9.2-3.1-.7-2.6-1-4.2-3.6-4.3-3.8-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.1 0 .3-.1.5l-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 .9.8 1.7 1 2 .9.3-.1.5-.4.7-.6.2-.2.3-.2.6-.1.2.1 1.5.7 1.8.8.2.1.4.2.4.3.1.3 0 .9-.2 1.4z"/></svg>
              </a>
              <button type="button" data-share="instagram" aria-label="Bagikan ke Instagram">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none"/></svg>
              </button>
              <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan ke Facebook">f</a>
              <button type="button" data-share="tiktok" aria-label="Bagikan ke TikTok">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14 4c.4 2.4 1.8 4 4.2 4.3v2.4c-1.4 0-2.7-.4-4-1.2v5.8a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.5a2.8 2.8 0 1 0 2 2.7V4h2.2z"/></svg>
              </button>
            </div>
            <button type="button" class="pdp-tool${compared ? " is-on" : ""}" id="compareButton" aria-pressed="${compared ? "true" : "false"}">Bandingkan</button>
            <button type="button" class="pdp-tool${saved ? " is-on" : ""}" id="saveProductButton" data-save-toggle aria-pressed="${saved ? "true" : "false"}">${saved ? "Tersimpan" : "Simpan"}</button>
          </div>
        </div>
      </div>

      <section class="pdp-block">
        <h2>Deskripsi Produk</h2>
        <div class="pdp-copy">${formatProductDescription(parts.desc || product.description)}</div>
      </section>

      <section class="pdp-block">
        <div class="pdp-spec">
          <h2>Spesifikasi</h2>
          <h2>Detail</h2>
          <span>Brand</span><span>${escapeHtml(displayBrand(product))}</span>
          <span>Material</span><span>${escapeHtml(materialName(product))}</span>
          <span>Variasi Ketebalan</span><span>${escapeHtml(thicknesses.length ? `${thicknesses.map((row) => row.thick).join(", ")} mm` : "-")}</span>
          <span>Variasi Grade</span><span>${escapeHtml(sizes.map((size) => size.size).join(", ") || "-")}</span>
          <span>Ukuran</span><span>${escapeHtml(formatSheetSize(product.name))}</span>
        </div>
      </section>

      ${
        parts.usage
          ? `<section class="pdp-block">
              <h2>Rekomendasi Penggunaan</h2>
              <div class="pdp-copy">${renderUsage(parts.usage)}</div>
            </section>`
          : ""
      }

      <section class="pdp-block" id="pdpReviews">
        <div class="pdp-review-head">
          <h2>Ulasan Produk</h2>
          <button type="button" id="writeReview">Tulis Ulasan</button>
        </div>
        <p class="pdp-score">${starMarkup(summaryRating)} <strong>${summaryRating.toFixed(1)}</strong></p>
        <div id="pdpReviewList">${renderReviewList(reviews, false)}</div>
        ${reviews.length > 2 ? `<button type="button" class="pdp-more" id="moreReviews">Lihat lebih banyak ulasan</button>` : ""}
        <form class="pdp-review-form hidden" id="reviewForm">
          <p>Beri nilai</p>
          <div class="pdp-rate" id="reviewStars">
            ${[1, 2, 3, 4, 5].map((star) => `<button type="button" data-star="${star}" aria-label="${star} bintang">★</button>`).join("")}
          </div>
          <textarea id="reviewText" rows="4" maxlength="600" placeholder="Ceritakan pengalamanmu dengan material ini" required></textarea>
          <button type="submit">Kirim Ulasan</button>
        </form>
      </section>

      <section class="pdp-block">
        <div class="pdp-similar-head">
          <h2>Produk Serupa</h2>
          <button type="button" id="similarNext" aria-label="Produk serupa berikutnya">›</button>
        </div>
        <div class="pdp-similar" id="similarTrack">
          ${similar.length ? similar.map(similarCard).join("") : `<p class="pdp-review-empty">Belum ada produk serupa.</p>`}
        </div>
      </section>
    `;

    let gradeIndex = 0;
    let qty = 1;
    let photoIndex = 0;
    let reviewScore = 5;
    let reviewsExpanded = false;

    const priceEl = document.getElementById("pdpPrice");
    const qtyInput = document.getElementById("qtyInput");
    const photo = detailCard.querySelector(".pdp-photo");

    function selectedSize() {
      return sizes[gradeIndex] || null;
    }

    function refreshPrice() {
      const size = selectedSize();
      const amount = size ? calcFinalPriceCommon(size.price, product.discount) : getProductFinalPrice(product);
      if (priceEl) priceEl.textContent = formatPreviewPrice(amount);
    }

    function showPhoto(index) {
      if (!images.length) return;
      photoIndex = (index + images.length) % images.length;
      if (photo) {
        photo.src = images[photoIndex];
        photo.alt = product.name;
      }
      detailCard.querySelectorAll(".pdp-thumb").forEach((thumb, thumbIndex) => {
        thumb.classList.toggle("is-active", thumbIndex === photoIndex);
      });
    }

    detailCard.querySelectorAll(".pdp-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => showPhoto(Number(thumb.dataset.index) || 0));
    });
    document.getElementById("thumbPrev")?.addEventListener("click", () => showPhoto(photoIndex - 1));
    document.getElementById("thumbNext")?.addEventListener("click", () => showPhoto(photoIndex + 1));
    document.getElementById("pdpZoom")?.addEventListener("click", () => {
      if (images.length) openProductLightbox(images, photoIndex, product.name);
    });

    document.getElementById("gradeChips")?.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-grade]");
      if (!chip) return;
      gradeIndex = Number(chip.dataset.grade) || 0;
      document.querySelectorAll("#gradeChips .pdp-chip").forEach((item) => {
        item.classList.toggle("is-selected", item === chip);
      });
      refreshPrice();
    });

    function setQty(next) {
      const stock = Math.max(1, getProductAvailableStock(product, selectedSize()));
      qty = Math.min(stock, Math.max(1, next));
      if (qtyInput) qtyInput.value = String(qty);
    }
    document.getElementById("qtyMinus")?.addEventListener("click", () => setQty(qty - 1));
    document.getElementById("qtyPlus")?.addEventListener("click", () => setQty(qty + 1));
    qtyInput?.addEventListener("change", () => setQty(Number(qtyInput.value) || 1));

    const addButton = document.getElementById("addDetailToCart");
    const stockNow = getProductAvailableStock(product, selectedSize());
    if (addButton && stockNow <= 0) {
      addButton.disabled = true;
      addButton.textContent = "Stok habis";
    }
    addButton?.addEventListener("click", () => {
      const chosen = selectedSize();
      const available = getProductAvailableStock(product, chosen);
      const inCart = countCartQtyForProduct(getCart(), product.id, chosen?.size || "");
      if (available < inCart + qty) {
        showPdpToast(`Stok tersisa ${available}.`);
        return;
      }
      addToCart(buildCartLineFromProduct(product, chosen, qty));
      showPdpToast("Produk ditambahkan ke keranjang.");
    });

    async function shareElsewhere() {
      const payload = { title: displayTitle(product), text: displayTitle(product), url: pageUrl };
      if (navigator.share) {
        try {
          await navigator.share(payload);
          return;
        } catch {
          return;
        }
      }
      try {
        await navigator.clipboard.writeText(pageUrl);
        showPdpToast("Tautan produk disalin.");
      } catch {
        showPdpToast(pageUrl);
      }
    }
    detailCard.querySelectorAll("[data-share]").forEach((button) => {
      button.addEventListener("click", shareElsewhere);
    });

    document.getElementById("compareButton")?.addEventListener("click", (event) => {
      const ids = readIdList(COMPARE_KEY);
      const exists = ids.includes(Number(product.id));
      const next = exists ? ids.filter((id) => id !== Number(product.id)) : ids.concat(Number(product.id));
      writeIdList(COMPARE_KEY, next);
      event.currentTarget.classList.toggle("is-on", !exists);
      event.currentTarget.setAttribute("aria-pressed", !exists ? "true" : "false");
      showPdpToast(exists ? "Dihapus dari perbandingan." : "Ditambahkan untuk dibandingkan.");
    });

    function toggleSave() {
      const next = !readIdList(SAVE_KEY).includes(Number(product.id));
      setSaveState(product.id, next);
      showPdpToast(next ? "Produk disimpan." : "Produk dihapus dari simpanan.");
    }
    document.getElementById("saveProductButton")?.addEventListener("click", toggleSave);
    document.getElementById("headerSaveButton")?.addEventListener("click", toggleSave);
    if (saved) setSaveState(product.id, true);

    const reviewForm = document.getElementById("reviewForm");
    const reviewStars = document.getElementById("reviewStars");
    function paintStars() {
      reviewStars?.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("is-on", Number(button.dataset.star) <= reviewScore);
      });
    }
    paintStars();
    reviewStars?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-star]");
      if (!button) return;
      reviewScore = Number(button.dataset.star) || 5;
      paintStars();
    });
    document.getElementById("writeReview")?.addEventListener("click", () => {
      const auth = getAuth();
      if (!auth?.user) {
        if (typeof openAuthModal === "function") openAuthModal();
        else window.location.href = "/login.html";
        return;
      }
      reviewForm?.classList.remove("hidden");
      document.getElementById("reviewText")?.focus();
    });

    function paintReviews() {
      const list = readReviews(product.id);
      const score = list.length
        ? list.reduce((sum, review) => sum + Number(review.rating || 0), 0) / list.length
        : Number(product.rating || 0);
      const scoreEl = detailCard.querySelector(".pdp-score");
      if (scoreEl) scoreEl.innerHTML = `${starMarkup(score)} <strong>${score.toFixed(1)}</strong>`;
      const listEl = document.getElementById("pdpReviewList");
      if (listEl) listEl.innerHTML = renderReviewList(list, reviewsExpanded);
      const more = document.getElementById("moreReviews");
      if (more) more.hidden = list.length <= 2 || reviewsExpanded;
    }
    document.getElementById("moreReviews")?.addEventListener("click", (event) => {
      reviewsExpanded = true;
      event.currentTarget.hidden = true;
      paintReviews();
    });
    reviewForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const auth = getAuth();
      if (!auth?.user) {
        if (typeof openAuthModal === "function") openAuthModal();
        return;
      }
      const text = document.getElementById("reviewText")?.value.trim() || "";
      if (text.length < 4) {
        showPdpToast("Tulis ulasan sedikit lebih lengkap.");
        return;
      }
      writeReview(product.id, {
        name: auth.user.name || "Pengguna",
        rating: reviewScore,
        text,
        date: new Date().toLocaleDateString("id-ID"),
      });
      reviewForm.reset();
      reviewForm.classList.add("hidden");
      reviewScore = 5;
      paintStars();
      paintReviews();
      showPdpToast("Ulasan terkirim.");
    });

    document.getElementById("similarNext")?.addEventListener("click", () => {
      document.getElementById("similarTrack")?.scrollBy({ left: 320, behavior: "smooth" });
    });
  } catch (error) {
    renderError(error.message || "Gagal memuat produk.");
  }
}

loadProductDetail();
