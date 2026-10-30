(function initArtikelPages() {
  const CATEGORY_LABEL = {
    berita: "Berita",
    tips: "Tips & Panduan",
    inspirasi: "Inspirasi",
    tren: "Tren & Desain",
  };
  const PAGE_SIZE = 9;

  function formatArticleDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  function isArticleHeading(block) {
    const line = block.trim();
    if (!line || line.includes("\n")) return false;
    if (line.length < 8 || line.length > 90) return false;
    return !/[.!;:]$/.test(line);
  }

  function renderArticleBody(text) {
    const blocks = String(text || "")
      .trim()
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
    const html = blocks
      .map((block) => {
        if (isArticleHeading(block)) {
          const tag = /^\d+\.\s/.test(block) ? "h3" : "h2";
          return `<${tag}>${escapeHtml(block)}</${tag}>`;
        }
        return `<p>${escapeHtml(block).replace(/\n+/g, " ")}</p>`;
      })
      .join("");
    return html || "<p></p>";
  }

  function renderRelatedArticles(articles, current) {
    const others = articles.filter((item) => item.slug && item.slug !== current.slug);
    const same = others.filter((item) => item.category === current.category);
    const rest = others.filter((item) => item.category !== current.category);
    const picks = [...same, ...rest].slice(0, 3);
    if (!picks.length) return "";
    const cards = picks
      .map((item) => {
        const cover = item.coverUrl
          ? `<img src="${escapeHtml(item.coverUrl)}" alt="">`
          : `<span class="artikel-related-cover-empty" aria-hidden="true"></span>`;
        return `<a class="artikel-related-card" href="/artikel-detail.html?slug=${encodeURIComponent(item.slug)}">
          ${cover}
          <span>${escapeHtml(item.title)}</span>
        </a>`;
      })
      .join("");
    return `<section class="artikel-related" aria-label="Rekomendasi Artikel">
      <h2>Rekomendasi Artikel</h2>
      <div class="artikel-related-grid">${cards}</div>
    </section>`;
  }

  function articlePageHref(kategori, page) {
    const params = new URLSearchParams();
    if (kategori) params.set("kategori", kategori);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/artikel.html?${query}` : "/artikel.html";
  }

  function renderArticlePager(kategori, page, pageCount) {
    const pager = document.getElementById("artikelPager");
    if (!pager) return;
    if (pageCount <= 1) {
      pager.innerHTML = "";
      pager.hidden = true;
      return;
    }
    const pages =
      pageCount <= 7
        ? Array.from({ length: pageCount }, (_, index) => index + 1)
        : (() => {
            const set = new Set(
              [1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount)
            );
            const list = [...set].sort((a, b) => a - b);
            const out = [];
            list.forEach((value, index) => {
              if (index && value - list[index - 1] > 1) out.push("…");
              out.push(value);
            });
            return out;
          })();
    const prev =
      page > 1
        ? `<a href="${articlePageHref(kategori, page - 1)}" aria-label="Halaman sebelumnya">‹</a>`
        : `<button type="button" disabled aria-label="Halaman sebelumnya">‹</button>`;
    const next =
      page < pageCount
        ? `<a href="${articlePageHref(kategori, page + 1)}" aria-label="Halaman berikutnya">›</a>`
        : `<button type="button" disabled aria-label="Halaman berikutnya">›</button>`;
    pager.hidden = false;
    pager.innerHTML = `${prev}${pages
      .map((value) =>
        value === "…"
          ? `<span class="catalog-ellipsis">…</span>`
          : `<a href="${articlePageHref(kategori, value)}" class="${value === page ? "is-current" : ""}"${
              value === page ? ' aria-current="page"' : ""
            }>${value}</a>`
      )
      .join("")}${next}`;
  }

  async function loadArticleList() {
    const grid = document.getElementById("artikelGrid");
    if (!grid) return;
    const params = new URLSearchParams(location.search);
    const rawKategori = params.get("kategori") || "";
    const kategori = Object.prototype.hasOwnProperty.call(CATEGORY_LABEL, rawKategori) ? rawKategori : "";
    const requestedPage = Math.max(1, Number(params.get("page")) || 1);
    document.querySelectorAll("#artikelFilters .artikel-filter").forEach((el) => {
      el.classList.toggle("is-active", (el.dataset.kategori || "") === kategori);
    });
    try {
      const query = kategori ? `?category=${encodeURIComponent(kategori)}` : "";
      const articles = await apiFetch(`/articles${query}`);
      if (!Array.isArray(articles) || articles.length === 0) {
        grid.innerHTML =
          '<p class="empty-state" style="grid-column:1/-1;text-align:center;">Belum ada artikel. Admin dapat menulisnya di menu Artikel.</p>';
        renderArticlePager(kategori, 1, 0);
        return;
      }
      const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
      const page = Math.min(requestedPage, pageCount);
      const visible = articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      grid.innerHTML = visible
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
            </span>
          </a>`;
        })
        .join("");
      renderArticlePager(kategori, page, pageCount);
    } catch (error) {
      grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;text-align:center;color:#b91c1c;">Gagal memuat artikel: ${escapeHtml(
        error.message
      )}</p>`;
      renderArticlePager("", 1, 0);
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
      let related = [];
      try {
        const list = await apiFetch("/articles");
        if (Array.isArray(list)) related = list;
      } catch {
        related = [];
      }
      const cover = article.coverUrl
        ? `<img class="artikel-view-cover" src="${escapeHtml(article.coverUrl)}" alt="">`
        : `<span class="artikel-view-cover artikel-view-cover-empty" aria-hidden="true"></span>`;
      shell.innerHTML = `${cover}
        <div class="artikel-detail-body">
          <h1>${escapeHtml(article.title)}</h1>
          <div class="artikel-card-meta">
            <span class="artikel-pill">${escapeHtml(CATEGORY_LABEL[article.category] || article.category)}</span>
            <span>${escapeHtml(formatArticleDate(article.publishedAt))}</span>
          </div>
          <div class="artikel-content">${renderArticleBody(article.body)}</div>
          ${renderRelatedArticles(related, article)}
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
