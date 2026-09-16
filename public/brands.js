function clampBrandLogoCoord(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(92, Math.max(8, Math.round(number * 10) / 10));
}

function brandLogoStyle(x, y, scale) {
  const clampScale = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 30;
    return Math.min(70, Math.max(8, Math.round(number * 10) / 10));
  };
  return `--logo-x:${clampBrandLogoCoord(x, 84)}%;--logo-y:${clampBrandLogoCoord(y, 84)}%;--logo-scale:${clampScale(scale)}%;`;
}

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
        const hasLogo = Boolean(brand.logoUrl);
        const hasCover = Boolean(brand.coverUrl);
        const cover = hasCover
          ? `<img class="sjs-brand-tile-cover" src="${escapeHtml(brand.coverUrl)}" alt="">`
          : "";
        const mark = hasLogo
          ? `<img class="sjs-brand-tile-logo" src="${escapeHtml(brand.logoUrl)}" alt="${name}">`
          : `<span class="sjs-brand-tile-name">${name}</span>`;
        const classes = [
          "sjs-brand-tile",
          hasCover ? "has-cover" : "",
          hasLogo ? "" : "is-text",
        ]
          .filter(Boolean)
          .join(" ");
        return `
          <a class="${classes}" href="/shop.html?q=${query}" title="${name}" style="${brandLogoStyle(
            brand.logoX,
            brand.logoY,
            brand.logoScale
          )}">
            ${cover}
            ${mark}
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
