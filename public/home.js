const heroTrack = document.getElementById("heroTrack");
const heroDots = document.getElementById("heroDots");
const heroPrev = document.getElementById("heroPrev");
const heroNext = document.getElementById("heroNext");
const exploreTitle = document.getElementById("exploreTitle");
const exploreTrack = document.getElementById("exploreTrack");
const exploreCta = document.getElementById("exploreCta");
const explorePrev = document.getElementById("explorePrev");
const exploreNext = document.getElementById("exploreNext");
const shipTitle = document.getElementById("shipTitle");
const shipSubtitle = document.getElementById("shipSubtitle");
const shipCta = document.getElementById("shipCta");
const shipMap = document.getElementById("shipMap");
const shipCards = document.getElementById("shipCards");
const showcaseTiles = document.getElementById("showcaseTiles");
const showcaseBanner = document.getElementById("showcaseBanner");
const footerNewsletterTitle = document.getElementById("footerNewsletterTitle");
const footerNewsletterText = document.getElementById("footerNewsletterText");
const footerNewsletterLabel = document.getElementById("footerNewsletterLabel");
const footerNewsletterEmail = document.getElementById("footerNewsletterEmail");
const footerNewsletterBtn = document.getElementById("footerNewsletterBtn");
const footerNewsletterForm = document.getElementById("footerNewsletterForm");
const footerNewsletterMessage = document.getElementById("footerNewsletterMessage");
const footerSocial = document.getElementById("footerSocial");
const footerAddress = document.getElementById("footerAddress");
const footerColumns = document.getElementById("footerColumns");
const footerCopyright = document.getElementById("footerCopyright");

let currentSlide = 0;
let slideCount = 0;
let autoplayTimer = null;

const ARROW_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

const DEFAULT_SLIDES = [
  {
    imageUrl: "/home/hero.jpg",
    title: "Beragam Material,\nBanyak Kemungkinan",
    subtitle: "Temukan material untuk berbagai kebutuhan,\ndari konstruksi furnitur hingga detail interior",
    ctaText: "Jelajahi Produk",
    ctaLink: "/shop.html",
    footnote: "",
  },
];

const DEFAULT_EXPLORE = {
  title: "Jelajahi Produk",
  ctaText: "Lihat Semua Produk",
  ctaLink: "/shop.html",
  items: [
    { imageUrl: "/home/cat-plywood.jpg", title: "Plywood", link: "/shop.html?q=plywood" },
    { imageUrl: "/home/cat-particle.jpg", title: "Particle Board", link: "/shop.html?q=particle" },
    { imageUrl: "/home/cat-mdf.jpg", title: "MDF", link: "/shop.html?q=mdf" },
    { imageUrl: "/home/cat-hmr.jpg", title: "HMR Board", link: "/shop.html?q=hmr" },
  ],
};

const DEFAULT_SHIPPING = {
  title: "Pengiriman\nke Berbagai\nWilayah",
  subtitle: "Menjangkau kebutuhan material untuk proyek di berbagai daerah Indonesia.",
  ctaText: "Pelajari Layanan",
  ctaLink: "/layanan.html",
  mapImageUrl: "/home/map-indonesia.png",
  cards: [
    {
      imageUrl: "/home/ship-stock.jpg",
      title: "Stok Terjaga, Siap Dikirim",
      description: "Ketersediaan material untuk membantu kebutuhan proyekmu tetap berjalan.",
    },
    {
      imageUrl: "/home/ship-fleet.jpg",
      title: "Dukungan Armada Pengiriman",
      description: "Didukung armada pengiriman untuk menjangkau berbagai wilayah sesuai cakupan layanan.",
    },
    {
      imageUrl: "/home/ship-coord.jpg",
      title: "Pengiriman yang Terkoordinasi",
      description: "Setiap pesanan dipersiapkan untuk mendukung proses pengiriman yang lebih teratur.",
    },
    {
      imageUrl: "/home/ship-team.jpg",
      title: "Tim Siap Membantu",
      description: "Tim kami siap membantu menemukan material dan informasi yang sesuai kebutuhanmu.",
    },
  ],
};

const DEFAULT_SHOWCASE = {
  tiles: [
    { imageUrl: "/home/show-plywood.jpg", title: "PLYWOOD", link: "/shop.html?q=plywood" },
    { imageUrl: "/home/show-hpl.jpg", title: "HPL", link: "/shop.html?q=hpl" },
  ],
  banner: {
    imageUrl: "/home/banner-blockboard.jpg",
    title: "Kenapa Blockboard Sering\nDigunakan untuk Pintu?",
    link: "/artikel.html",
  },
};

