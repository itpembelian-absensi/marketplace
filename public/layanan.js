(function initLayananForm() {
  const formEl = document.getElementById("layananForm");
  if (!formEl) return;

  const FORMS = {
    kerjasama: {
      title: "Kerja Sama Bisnis",
      intro:
        "Untuk kontraktor, furniture, dan reseller yang butuh pasokan rutin. Isi data di bawah, tim kami akan menghubungi untuk skema harga dan stok.",
      submit: "Ajukan kemitraan",
      fields: [
        {
          name: "partnershipType",
          label: "Jenis kemitraan",
          type: "select",
          required: true,
          options: [
            { value: "distributor", label: "Distributor" },
            { value: "kontraktor", label: "Kontraktor proyek" },
            { value: "furniture", label: "Furniture / woodworking" },
            { value: "reseller", label: "Reseller" },
            { value: "lain", label: "Lainnya" },
          ],
        },
        { name: "company", label: "Nama perusahaan", type: "text", required: true, placeholder: "PT / CV / toko" },
        { name: "name", label: "Nama lengkap", type: "text", required: true, placeholder: "Nama penanggung jawab" },
        { name: "roleTitle", label: "Jabatan", type: "text", placeholder: "Pemilik, purchasing, ..." },
        { name: "email", label: "E-mail", type: "email", required: true, placeholder: "nama@perusahaan.com" },
        { name: "phone", label: "WhatsApp", type: "tel", required: true, placeholder: "08xxxxxxxxxx" },
        { name: "city", label: "Kota / wilayah operasi", type: "text", required: true, placeholder: "Contoh: Surabaya" },
        {
          name: "businessRole",
          label: "Business Role",
          type: "select",
          options: [
            { value: "supplier", label: "Supplier" },
            { value: "distributor", label: "Distributor" },
            { value: "operasional", label: "Operasional (Event, Exhibition, etc)" },
          ],
        },
        {
          name: "boardTypes",
          label: "Jenis papan yang dicari",
          type: "text",
          placeholder: "Plywood, blockboard, particle, MDF, ...",
        },
        {
          name: "message",
          label: "Pesan singkat",
          type: "textarea",
          required: true,
          full: true,
          placeholder: "Ceritakan kebutuhan pasokan, merek, atau proyek yang sedang berjalan.",
        },
        {
          name: "file",
          label: "Lampiran (opsional)",
          type: "file",
          full: true,
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
        { name: "name", label: "Nama lengkap", type: "text", required: true, placeholder: "Nama pemesan" },
        { name: "company", label: "Nama perusahaan / toko", type: "text", placeholder: "Opsional" },
        { name: "email", label: "E-mail", type: "email", required: true, placeholder: "nama@email.com" },
        { name: "phone", label: "WhatsApp", type: "tel", required: true, placeholder: "08xxxxxxxxxx" },
        { name: "city", label: "Kota pengiriman", type: "text", required: true, placeholder: "Kota / kecamatan" },
        {
          name: "orderKind",
          label: "Jenis pesanan",
          type: "select",
          required: true,
          options: [
            { value: "custom-cut", label: "Custom cut / potong ukuran" },
            { value: "proyek", label: "Volume proyek" },
            { value: "retail-besar", label: "Retail jumlah besar" },
          ],
        },
        {
          name: "boardType",
          label: "Jenis papan",
          type: "select",
          required: true,
          options: [
            { value: "plywood", label: "Plywood" },
            { value: "blockboard", label: "Blockboard" },
            { value: "particle", label: "Particle board" },
            { value: "mdf", label: "MDF" },
            { value: "lain", label: "Lainnya" },
          ],
        },
        { name: "thickness", label: "Ketebalan", type: "text", required: true, placeholder: "Contoh: 18 mm" },
        { name: "size", label: "Ukuran (P × L)", type: "text", required: true, placeholder: "Contoh: 2440 × 1220 mm" },
        { name: "qty", label: "Jumlah", type: "text", required: true, placeholder: "Lembar / m³" },
        { name: "deadline", label: "Deadline dibutuhkan", type: "date" },
        {
          name: "message",
          label: "Catatan proyek",
          type: "textarea",
          required: true,
          full: true,
          placeholder: "Contoh: kitchen set 12 unit, interior kantor, finishing HPL, dll.",
        },
        {
          name: "file",
          label: "Lampiran denah / spek (opsional)",
          type: "file",
          full: true,
          hint: "Gambar kerja, PDF, atau Excel. Maks. 10 MB.",
        },
      ],
    },
    komplain: {
      title: "Pengembalian & Komplain",
      intro: "Siapkan nomor pesanan dan foto barang. Klaim diproses sesuai kebijakan pengembalian SJS.",
      note: "Foto kondisi barang wajib. Klaim biasanya untuk kerusakan kirim, salah barang, atau masalah kualitas.",
      submit: "Ajukan klaim",
      fileRequired: true,
      fields: [
        { name: "name", label: "Nama lengkap", type: "text", required: true, placeholder: "Nama di pesanan" },
        { name: "phone", label: "WhatsApp", type: "tel", required: true, placeholder: "08xxxxxxxxxx" },
        { name: "email", label: "E-mail", type: "email", placeholder: "Opsional" },
        { name: "orderNumber", label: "Nomor pesanan", type: "text", required: true, placeholder: "Contoh: 128" },
        {
          name: "claimType",
          label: "Jenis klaim",
          type: "select",
          required: true,
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
          type: "select",
          required: true,
          options: [
            { value: "ganti", label: "Ganti barang" },
            { value: "retur", label: "Retur / pengembalian" },
            { value: "perbaikan", label: "Perbaikan" },
          ],
        },
        {
          name: "message",
          label: "Deskripsi masalah",
          type: "textarea",
          required: true,
          full: true,
          placeholder: "Jelaskan kondisi barang dan kapan diterima.",
        },
        {
          name: "file",
          label: "Foto barang",
          type: "file",
          required: true,
          full: true,
          hint: "Minimal 1 foto. JPG atau PNG, maks. 10 MB.",
          accept: "image/png,image/jpeg,image/webp",
        },
      ],
    },
    konsultasi: {
      title: "Konsultasi Produk",
      intro:
        "Belum yakin papan mana untuk furniture, interior, atau konstruksi? Tulis kebutuhan Anda, atau tanya Sasa untuk jawaban cepat.",
      submit: "Kirim konsultasi",
      sasa: true,
      fields: [
        {
          name: "goal",
          label: "Tujuan konsultasi",
          type: "select",
          required: true,
          options: [
            { value: "pilih-papan", label: "Pilih jenis papan" },
            { value: "aplikasi", label: "Kebutuhan aplikasi / pemakaian" },
            { value: "harga", label: "Estimasi harga kasar" },
          ],
        },
        {
          name: "application",
          label: "Aplikasi",
          type: "select",
          required: true,
          options: [
            { value: "furniture", label: "Furniture" },
            { value: "interior", label: "Interior" },
            { value: "konstruksi", label: "Konstruksi" },
            { value: "packing", label: "Packing" },
            { value: "lain", label: "Lainnya" },
          ],
        },
        { name: "name", label: "Nama lengkap", type: "text", required: true, placeholder: "Nama Anda" },
        { name: "phone", label: "WhatsApp", type: "tel", required: true, placeholder: "08xxxxxxxxxx" },
        { name: "email", label: "E-mail", type: "email", placeholder: "Opsional" },
        {
          name: "message",
          label: "Pertanyaan",
          type: "textarea",
          required: true,
          full: true,
          placeholder: "Ceritakan pemakaian, ukuran, atau merek yang Anda pertimbangkan.",
        },
      ],
    },
  };

  const jenis = new URLSearchParams(location.search).get("jenis") || "";
  const config = FORMS[jenis];
  const titleEl = document.getElementById("layananFormTitle");
  const introEl = document.getElementById("layananFormIntro");
  const noteEl = document.getElementById("layananNote");
  const successEl = document.getElementById("layananSuccess");

  if (!config) {
    document.title = "Layanan - PT Sahabat Jaya Sukses";
    formEl.remove();
    if (titleEl) titleEl.textContent = "Layanan tidak ditemukan";
    if (introEl) introEl.textContent = "Pilih salah satu layanan dari halaman utama.";
    const back = document.createElement("p");
    back.className = "layanan-unknown";
    back.innerHTML = '<a class="layanan-back" href="/layanan.html">Kembali ke semua layanan</a>';
    document.getElementById("layananShell")?.appendChild(back);
    return;
  }

  document.title = `${config.title} - PT Sahabat Jaya Sukses`;
  if (titleEl) titleEl.textContent = config.title;
  if (introEl) introEl.textContent = config.intro;
  if (noteEl && config.note) {
    noteEl.textContent = config.note;
    noteEl.classList.remove("hidden");
  }

  function fieldHtml(field) {
    const reqMark = field.required ? ' <span class="layanan-req">*</span>' : "";
    const full = field.full ? " is-full" : "";
    const req = field.required ? "required" : "";
    if (field.type === "select") {
      const options = (field.options || [])
        .map((opt) => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`)
        .join("");
      return `<div class="layanan-field${full}"><label for="${field.name}">${escapeHtml(field.label)}${reqMark}</label><select id="${field.name}" name="${field.name}" ${req}><option value="">Pilih...</option>${options}</select></div>`;
    }
    if (field.type === "textarea") {
      return `<div class="layanan-field${full}"><label for="${field.name}">${escapeHtml(field.label)}${reqMark}</label><textarea id="${field.name}" name="${field.name}" ${req} placeholder="${escapeHtml(field.placeholder || "")}"></textarea></div>`;
    }
    if (field.type === "file") {
      return `<div class="layanan-field${full}"><label>${escapeHtml(field.label)}${reqMark}</label><div class="layanan-dropzone" id="layananDropzone"><strong>Tarik berkas ke sini atau klik untuk memilih</strong><small>${escapeHtml(field.hint || "")}</small><div class="layanan-file-name hidden" id="layananFileName"></div></div><input type="file" id="layananFile" name="file" class="hidden" ${field.required ? "required" : ""} ${field.accept ? `accept="${field.accept}"` : 'accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx,application/pdf,image/*'} /></div>`;
    }
    return `<div class="layanan-field${full}"><label for="${field.name}">${escapeHtml(field.label)}${reqMark}</label><input type="${field.type}" id="${field.name}" name="${field.name}" ${req} placeholder="${escapeHtml(field.placeholder || "")}" /></div>`;
  }

  formEl.innerHTML = `<div class="layanan-fields">${config.fields.map(fieldHtml).join("")}</div>
    <p class="layanan-message hidden" id="layananMessage"></p>
    <div class="layanan-actions">
      <button type="submit" class="layanan-submit" id="layananSubmit">${escapeHtml(config.submit)}</button>
      ${config.sasa ? '<button type="button" class="layanan-secondary" id="layananOpenSasa">Chat Sasa sekarang</button>' : ""}
    </div>`;

  const fileInput = document.getElementById("layananFile");
  const dropzone = document.getElementById("layananDropzone");
  const fileNameEl = document.getElementById("layananFileName");
  const messageEl = document.getElementById("layananMessage");
  const submitBtn = document.getElementById("layananSubmit");

  function showFileName(file) {
    if (!fileNameEl) return;
    if (!file) {
      fileNameEl.classList.add("hidden");
      fileNameEl.textContent = "";
      return;
    }
    fileNameEl.classList.remove("hidden");
    fileNameEl.innerHTML = `${escapeHtml(file.name)} <button type="button" class="layanan-file-clear" id="layananFileClear">Hapus</button>`;
    document.getElementById("layananFileClear")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (fileInput) fileInput.value = "";
      showFileName(null);
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-drag");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-drag"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-drag");
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.files = transfer.files;
      showFileName(file);
    });
    fileInput.addEventListener("change", () => showFileName(fileInput.files?.[0] || null));
  }

  document.getElementById("layananOpenSasa")?.addEventListener("click", () => {
    if (window.SasaChat?.open) window.SasaChat.open();
    else document.getElementById("csChatToggle")?.click();
  });

  async function prefill() {
    const user = typeof getAuth === "function" ? getAuth()?.user : null;
    if (user?.name && formEl.elements.namedItem("name")) formEl.elements.namedItem("name").value = user.name;
    if (user?.email && formEl.elements.namedItem("email")) formEl.elements.namedItem("email").value = user.email;
    if (typeof apiFetch !== "function" || !getToken?.()) return;
    try {
      const addresses = await apiFetch("/addresses");
      const preferred = Array.isArray(addresses)
        ? addresses.find((row) => row.isDefault) || addresses[0]
        : null;
      if (preferred?.phone && formEl.elements.phone && !formEl.elements.phone.value) {
        formEl.elements.phone.value = preferred.phone;
      }
      if (preferred?.address && formEl.elements.city && !formEl.elements.city.value) {
        const cityGuess = String(preferred.address).split(",").pop()?.trim();
        if (cityGuess) formEl.elements.city.value = cityGuess;
      }
    } catch {
      /* guest / no address */
    }
  }

  prefill();

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (messageEl) {
      messageEl.classList.add("hidden");
      messageEl.textContent = "";
    }

    const missing = config.fields.find((field) => {
      if (!field.required || field.type === "file") return false;
      const el = formEl.elements[field.name];
      return !String(el?.value || "").trim();
    });
    if (missing) {
      if (messageEl) {
        messageEl.classList.remove("hidden");
        messageEl.classList.add("is-error");
        messageEl.textContent = `Lengkapi ${missing.label}.`;
      }
      formEl.elements[missing.name]?.focus();
      return;
    }
    if (config.fileRequired && !fileInput?.files?.[0]) {
      if (messageEl) {
        messageEl.classList.remove("hidden");
        messageEl.classList.add("is-error");
        messageEl.textContent = "Foto atau lampiran wajib diunggah.";
      }
      return;
    }

    const payload = new FormData();
    payload.append("type", jenis);
    config.fields.forEach((field) => {
      if (field.type === "file") return;
      payload.append(field.name, String(formEl.elements[field.name]?.value || "").trim());
    });
    if (fileInput?.files?.[0]) payload.append("file", fileInput.files[0]);

    submitBtn.disabled = true;
    try {
      const headers = {};
      const token = typeof getToken === "function" ? getToken() : "";
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch("/api/layanan", { method: "POST", headers, body: payload });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Gagal mengirim permintaan.");

      formEl.classList.add("hidden");
      if (noteEl) noteEl.classList.add("hidden");
      if (introEl) introEl.classList.add("hidden");
      successEl.classList.remove("hidden");
      successEl.innerHTML = `<h2>Permintaan terkirim</h2>
        <p>Simpan nomor tiket ini. Tim SJS akan menghubungi via WhatsApp dalam 1 hari kerja.</p>
        <div class="layanan-ticket">${escapeHtml(data.ticketCode || "")}</div>
        <p><a class="layanan-back" href="/layanan.html">Kembali ke semua layanan</a></p>`;
    } catch (error) {
      if (messageEl) {
        messageEl.classList.remove("hidden");
        messageEl.classList.add("is-error");
        messageEl.textContent = error.message || "Gagal mengirim. Coba lagi.";
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
