const DEFAULT_LAYANAN_PAGE = {
  title: "Layanan Kami",
  menuAllLabel: "Lihat semua layanan",
  backLabel: "Semua layanan",
  dropTitle: "Tarik berkas ke sini atau klik untuk memilih",
  sasaButton: "Chat Sasa sekarang",
  successTitle: "Permintaan terkirim",
  successText: "Simpan nomor tiket ini. Tim SJS akan menghubungi via WhatsApp dalam 1 hari kerja.",
  ctaTitle: "Ada pertanyaan seputar material?",
  ctaText:
    "Butuh informasi produk, saran pemilihan material, atau bantuan terkait pesanan? Tim SJS siap membantu.",
  ctaButton: "Hubungi Kami",
  cards: [
    {
      id: "kerjasama",
      title: "Kerja Sama Bisnis",
      text: "Bangun kerja sama bersama SJS untuk kebutuhan pasokan material rutin, harga khusus mitra, dan dukungan bisnis jangka panjang.",
      menuText: "Kemitraan grosir, kontraktor, dan reseller",
    },
    {
      id: "custom",
      title: "Pesanan Proyek & Custom",
      text: "Punya kebutuhan ukuran khusus, volume besar, atau spesifikasi di luar katalog? Sampaikan detail proyekmu untuk mendapatkan penawaran yang sesuai.",
      menuText: "Ukuran potong, volume proyek, spek khusus",
    },
    {
      id: "komplain",
      title: "Pengembalian & Komplain",
      text: "Ada kendala dengan pesananmu? Siapkan nomor pesanan dan foto produk agar tim kami dapat membantu meninjau pengajuanmu sesuai kebijakan yang berlaku.",
      menuText: "Klaim rusak, salah kirim, atau kualitas",
    },
    {
      id: "konsultasi",
      title: "Konsultasi Produk",
      text: "Masih bingung memilih material yang tepat? Ceritakan kebutuhan furniture, interior, atau konstruksi kamu. Tim kami siap membantu menemukan pilihan yang sesuai.",
      menuText: "Saran jenis papan untuk kebutuhan Anda",
    },
  ],
  forms: {
    kerjasama: {
      title: "Kerja Sama Bisnis",
      intro:
        "Untuk kontraktor, furniture, dan reseller yang butuh pasokan rutin. Isi data di bawah, tim kami akan menghubungi untuk skema harga dan stok.",
      note: "",
      submit: "Ajukan kemitraan",
      fields: [
        {
          name: "partnershipType",
          label: "Jenis kemitraan",
          options: [
            { value: "distributor", label: "Distributor" },
            { value: "kontraktor", label: "Kontraktor proyek" },
            { value: "furniture", label: "Furniture / woodworking" },
            { value: "reseller", label: "Reseller" },
            { value: "lain", label: "Lainnya" },
          ],
        },
        { name: "company", label: "Nama perusahaan", placeholder: "PT / CV / toko" },
        { name: "name", label: "Nama lengkap", placeholder: "Nama penanggung jawab" },
        { name: "roleTitle", label: "Jabatan", placeholder: "Pemilik, purchasing, ..." },
        { name: "email", label: "E-mail", placeholder: "nama@perusahaan.com" },
        { name: "phone", label: "WhatsApp", placeholder: "08xxxxxxxxxx" },
        { name: "city", label: "Kota / wilayah operasi", placeholder: "Contoh: Surabaya" },
        {
          name: "businessRole",
          label: "Business Role",
          options: [
            { value: "supplier", label: "Supplier" },
            { value: "distributor", label: "Distributor" },
            { value: "operasional", label: "Operasional (Event, Exhibition, etc)" },
          ],
        },
        { name: "boardTypes", label: "Jenis papan yang dicari", placeholder: "Plywood, blockboard, particle, MDF, ..." },
        {
          name: "message",
          label: "Pesan singkat",
          placeholder: "Ceritakan kebutuhan pasokan, merek, atau proyek yang sedang berjalan.",
        },
        {
          name: "file",
          label: "Lampiran (opsional)",
          hint: "Company profile atau NPWP — PDF, JPG, PNG, Excel. Maks. 10 MB.",
        },
      ],
    },
    custom: {
      title: "Pesanan Proyek & Custom",
      intro:
        "Butuh ukuran potong, volume proyek, atau spek di luar katalog? Kirim kebutuhan Anda — ini permintaan penawaran, bukan checkout keranjang.",
      note: "Untuk belanja stok katalog, gunakan keranjang di toko. Form ini untuk spek khusus atau kuantitas proyek.",
      submit: "Minta penawaran",
      fields: [
        { name: "name", label: "Nama lengkap", placeholder: "Nama pemesan" },
        { name: "company", label: "Nama perusahaan / toko", placeholder: "Opsional" },
        { name: "email", label: "E-mail", placeholder: "nama@email.com" },
        { name: "phone", label: "WhatsApp", placeholder: "08xxxxxxxxxx" },
        { name: "city", label: "Kota pengiriman", placeholder: "Kota / kecamatan" },
        {
          name: "orderKind",
          label: "Jenis pesanan",
          options: [
            { value: "custom-cut", label: "Custom cut / potong ukuran" },
            { value: "proyek", label: "Volume proyek" },
            { value: "retail-besar", label: "Retail jumlah besar" },
          ],
        },
        {
          name: "boardType",
          label: "Jenis papan",
          options: [
            { value: "plywood", label: "Plywood" },
            { value: "blockboard", label: "Blockboard" },
            { value: "particle", label: "Particle board" },
            { value: "mdf", label: "MDF" },
            { value: "lain", label: "Lainnya" },
          ],
        },
        { name: "thickness", label: "Ketebalan", placeholder: "Contoh: 18 mm" },
        { name: "size", label: "Ukuran (P × L)", placeholder: "Contoh: 2440 × 1220 mm" },
        { name: "qty", label: "Jumlah", placeholder: "Lembar / m³" },
        { name: "deadline", label: "Deadline dibutuhkan" },
        {
          name: "message",
          label: "Catatan proyek",
          placeholder: "Contoh: kitchen set 12 unit, interior kantor, finishing HPL, dll.",
        },
        {
          name: "file",
          label: "Lampiran denah / spek (opsional)",
          hint: "Gambar kerja, PDF, atau Excel. Maks. 10 MB.",
        },
      ],
    },
    komplain: {
      title: "Pengembalian & Komplain",
      intro: "Siapkan nomor pesanan dan foto barang. Klaim diproses sesuai kebijakan pengembalian SJS.",
      note: "Foto kondisi barang wajib. Klaim biasanya untuk kerusakan kirim, salah barang, atau masalah kualitas.",
      submit: "Ajukan klaim",
      fields: [
        { name: "name", label: "Nama lengkap", placeholder: "Nama di pesanan" },
        { name: "phone", label: "WhatsApp", placeholder: "08xxxxxxxxxx" },
        { name: "email", label: "E-mail", placeholder: "Opsional" },
        { name: "orderNumber", label: "Nomor pesanan", placeholder: "Contoh: 128" },
        {
          name: "claimType",
          label: "Jenis klaim",
          options: [
            { value: "rusak", label: "Rusak saat kirim" },
            { value: "salah", label: "Salah barang / ukuran" },
            { value: "kualitas", label: "Masalah kualitas" },
            { value: "lain", label: "Lainnya" },
          ],
        },
        {
          name: "expectation",
          label: "Harapan penyelesaian",
          options: [
            { value: "ganti", label: "Ganti barang" },
            { value: "retur", label: "Retur / pengembalian" },
            { value: "perbaikan", label: "Perbaikan" },
          ],
        },
        {
          name: "message",
          label: "Deskripsi masalah",
          placeholder: "Jelaskan kondisi barang dan kapan diterima.",
        },
        { name: "file", label: "Foto barang", hint: "Minimal 1 foto. JPG atau PNG, maks. 10 MB." },
      ],
    },
    konsultasi: {
      title: "Konsultasi Produk",
      intro:
        "Belum yakin papan mana untuk furniture, interior, atau konstruksi? Tulis kebutuhan Anda, atau tanya Sasa untuk jawaban cepat.",
      note: "",
      submit: "Kirim konsultasi",
      fields: [
        {
          name: "goal",
          label: "Tujuan konsultasi",
          options: [
            { value: "pilih-papan", label: "Pilih jenis papan" },
            { value: "aplikasi", label: "Kebutuhan aplikasi / pemakaian" },
            { value: "harga", label: "Estimasi harga kasar" },
          ],
        },
        {
          name: "application",
          label: "Aplikasi",
          options: [
            { value: "furniture", label: "Furniture" },
            { value: "interior", label: "Interior" },
            { value: "konstruksi", label: "Konstruksi" },
            { value: "packing", label: "Packing" },
            { value: "lain", label: "Lainnya" },
          ],
        },
        { name: "name", label: "Nama lengkap", placeholder: "Nama Anda" },
        { name: "phone", label: "WhatsApp", placeholder: "08xxxxxxxxxx" },
        { name: "email", label: "E-mail", placeholder: "Opsional" },
        {
          name: "message",
          label: "Pertanyaan",
          placeholder: "Ceritakan pemakaian, ukuran, atau merek yang Anda pertimbangkan.",
        },
      ],
    },
  },
};