const SOCIAL_ICONS = {
  instagram: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.2 0 .5 0 .7.1v-3.2a5.8 5.8 0 1 0 5.8 5.8V8.8c1.1.8 2.4 1.2 3.7 1.2V7c-2 0-3.7-.8-5-2.1V3z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 9H4V20h2.5V9zM5.2 4A1.6 1.6 0 1 0 5.2 7.2 1.6 1.6 0 0 0 5.2 4zM20 20h-2.5v-5.6c0-1.6-.6-2.6-2-2.6-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V20H11V9h2.4v1.5c.4-.7 1.3-1.8 3.2-1.8 2.3 0 4 1.5 4 4.8V20z"/></svg>`,
  tokopedia: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 7V6a4 4 0 1 1 8 0v1h2.2c.5 0 .9.4.9.9l-1.1 12.2c-.1 1-.9 1.9-1.9 1.9H8c-1 0-1.8-.8-1.9-1.9L5 7.9c0-.5.4-.9.9-.9H8zm2 0h4V6a2 2 0 1 0-4 0v1z"/></svg>`,
};

const DEFAULT_FOOTER_SECTION = {
  newsletterTitle: "Ada yang Baru dari SJS",
  newsletterText: "Dapatkan inspirasi material, informasi produk, dan penawaran terbaru langsung ke emailmu.",
  emailLabel: "Alamat email",
  emailPlaceholder: "Masukan email Anda",
  buttonText: "Berlangganan",
  addressTitle: "Alamat",
  address:
    "Komplek Blok M2 No. 24 RT.13/RW.15\nPejagalan Penjaringan, Jl. Taman Permata\nIndah 2, RT.9/RW.15, Pejagalan DKI,\nJkt Utara, Daerah Khusus Ibukota\nJakarta 14450",
  socialLinks: [
    { platform: "instagram", url: "https://www.instagram.com/sahabatjayasukses/" },
    { platform: "facebook", url: "https://www.facebook.com/sahabatjayasukses" },
    { platform: "tiktok", url: "https://www.tiktok.com/@sahabatjayasukses" },
    { platform: "tokopedia", url: "" },
  ],
  columns: [
    {
      title: "Bantuan",
      links: [
        { label: "Cara Berbelanja", url: "#" },
        { label: "Pertanyaan Umum", url: "#" },
        { label: "Hubungi Kami", url: "/layanan-form.html?jenis=konsultasi" },
      ],
    },
    {
      title: "Kemitraan",
      links: [
        { label: "Pembelian Retail", url: "/layanan-form.html?jenis=custom" },
        { label: "Kerja Sama Bisnis", url: "/layanan-form.html?jenis=kerjasama" },
        { label: "Menjadi Mitra", url: "/layanan-form.html?jenis=kerjasama" },
      ],
    },
    {
      title: "Informasi",
      links: [
        { label: "Syarat & Ketentuan", url: "#" },
        { label: "Kebijakan Privasi", url: "#" },
        { label: "Pengembalian Produk", url: "/layanan-form.html?jenis=komplain" },
        { label: "Pengiriman", url: "/layanan.html" },
      ],
    },
  ],
  copyright: "© 2026 Sahabat Jaya Sukses. Semua hak dilindungi.",
};

const SHIP_TO_CITIES = [
  "Pancoran, Jakarta Selatan",
  "Penjaringan, Jakarta Utara",
  "Jakarta Pusat",
  "Jakarta Barat",
  "Jakarta Timur",
  "Tangerang",
  "Bekasi",
  "Depok",
  "Bandung",
  "Surabaya",
];

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function multilineHtml(str) {
  return escapeHtml(str).replace(/\n/g, "<br />");
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg)$/i.test(String(url || ""));
}

function waHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits || digits.includes("x")) return "";
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function renderSlides(slides) {
  if (!heroTrack) return;
  const list = slides.length ? slides : DEFAULT_SLIDES;
  slideCount = list.length;
  currentSlide = 0;

  heroTrack.innerHTML = list
    .map((slide) => {
      const bgStyle = slide.imageUrl && !isVideoUrl(slide.imageUrl)
        ? `background-image:url('${slide.imageUrl}')`
        : "";
      const videoHtml =
        slide.imageUrl && isVideoUrl(slide.imageUrl)
          ? `<video src="${escapeHtml(slide.imageUrl)}" autoplay loop muted playsinline></video>`
          : "";
      const ctaHtml = slide.ctaText
        ? `<a href="${escapeHtml(slide.ctaLink || "/shop.html")}" class="home-hero-cta">${escapeHtml(slide.ctaText)} ${ARROW_ICON}</a>`
        : "";
      const footnoteHtml = slide.footnote
        ? `<p class="home-hero-footnote">${escapeHtml(slide.footnote)}</p>`
        : "";

      return `
        <div class="home-hero-slide" style="${bgStyle}">
          ${videoHtml}
          <div class="home-hero-overlay">
            ${slide.title ? `<h1 class="home-hero-title">${multilineHtml(slide.title)}</h1>` : ""}
            ${slide.subtitle ? `<p class="home-hero-subtitle">${multilineHtml(slide.subtitle)}</p>` : ""}
            ${ctaHtml}
          </div>
          ${footnoteHtml}
        </div>`;
    })
    .join("");

  if (heroDots) {
    heroDots.innerHTML = list
      .map((_, i) => `<button type="button" class="home-hero-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`)
      .join("");
    heroDots.querySelectorAll(".home-hero-dot").forEach((dot) => {
      dot.addEventListener("click", () => goToSlide(Number(dot.dataset.index)));
    });
  }

  updateSlidePosition();
  resetAutoplay();
}

function updateSlidePosition() {
  if (!heroTrack) return;
  heroTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
  if (heroDots) {
    heroDots.querySelectorAll(".home-hero-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentSlide);
    });
  }
}

function goToSlide(index) {
  if (!slideCount) return;
  currentSlide = ((index % slideCount) + slideCount) % slideCount;
  updateSlidePosition();
  resetAutoplay();
}

function resetAutoplay() {
  if (autoplayTimer) clearInterval(autoplayTimer);
  if (slideCount <= 1) return;
  autoplayTimer = setInterval(() => goToSlide(currentSlide + 1), 6000);
}

function renderExplore(section) {
  if (!exploreTrack && !exploreTitle) return;
  const data = { ...DEFAULT_EXPLORE, ...(section || {}) };
  const items = Array.isArray(data.items) && data.items.length ? data.items : DEFAULT_EXPLORE.items;
  if (exploreTitle) exploreTitle.textContent = data.title || DEFAULT_EXPLORE.title;
  if (exploreCta) {
    exploreCta.textContent = data.ctaText || DEFAULT_EXPLORE.ctaText;
    exploreCta.href = data.ctaLink || DEFAULT_EXPLORE.ctaLink;
  }
  if (!exploreTrack) return;
  exploreTrack.innerHTML = items
    .map((item) => {
      const img = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || "Produk")}" />`
        : `<span class="home-explore-empty"></span>`;
      const inner = `${img}<span class="home-explore-name">${escapeHtml(item.title || "")}</span>`;
      if (item.link) return `<a class="home-explore-card" href="${escapeHtml(item.link)}">${inner}</a>`;
      return `<article class="home-explore-card">${inner}</article>`;
    })
    .join("");
}

function scrollExplore(direction) {
  if (!exploreTrack) return;
  const card = exploreTrack.querySelector(".home-explore-card");
  const distance = card ? card.getBoundingClientRect().width + 18 : exploreTrack.clientWidth * 0.8;
  exploreTrack.scrollBy({ left: direction * distance, behavior: "smooth" });
}

