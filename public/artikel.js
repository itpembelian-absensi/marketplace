(function initArtikelPages() {
  const CATEGORY_LABEL = { berita: "Berita", tips: "Tips" };

  function formatArticleDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  function renderArticleBody(text) {
    const blocks = String(text || "")
      .trim()
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);
    return blocks.join("") || "<p></p>";
  }

  async function loadArticleList() {
    const grid = document.getElementById("artikelGrid");
    if (!grid) return;
    const kategori = new URLSearchParams(location.search).get("kategori") || "";
    document.querySelectorAll("#artikelFilters .artikel-filter").forEach((el) => {
      el.classList.toggle("is-active", (el.dataset.kategori || "") === kategori);
    });
    try {
      const query = kategori === "berita" || kategori === "tips" ? `?category=${kategori}` : "";
      const articles = await apiFetch(`/articles${query}`);
      if (!Array.isArray(articles) || articles.length === 0) {
        grid.innerHTML =
          '<p class="empty-state" style="grid-column:1/-1;text-align:center;">Belum ada artikel. Admin dapat menulisnya di menu Artikel.</p>';
        return;
      }
      grid.innerHTML = articles
        .map((item) => {
          const cover = item.coverUrl
            ? `<img class="artikel-card-cover" src="${escapeHtml(item.coverUrl)}" alt="">`
            : `<span class="artikel-card-cover-empty" aria-hidden="true"></span>`;
          return `<a class="artikel-card" href="/artikel-detail.html?slug=${encodeURIComponent(item.slug)}">
            ${cover}
            <span class="artikel-card-body">
              <span class="artikel-card-meta">
                <span class="artikel-pill">${escapeHtml(CATEGORY_LABEL[item.category] || item.category)}</span>
                <span>${escapeHtml(formatArticleDate(item.publishedAt))}</span>
              </span>
              <h2>${escapeHtml(item.title)}</h2>
              <p>${escapeHtml(item.excerpt || "")}</p>
            </span>
          </a>`;
        })
        .join("");
    } catch (error) {
      grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;text-align:center;color:#b91c1c;">Gagal memuat artikel: ${escapeHtml(
        error.message
      )}</p>`;
    }
  }

  async function loadArticleDetail() {
    const shell = document.getElementById("artikelDetail");
    if (!shell) return;
    const slug = new URLSearchParams(location.search).get("slug") || "";
    if (!slug) {
      shell.innerHTML =
        '<p class="empty-state" style="padding:24px;text-align:center;">Artikel tidak ditemukan. <a href="/artikel.html">Kembali</a></p>';
      return;
    }
    try {
      const article = await apiFetch(`/articles/${encodeURIComponent(slug)}`);
      document.title = `${article.title} - PT Sahabat Jaya Sukses`;
      const cover = article.coverUrl
        ? `<img class="artikel-detail-cover" src="${escapeHtml(article.coverUrl)}" alt="">`
        : "";
      shell.innerHTML = `${cover}
        <div class="artikel-detail-body">
          <div class="artikel-card-meta">
            <span class="artikel-pill">${escapeHtml(CATEGORY_LABEL[article.category] || article.category)}</span>
            <span>${escapeHtml(formatArticleDate(article.publishedAt))}</span>
          </div>
          <h1>${escapeHtml(article.title)}</h1>
          <div class="artikel-content">${renderArticleBody(article.body)}</div>
        </div>`;
    } catch (error) {
      shell.innerHTML = `<p class="empty-state" style="padding:24px;text-align:center;color:#b91c1c;">${escapeHtml(
        error.message
      )} <a href="/artikel.html">Kembali</a></p>`;
    }
  }

  loadArticleList();
  loadArticleDetail();
})();
