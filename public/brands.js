async function loadPublicBrands() {
  const grid = document.getElementById("brandsGrid");
  if (!grid) return;
  try {
    const brands = await apiFetch("/brands");
    if (!Array.isArray(brands) || brands.length === 0) {
      grid.innerHTML =
        '<p class="empty-state" style="grid-column:1/-1;text-align:center;">Belum ada merek. Admin dapat menambahkannya di menu Merek.</p>';
      return;
    }
    grid.innerHTML = brands
      .map((brand) => {
        const name = escapeHtml(brand.name || "");
        const query = encodeURIComponent(brand.name || "");
        const cover = brand.coverUrl
          ? `<img class="sjs-brand-tile-cover" src="${escapeHtml(brand.coverUrl)}" alt="${name}">`
          : `<span class="sjs-brand-tile-placeholder" aria-hidden="true"></span>`;
        const logo = brand.logoUrl
          ? `<img class="sjs-brand-tile-logo" src="${escapeHtml(brand.logoUrl)}" alt="">`
          : "";
        return `
          <a class="sjs-brand-tile" href="/shop.html?q=${query}">
            ${cover}
            <span class="sjs-brand-tile-shade"></span>
            ${logo}
            <span class="sjs-brand-tile-name">${name}</span>
          </a>`;
      })
      .join("");
  } catch (error) {
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;text-align:center;color:#b91c1c;">Gagal memuat merek: ${escapeHtml(
      error.message
    )}</p>`;
  }
}

loadPublicBrands();