function renderShipping(section) {
  if (!shipTitle && !shipCards) return;
  const data = { ...DEFAULT_SHIPPING, ...(section || {}) };
  const cards = Array.isArray(data.cards) && data.cards.length ? data.cards : DEFAULT_SHIPPING.cards;
  if (shipTitle) shipTitle.innerHTML = multilineHtml(data.title || DEFAULT_SHIPPING.title);
  if (shipSubtitle) shipSubtitle.textContent = data.subtitle || DEFAULT_SHIPPING.subtitle;
  if (shipCta) {
    shipCta.textContent = data.ctaText || DEFAULT_SHIPPING.ctaText;
    shipCta.href = data.ctaLink || DEFAULT_SHIPPING.ctaLink;
  }
  if (shipMap) {
    const mapUrl = data.mapImageUrl || DEFAULT_SHIPPING.mapImageUrl;
    shipMap.innerHTML = mapUrl
      ? `<img src="${escapeHtml(mapUrl)}" alt="Peta jangkauan pengiriman" />`
      : "";
  }
  if (shipCards) {
    shipCards.innerHTML = cards
      .slice(0, 4)
      .map(
        (card) => `
        <article class="home-ship-card">
          ${card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="" />` : ""}
          <div class="home-ship-card-copy">
            <h3>${escapeHtml(card.title || "")}</h3>
            <p>${escapeHtml(card.description || "")}</p>
          </div>
        </article>`
      )
      .join("");
  }
}

function renderShowcase(section) {
  if (!showcaseTiles && !showcaseBanner) return;
  const data = {
    tiles: section?.tiles?.length ? section.tiles : DEFAULT_SHOWCASE.tiles,
    banner: { ...DEFAULT_SHOWCASE.banner, ...(section?.banner || {}) },
  };
  if (showcaseTiles) {
    showcaseTiles.innerHTML = data.tiles
      .slice(0, 2)
      .map((tile) => {
        const inner = `
          ${tile.imageUrl ? `<img src="${escapeHtml(tile.imageUrl)}" alt="" />` : ""}
          <span>${escapeHtml(tile.title || "")}</span>`;
        if (tile.link) return `<a class="home-showcase-tile" href="${escapeHtml(tile.link)}">${inner}</a>`;
        return `<article class="home-showcase-tile">${inner}</article>`;
      })
      .join("");
  }
  if (showcaseBanner) {
    const banner = data.banner;
    const inner = `
      ${banner.imageUrl ? `<img src="${escapeHtml(banner.imageUrl)}" alt="" />` : ""}
      <span>${multilineHtml(banner.title || "")}</span>`;
    showcaseBanner.innerHTML = banner.link
      ? `<a class="home-showcase-banner" href="${escapeHtml(banner.link)}">${inner}</a>`
      : `<article class="home-showcase-banner">${inner}</article>`;
  }
}

function renderFooterSection(footer) {
  const data = {
    ...DEFAULT_FOOTER_SECTION,
    ...(footer || {}),
    socialLinks:
      Array.isArray(footer?.socialLinks) && footer.socialLinks.length
        ? footer.socialLinks
        : DEFAULT_FOOTER_SECTION.socialLinks,
    columns:
      Array.isArray(footer?.columns) && footer.columns.length
        ? footer.columns
        : DEFAULT_FOOTER_SECTION.columns,
  };

  if (footerNewsletterTitle) {
    footerNewsletterTitle.innerHTML = multilineHtml(data.newsletterTitle || DEFAULT_FOOTER_SECTION.newsletterTitle);
  }
  if (footerNewsletterText) {
    footerNewsletterText.textContent = data.newsletterText || DEFAULT_FOOTER_SECTION.newsletterText;
  }
  if (footerNewsletterLabel) {
    footerNewsletterLabel.textContent = data.emailLabel || DEFAULT_FOOTER_SECTION.emailLabel;
  }
  if (footerNewsletterEmail) {
    footerNewsletterEmail.placeholder = data.emailPlaceholder || DEFAULT_FOOTER_SECTION.emailPlaceholder;
  }
  if (footerNewsletterBtn) {
    footerNewsletterBtn.innerHTML = `${escapeHtml(data.buttonText || "Berlangganan")} ${ARROW_ICON}`;
  }
  if (footerCopyright) {
    footerCopyright.textContent = data.copyright || DEFAULT_FOOTER_SECTION.copyright;
  }
  if (footerAddress) {
    footerAddress.innerHTML = `
      <h3>${escapeHtml(data.addressTitle || "Alamat")}</h3>
      <p>${multilineHtml(data.address || "")}</p>`;
  }
  if (footerSocial) {
    const socials = data.socialLinks.filter((item) => item?.url && item.url !== "#");
    footerSocial.innerHTML = socials
      .map((item) => {
        const key = SOCIAL_ICONS[item.platform] ? item.platform : "instagram";
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return `<a href="${escapeHtml(item.url)}" class="home-footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="${label}">${SOCIAL_ICONS[key]}</a>`;
      })
      .join("");
  }
  if (footerColumns) {
    footerColumns.innerHTML = data.columns
      .slice(0, 3)
      .map((col) => {
        const links = (col.links || [])
          .filter((link) => link?.label)
          .map((link) => `<li><a href="${escapeHtml(link.url || "#")}">${escapeHtml(link.label || "")}</a></li>`)
          .join("");
        return `
          <div class="home-footer-col">
            <h3>${escapeHtml(col.title || "")}</h3>
            <ul>${links}</ul>
          </div>`;
      })
      .join("");
  }
}

