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

let publicBrands = [];
let brandsLayout = "cover";
let brandsCategory = "Semua";

function brandCategories(brand) {
  if (Array.isArray(brand?.categories) && brand.categories.length) return brand.categories;
  return brand?.category ? [brand.category] : [];
}

function collectBrandTabs(brands) {
  const names = [];
  const seen = new Set();
  brands.forEach((brand) => {
    brandCategories(brand).forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      names.push(name);
    });
  });
  return ["Semua", ...names];
}

function applyBrandsLayoutClass() {
  const grid = document.getElementById("brandsGrid");
  const cats = document.getElementById("brandsCats");
  document.body.classList.toggle("brands-layout-logo", brandsLayout === "logo");
  document.body.classList.toggle("brands-layout-cover", brandsLayout !== "logo");
  if (grid) {
    grid.classList.toggle("is-logo-grid", brandsLayout === "logo");
  }
  if (cats) {
    const showTabs = brandsLayout === "logo" && collectBrandTabs(publicBrands).length > 1;
    cats.classList.toggle("hidden", !showTabs);
  }
}

function renderBrandTiles(brands) {
  const grid = document.getElementById("brandsGrid");
  if (!grid) return;
  const visible =
    brandsLayout === "logo" && brandsCategory !== "Semua"
      ? brands.filter((brand) => brandCategories(brand).includes(brandsCategory))
      : brands;
  if (!visible.length) {
    grid.innerHTML =
      '<p class="empty-state" style="grid-column:1/-1;text-align:center;">Belum ada merek di kategori ini.</p>';
    return;
  }
  const logoMode = brandsLayout === "logo";
  grid.innerHTML = visible
    .map((brand) => {
      const name = escapeHtml(brand.name || "");
      const query = encodeURIComponent(brand.name || "");
      const hasLogo = Boolean(brand.logoUrl);
      const hasCover = !logoMode && Boolean(brand.coverUrl);
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
        logoMode ? "is-logo-card" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const style = logoMode
        ? ""
        : ` style="${brandLogoStyle(brand.logoX, brand.logoY, brand.logoScale)}"`;
      return `
          <a class="${classes}" href="/shop.html?q=${query}" title="${name}"${style}>
            ${cover}
            ${mark}
          </a>`;
    })
    .join("");
}

function renderBrandTabs(brands) {
  const track = document.getElementById("brandsCatsTrack");
  if (!track) return;
  const tabs = collectBrandTabs(brands);
  if (brandsLayout !== "logo" || tabs.length <= 1) {
    track.innerHTML = "";
    applyBrandsLayoutClass();
    return;
  }
  if (!tabs.includes(brandsCategory)) brandsCategory = "Semua";
  track.innerHTML = tabs
    .map(
      (name) =>
        `<button type="button" class="sjs-brands-cat${
          name === brandsCategory ? " is-active" : ""
        }" data-category="${escapeHtml(name)}" role="tab" aria-selected="${
          name === brandsCategory ? "true" : "false"
        }">${escapeHtml(name)}</button>`
    )
    .join("");
  applyBrandsLayoutClass();
}

async function loadBrandsIntro() {
  const kickerEl = document.getElementById("brandsIntroKicker");
  const titleEl = document.getElementById("brandsIntroTitle");
  const descEl = document.getElementById("brandsIntroDescription");
  if (!kickerEl && !titleEl && !descEl) return;
  try {
    const settings = await loadSettings({ fresh: true });
    const page = settings?.brandsPage || {};
    brandsLayout = page.layout === "logo" ? "logo" : "cover";
    if (kickerEl && page.kicker) kickerEl.textContent = page.kicker;
    if (titleEl && page.title) titleEl.textContent = page.title;
    if (titleEl && page.titleColor) titleEl.style.color = page.titleColor;
    if (descEl && page.description) descEl.textContent = page.description;
  } catch (error) {
    // keep default HTML copy
  }
  applyBrandsLayoutClass();
}

async function loadPublicBrands() {
  const grid = document.getElementById("brandsGrid");
  if (!grid) return;
  try {
    const brands = await apiFetch("/brands");
    if (!Array.isArray(brands) || brands.length === 0) {
      publicBrands = [];
      renderBrandTabs([]);
      grid.innerHTML =
        '<p class="empty-state" style="grid-column:1/-1;text-align:center;">Belum ada merek. Admin dapat menambahkannya di menu Merek.</p>';
      return;
    }
    publicBrands = brands;
    renderBrandTabs(brands);
    renderBrandTiles(brands);
  } catch (error) {
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;text-align:center;color:#b91c1c;">Gagal memuat merek: ${escapeHtml(
      error.message
    )}</p>`;
  }
}

document.getElementById("brandsCatsTrack")?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-category]");
  if (!btn) return;
  brandsCategory = btn.dataset.category || "Semua";
  renderBrandTabs(publicBrands);
  renderBrandTiles(publicBrands);
});

function scrollBrandCats(direction) {
  const track = document.getElementById("brandsCatsTrack");
  if (!track) return;
  track.scrollBy({ left: direction * Math.max(180, track.clientWidth * 0.6), behavior: "smooth" });
}

document.getElementById("brandsCatsPrev")?.addEventListener("click", () => scrollBrandCats(-1));
document.getElementById("brandsCatsNext")?.addEventListener("click", () => scrollBrandCats(1));

loadBrandsIntro().then(loadPublicBrands);
