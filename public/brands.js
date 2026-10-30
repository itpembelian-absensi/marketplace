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
  document.body.classList.remove("brands-layout-logo");
  document.body.classList.add("brands-layout-cover");
  if (grid) grid.classList.remove("is-logo-grid");
  if (cats) cats.classList.add("hidden");
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
  grid.innerHTML = visible
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
          <a class="${classes}" href="/shop.html?q=${query}" title="${name}">
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
    document.documentElement.style.setProperty("--sjs-brand-card-bg", page.cardColor || "#ffffff");
    if (kickerEl && page.kicker) kickerEl.textContent = page.kicker;
    if (titleEl && page.title && page.title !== "Mitra & Merek Terpercaya untuk Kualitas Terbaik") {
      titleEl.textContent = page.title;
    }
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