function bindNewsletterForm() {
  if (!footerNewsletterForm) return;
  footerNewsletterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = footerNewsletterEmail?.value.trim() || "";
    if (!email) return;

    if (footerNewsletterMessage) {
      footerNewsletterMessage.classList.remove("hidden", "is-error", "is-success");
      footerNewsletterMessage.textContent = "Mengirim...";
    }
    if (footerNewsletterBtn) footerNewsletterBtn.disabled = true;

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Gagal mendaftarkan e-mail.");
      if (footerNewsletterMessage) {
        footerNewsletterMessage.classList.add("is-success");
        footerNewsletterMessage.textContent = data.message || "Terima kasih! E-mail berhasil didaftarkan.";
      }
      footerNewsletterForm.reset();
    } catch (error) {
      if (footerNewsletterMessage) {
        footerNewsletterMessage.classList.add("is-error");
        footerNewsletterMessage.textContent = error.message;
      }
    } finally {
      if (footerNewsletterBtn) footerNewsletterBtn.disabled = false;
      if (footerNewsletterMessage) footerNewsletterMessage.classList.remove("hidden");
    }
  });
}

function bindShipTo() {
  const button = document.getElementById("shipToButton");
  const menu = document.getElementById("shipToMenu");
  const label = document.getElementById("shipToLabel");
  const list = document.getElementById("shipToList");
  const input = document.getElementById("shipToInput");
  if (!button || !menu || !label) return;

  const saved = localStorage.getItem("sjs_ship_city") || "Pancoran, Jakarta Selatan";
  label.textContent = saved;

  if (list) {
    list.innerHTML = SHIP_TO_CITIES.map(
      (city) => `<button type="button" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>`
    ).join("");
    list.addEventListener("click", (event) => {
      const city = event.target?.dataset?.city;
      if (!city) return;
      label.textContent = city;
      localStorage.setItem("sjs_ship_city", city);
      menu.classList.add("hidden");
    });
  }

  button.addEventListener("click", () => {
    menu.classList.toggle("hidden");
    if (input) input.value = label.textContent;
  });

  input?.form?.addEventListener("submit", (event) => event.preventDefault());
  document.getElementById("shipToSave")?.addEventListener("click", () => {
    const city = input?.value.trim();
    if (!city) return;
    label.textContent = city;
    localStorage.setItem("sjs_ship_city", city);
    menu.classList.add("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#shipToWrap")) menu.classList.add("hidden");
  });
}

function applyHeaderContact(settings) {
  const wa = document.getElementById("headerWaLink");
  if (!wa) return;
  const phone = settings?.whatsappBotNumber || settings?.companyProfile?.phone || "";
  const href = waHref(phone);
  if (href) {
    wa.href = href;
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
  }
}

async function loadHomePage() {
  try {
    const settings = await loadSettings({ fresh: true });
    const home = settings?.homePage || {};
    const profile = settings?.companyProfile || {};

    const nameEl = document.getElementById("companyNameText");
    const taglineEl = document.getElementById("companyTaglineText");
    if (nameEl && profile.name) nameEl.textContent = profile.name;
    if (taglineEl) taglineEl.textContent = home.tagline || profile.tagline || taglineEl.textContent;

    renderSlides(home.slides || DEFAULT_SLIDES);
    renderExplore(home.exploreSection);
    renderShipping(home.shippingSection);
    renderShowcase(home.showcaseSection);
    renderFooterSection(home.footerSection);
    applyHeaderContact(settings);

    const waWidget = document.getElementById("whatsappChatWidget");
    if (waWidget) waWidget.style.display = "none";
  } catch (error) {
    renderSlides(DEFAULT_SLIDES);
    renderExplore(null);
    renderShipping(null);
    renderShowcase(null);
    renderFooterSection(null);
  }
}

if (heroPrev) heroPrev.addEventListener("click", () => goToSlide(currentSlide - 1));
if (heroNext) heroNext.addEventListener("click", () => goToSlide(currentSlide + 1));
if (explorePrev) explorePrev.addEventListener("click", () => scrollExplore(-1));
if (exploreNext) exploreNext.addEventListener("click", () => scrollExplore(1));

bindNewsletterForm();
bindShipTo();
loadHomePage();