function clip(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function textOrDefault(value, fallback, max) {
  const next = clip(value, max);
  return next || fallback;
}

function textAllowEmpty(value, fallback, max) {
  if (value == null) return fallback;
  return clip(value, max);
}

function normalizeLayananPage(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourceCards = Array.isArray(source.cards) ? source.cards : [];
  const sourceForms = source.forms && typeof source.forms === "object" ? source.forms : {};

  const cards = DEFAULT_LAYANAN_PAGE.cards.map((card) => {
    const found = sourceCards.find((item) => item && item.id === card.id) || {};
    return {
      id: card.id,
      title: textOrDefault(found.title, card.title, 80),
      text: textOrDefault(found.text, card.text, 500),
      menuText: textOrDefault(found.menuText, card.menuText, 140),
    };
  });

  const forms = {};
  Object.entries(DEFAULT_LAYANAN_PAGE.forms).forEach(([id, form]) => {
    const src = sourceForms[id] && typeof sourceForms[id] === "object" ? sourceForms[id] : {};
    const srcFields = Array.isArray(src.fields) ? src.fields : [];
    forms[id] = {
      title: textOrDefault(src.title, form.title, 80),
      intro: textOrDefault(src.intro, form.intro, 600),
      note: textAllowEmpty(src.note, form.note, 400),
      submit: textOrDefault(src.submit, form.submit, 60),
      fields: form.fields.map((field) => {
        const found = srcFields.find((item) => item && item.name === field.name) || {};
        const next = {
          name: field.name,
          label: textOrDefault(found.label, field.label, 120),
        };
        if ("placeholder" in field) {
          next.placeholder = textAllowEmpty(found.placeholder, field.placeholder || "", 200);
        }
        if ("hint" in field) {
          next.hint = textAllowEmpty(found.hint, field.hint || "", 240);
        }
        if (Array.isArray(field.options)) {
          const srcOptions = Array.isArray(found.options) ? found.options : [];
          next.options = field.options.map((option) => {
            const match = srcOptions.find((item) => item && item.value === option.value) || {};
            return {
              value: option.value,
              label: textOrDefault(match.label, option.label, 120),
            };
          });
        }
        return next;
      }),
    };
  });

  return {
    title: textOrDefault(source.title, DEFAULT_LAYANAN_PAGE.title, 80),
    menuAllLabel: textOrDefault(source.menuAllLabel, DEFAULT_LAYANAN_PAGE.menuAllLabel, 80),
    backLabel: textOrDefault(source.backLabel, DEFAULT_LAYANAN_PAGE.backLabel, 80),
    dropTitle: textOrDefault(source.dropTitle, DEFAULT_LAYANAN_PAGE.dropTitle, 120),
    sasaButton: textOrDefault(source.sasaButton, DEFAULT_LAYANAN_PAGE.sasaButton, 60),
    successTitle: textOrDefault(source.successTitle, DEFAULT_LAYANAN_PAGE.successTitle, 80),
    successText: textOrDefault(source.successText, DEFAULT_LAYANAN_PAGE.successText, 300),
    ctaTitle: textOrDefault(source.ctaTitle, DEFAULT_LAYANAN_PAGE.ctaTitle, 120),
    ctaText: textOrDefault(source.ctaText, DEFAULT_LAYANAN_PAGE.ctaText, 400),
    ctaButton: textOrDefault(source.ctaButton, DEFAULT_LAYANAN_PAGE.ctaButton, 40),
    cards,
    forms,
  };
}

module.exports = { DEFAULT_LAYANAN_PAGE, normalizeLayananPage };
