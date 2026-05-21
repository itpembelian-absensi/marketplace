const usersTable = document.getElementById("usersTable");
const usersMessage = document.getElementById("usersMessage");
const createUserForm = document.getElementById("createUserForm");
const createMessage = document.getElementById("createMessage");
const roleSelect = document.getElementById("roleSelect");
const logoForm = document.getElementById("logoForm");
const logoFile = document.getElementById("logoFile");
const logoMessage = document.getElementById("logoMessage");
const logoPreview = document.getElementById("logoPreview");
const menuMessage = document.getElementById("menuMessage");
const createCategoryForm = document.getElementById("createCategoryForm");
const categoryNameInput = document.getElementById("categoryName");
const createSubcategoryForm = document.getElementById("createSubcategoryForm");
const categorySelectForSub = document.getElementById("categorySelectForSub");
const subcategoryNameInput = document.getElementById("subcategoryName");
const menuList = document.getElementById("menuList");
const companyProfileForm = document.getElementById("companyProfileForm");
const companyProfileMessage = document.getElementById("companyProfileMessage");
const aboutInput = document.getElementById("aboutInput");
const visionInput = document.getElementById("visionInput");
const missionInput = document.getElementById("missionInput");
const contactEmailInput = document.getElementById("contactEmailInput");
const contactPhoneInput = document.getElementById("contactPhoneInput");
const contactAddressInput = document.getElementById("contactAddressInput");
const productForm = document.getElementById("productForm");
const productNameInput = document.getElementById("productName");
const productCategoryInput = document.getElementById("productCategory");
const productSubcategoryInput = document.getElementById("productSubcategory");
const productPriceInput = document.getElementById("productPrice");
const productDiscountInput = document.getElementById("productDiscount");
const productRatingInput = document.getElementById("productRating");
const productImageFileInput = document.getElementById("productImageFile");
const productWaPhoneInput = document.getElementById("productWaPhone");
const productDescriptionInput = document.getElementById("productDescription");
const productSubmitButton = document.getElementById("productSubmitButton");
const productCancelEditButton = document.getElementById("productCancelEdit");
const productsMessage = document.getElementById("productsMessage");
const productsList = document.getElementById("productsList");

const tabs = Array.from(document.querySelectorAll(".tab"));

const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;
let editingProductId = null;
let editingProductImageUrl = "";
let cachedMenuCategories = [];

function renderTable(users) {
  if (!users.length) {
    usersTable.innerHTML = '<p class="empty-state">Belum ada user.</p>';
    return;
  }

  const currentRole = getAuth()?.user?.role || "user";

  usersTable.innerHTML = `
    <div style="overflow:auto">
      <table style="width:100%; border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">ID</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Nama</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Email</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Role</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Dibuat</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map(
              (u) => `
              <tr>
                <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.id}</td>
                <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.name}</td>
                <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.email}</td>
                <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.role}</td>
                <td style="padding:8px; border-bottom:1px solid #f3f4f6">${u.created_at || ""}</td>
                <td style="padding:8px; border-bottom:1px solid #f3f4f6">
                  ${
                    currentRole === "admin"
                      ? `
                        <select data-action="change-role" data-user-id="${u.id}" style="padding:8px; border:1px solid #e5e7eb; border-radius:8px">
                          <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
                          <option value="manager" ${u.role === "manager" ? "selected" : ""}>manager</option>
                          <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
                        </select>
                      `
                      : `<span class="empty-state">-</span>`
                  }
                </td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadUsers() {
  usersMessage.textContent = "";
  try {
    const users = await apiFetch("/users");
    renderTable(users);
  } catch (error) {
    usersMessage.textContent = error.message;
  }
}

function applyRoleRulesToUI() {
  const role = getAuth()?.user?.role || "user";
  if (role === "manager") {
    roleSelect.value = "user";
    roleSelect.querySelectorAll("option").forEach((opt) => {
      opt.disabled = opt.value !== "user";
    });
  }

  if (role !== "admin") {
    const brandingTab = document.querySelector('[data-tab="brandingTab"]');
    if (brandingTab) {
      brandingTab.disabled = true;
      brandingTab.title = "Hanya admin yang bisa upload logo";
    }

    const menuTab = document.querySelector('[data-tab="menuTab"]');
    if (menuTab) {
      menuTab.disabled = true;
      menuTab.title = "Hanya admin yang bisa mengatur menu";
    }

    const settingsTab = document.querySelector('[data-tab="settingsTab"]');
    if (settingsTab) {
      settingsTab.disabled = true;
      settingsTab.title = "Hanya admin yang bisa mengatur profil perusahaan";
    }

    const productsTab = document.querySelector('[data-tab="productsTab"]');
    if (productsTab) {
      productsTab.disabled = true;
      productsTab.title = "Hanya admin yang bisa mengelola produk";
    }
  }
}

function guardAccess() {
  const auth = getAuth();
  const role = auth?.user?.role;
  if (!auth?.token) {
    window.location.href = "/login.html";
    return false;
  }
  if (role !== "admin" && role !== "manager") {
    alert("Akses ditolak.");
    window.location.href = "/";
    return false;
  }
  return true;
}

createUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  createMessage.classList.remove("success");
  createMessage.textContent = "";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const role = roleSelect.value;

  try {
    await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
    createMessage.classList.add("success");
    createMessage.textContent = "User berhasil dibuat.";
    createUserForm.reset();
    applyRoleRulesToUI();
    loadUsers();
  } catch (error) {
    createMessage.textContent = error.message;
  }
});

usersTable.addEventListener("change", async (event) => {
  const target = event.target;
  if (target?.dataset?.action !== "change-role") {
    return;
  }

  const userId = target.dataset.userId;
  const role = target.value;
  try {
    await apiFetch(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    loadUsers();
  } catch (error) {
    alert(error.message);
    loadUsers();
  }
});

if (logoForm) {
  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
      reader.readAsDataURL(file);
    });

  const loadImageFromDataUrl = (dataUrl) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Gagal memproses gambar."));
      image.src = dataUrl;
    });

  const canvasToBlob = (canvas, type, quality) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengompres gambar."));
            return;
          }
          resolve(blob);
        },
        type,
        quality
      );
    });

  async function compressLogoToMax2MB(file) {
    if (!file) {
      throw new Error("Pilih file logo dulu.");
    }

    if (file.size <= MAX_LOGO_FILE_SIZE) {
      return file;
    }

    if (file.type === "image/svg+xml") {
      throw new Error("File SVG di atas 2MB belum bisa dikompres otomatis. Mohon kecilkan dulu filenya.");
    }

    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImageFromDataUrl(dataUrl);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Browser tidak mendukung kompres gambar.");
    }

    // Kombinasi resize + kualitas untuk mengejar target <= 2MB.
    let scale = 1;
    let quality = 0.92;
    let blob = null;

    for (let i = 0; i < 12; i += 1) {
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      blob = await canvasToBlob(canvas, "image/webp", quality);
      if (blob.size <= MAX_LOGO_FILE_SIZE) {
        return new File([blob], `logo-${Date.now()}.webp`, { type: "image/webp" });
      }

      if (quality > 0.5) {
        quality -= 0.08;
      } else {
        scale *= 0.85;
      }
    }

    throw new Error("Gambar masih lebih dari 2MB setelah kompres. Coba gunakan file dengan resolusi lebih kecil.");
  }

  logoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    logoMessage.classList.remove("success");
    logoMessage.textContent = "";

    if (!logoFile.files || !logoFile.files[0]) {
      logoMessage.textContent = "Pilih file logo dulu.";
      return;
    }

    try {
      const compressedLogo = await compressLogoToMax2MB(logoFile.files[0]);
      const formData = new FormData();
      formData.append("logo", compressedLogo);

      const response = await fetch("/api/admin/logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Gagal upload logo.");
      }

      logoMessage.classList.add("success");
      logoMessage.textContent = "Logo berhasil diupload. Refresh halaman untuk melihat perubahan.";
      logoPreview.innerHTML = `<img src="${data.logoUrl}" alt="Logo" style="max-height:80px; border:1px solid #e5e7eb; border-radius:10px; padding:8px; background:#fff" />`;
    } catch (error) {
      logoMessage.textContent = error.message;
    }
  });
}

function initTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.disabled) {
        return;
      }
      const tabId = tab.dataset.tab;
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      ["usersTab", "productsTab", "menuTab", "brandingTab", "settingsTab"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle("hidden", id !== tabId);
      });
    });
  });
}

function setMenuMessage(text, isSuccess = false) {
  if (!menuMessage) return;
  menuMessage.classList.toggle("success", isSuccess);
  menuMessage.textContent = text || "";
}

function setCompanyProfileMessage(text, isSuccess = false) {
  if (!companyProfileMessage) return;
  companyProfileMessage.classList.toggle("success", isSuccess);
  companyProfileMessage.textContent = text || "";
}

function setProductsMessage(text, isSuccess = false) {
  if (!productsMessage) return;
  productsMessage.classList.toggle("success", isSuccess);
  productsMessage.textContent = text || "";
}

function resetProductForm() {
  if (!productForm) return;
  editingProductId = null;
  editingProductImageUrl = "";
  productForm.reset();
  updateProductSubcategoryOptions(productCategoryInput.value);
  productSubmitButton.textContent = "Tambah Produk";
  productCancelEditButton.classList.add("hidden");
}

function fillProductForm(product) {
  editingProductId = Number(product.id);
  productNameInput.value = product.name || "";
  if (product.category && !Array.from(productCategoryInput.options).some((opt) => opt.value === product.category)) {
    const option = document.createElement("option");
    option.value = product.category;
    option.textContent = product.category;
    productCategoryInput.appendChild(option);
  }
  productCategoryInput.value = product.category || "";
  updateProductSubcategoryOptions(product.category, product.subcategory);
  productPriceInput.value = product.price || "";
  productDiscountInput.value = product.discount || 0;
  productRatingInput.value = product.rating || "";
  editingProductImageUrl = product.image || "";
  productWaPhoneInput.value = product.wa_phone || "";
  productDescriptionInput.value = product.description || "";
  productSubmitButton.textContent = "Update Produk";
  productCancelEditButton.classList.remove("hidden");
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });

const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal memproses gambar."));
    image.src = dataUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal mengompres gambar."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

async function compressImageToMax2MB(file) {
  if (!file) {
    throw new Error("Pilih file gambar produk.");
  }

  if (file.size <= MAX_LOGO_FILE_SIZE) {
    return file;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Browser tidak mendukung kompres gambar.");
  }

  let scale = 1;
  let quality = 0.92;
  let blob = null;
  for (let i = 0; i < 12; i += 1) {
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob.size <= MAX_LOGO_FILE_SIZE) {
      return new File([blob], `product-${Date.now()}.webp`, { type: "image/webp" });
    }
    if (quality > 0.5) {
      quality -= 0.08;
    } else {
      scale *= 0.85;
    }
  }

  throw new Error("Gambar masih lebih dari 2MB setelah kompres.");
}

async function uploadProductImage(file) {
  const compressed = await compressImageToMax2MB(file);
  const formData = new FormData();
  formData.append("image", compressed);

  const response = await fetch("/api/admin/products/upload-image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Gagal upload gambar produk.");
  }
  return data.imageUrl || "";
}

function updateProductCategoryOptions(categories) {
  if (!productCategoryInput) return;
  const options = ['<option value="">Pilih kategori</option>'];
  categories.forEach((category) => {
    options.push(`<option value="${category.name}">${category.name}</option>`);
  });
  productCategoryInput.innerHTML = options.join("");
}

function updateProductSubcategoryOptions(categoryName, selectedSubcategory = "") {
  if (!productSubcategoryInput) return;
  const selectedCategory = cachedMenuCategories.find((item) => item.name === categoryName);
  const subcategories = selectedCategory?.subcategories || [];
  const options = ['<option value="">Pilih sub-kategori</option>'];
  subcategories.forEach((sub) => {
    options.push(`<option value="${sub.name}">${sub.name}</option>`);
  });
  if (
    selectedSubcategory &&
    !subcategories.some((sub) => sub.name === selectedSubcategory)
  ) {
    options.push(`<option value="${selectedSubcategory}">${selectedSubcategory}</option>`);
  }
  productSubcategoryInput.innerHTML = options.join("");
  if (selectedSubcategory) {
    productSubcategoryInput.value = selectedSubcategory;
  }
}

function renderAdminProducts(products) {
  if (!productsList) return;
  if (!products.length) {
    productsList.innerHTML = '<p class="empty-state">Belum ada produk.</p>';
    return;
  }
  productsList.innerHTML = `
    <div style="overflow:auto">
      <table style="width:100%; border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Nama</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Kategori</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Harga</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Diskon</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">WA</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (product) => `
            <tr>
              <td style="padding:8px; border-bottom:1px solid #f3f4f6">${product.name}</td>
              <td style="padding:8px; border-bottom:1px solid #f3f4f6">${product.category} / ${product.subcategory || "Umum"}</td>
              <td style="padding:8px; border-bottom:1px solid #f3f4f6">${formatRupiah(product.price)}</td>
              <td style="padding:8px; border-bottom:1px solid #f3f4f6">${Number(product.discount || 0)}%</td>
              <td style="padding:8px; border-bottom:1px solid #f3f4f6">${product.wa_phone || "-"}</td>
              <td style="padding:8px; border-bottom:1px solid #f3f4f6">
                <button class="btn-secondary" data-action="edit-product" data-product='${encodeURIComponent(
                  JSON.stringify(product)
                )}'>Edit</button>
                <button class="btn-danger" data-action="delete-product" data-id="${product.id}">Hapus</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadAdminProducts() {
  if (!productsList) return;
  setProductsMessage("");
  try {
    const rows = await apiFetch("/admin/products");
    renderAdminProducts(rows || []);
  } catch (error) {
    setProductsMessage(error.message);
  }
}

function fillCompanyProfileForm(companyProfile) {
  if (!companyProfileForm) return;
  aboutInput.value = companyProfile?.about || "";
  visionInput.value = companyProfile?.vision || "";
  missionInput.value = companyProfile?.mission || "";
  contactEmailInput.value = companyProfile?.email || "";
  contactPhoneInput.value = companyProfile?.phone || "";
  contactAddressInput.value = companyProfile?.address || "";
}

async function loadCompanyProfileSettings() {
  if (!companyProfileForm) return;
  setCompanyProfileMessage("");
  try {
    const settings = await apiFetch("/settings");
    fillCompanyProfileForm(settings?.companyProfile || {});
  } catch (error) {
    setCompanyProfileMessage(error.message);
  }
}

function renderMenu(menu) {
  if (!menuList) return;
  if (!menu.length) {
    menuList.innerHTML = '<p class="empty-state">Belum ada kategori.</p>';
    return;
  }

  menuList.innerHTML = menu
    .map((cat) => {
      const subs = (cat.subcategories || []).map((s) => {
        return `
          <div style="display:flex; gap:8px; align-items:center; padding:8px 0; border-bottom:1px solid #f3f4f6">
            <div style="flex:1">
              <strong>${s.name}</strong> <span class="empty-state">(${s.count || 0})</span>
            </div>
            <button class="btn-secondary" data-action="edit-sub" data-id="${s.id}" data-name="${encodeURIComponent(
          s.name
        )}">Edit</button>
            <button class="btn-danger" data-action="del-sub" data-id="${s.id}">Hapus</button>
          </div>
        `;
      });

      return `
        <div class="info-card" style="margin-top: 12px">
          <div style="display:flex; gap:10px; align-items:center; justify-content:space-between">
            <div>
              <h3 style="margin:0">${cat.name} <span class="empty-state">(${cat.count || 0})</span></h3>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
              <button class="btn-secondary" data-action="edit-cat" data-id="${cat.id}" data-name="${encodeURIComponent(
        cat.name
      )}">Edit</button>
              <button class="btn-danger" data-action="del-cat" data-id="${cat.id}">Hapus</button>
            </div>
          </div>
          <div style="margin-top:10px">
            ${subs.length ? subs.join("") : '<p class="empty-state">Belum ada sub-kategori.</p>'}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadMenu() {
  if (!menuList) return;
  setMenuMessage("");
  try {
    const menu = await apiFetch("/categories");
    cachedMenuCategories = Array.isArray(menu) ? menu : [];
    if (!Array.isArray(menu)) {
      setMenuMessage(
        "Data menu belum valid. Restart server lalu refresh halaman admin."
      );
      menuList.innerHTML = '<p class="empty-state">Data menu belum tersedia.</p>';
      if (categorySelectForSub) {
        categorySelectForSub.innerHTML = "";
      }
      return;
    }
    // fill select
    if (categorySelectForSub) {
      const options = menu.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
      categorySelectForSub.innerHTML = options;
    }
    updateProductCategoryOptions(cachedMenuCategories);
    updateProductSubcategoryOptions(productCategoryInput.value);
    renderMenu(menu);
  } catch (error) {
    setMenuMessage(error.message);
  }
}

if (createCategoryForm) {
  createCategoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMenuMessage("");
    try {
      await apiFetch("/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryNameInput.value }),
      });
      categoryNameInput.value = "";
      setMenuMessage("Kategori berhasil ditambahkan.", true);
      loadMenu();
    } catch (error) {
      setMenuMessage(error.message);
    }
  });
}

if (createSubcategoryForm) {
  createSubcategoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMenuMessage("");
    try {
      const categoryId = categorySelectForSub.value;
      await apiFetch(`/admin/categories/${categoryId}/subcategories`, {
        method: "POST",
        body: JSON.stringify({ name: subcategoryNameInput.value }),
      });
      subcategoryNameInput.value = "";
      setMenuMessage("Sub-kategori berhasil ditambahkan.", true);
      loadMenu();
    } catch (error) {
      setMenuMessage(error.message);
    }
  });
}

if (menuList) {
  menuList.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    try {
      if (action === "edit-cat") {
        const id = btn.dataset.id;
        const oldName = decodeURIComponent(btn.dataset.name || "");
        const name = prompt("Ubah nama kategori:", oldName);
        if (!name) return;
        await apiFetch(`/admin/categories/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
        setMenuMessage("Kategori berhasil diubah.", true);
        loadMenu();
      }

      if (action === "del-cat") {
        const id = btn.dataset.id;
        const ok = confirm("Hapus kategori ini? Produk terkait akan pindah ke Lainnya → Umum.");
        if (!ok) return;
        await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
        setMenuMessage("Kategori berhasil dihapus.", true);
        loadMenu();
      }

      if (action === "edit-sub") {
        const id = btn.dataset.id;
        const oldName = decodeURIComponent(btn.dataset.name || "");
        const name = prompt("Ubah nama sub-kategori:", oldName);
        if (!name) return;
        await apiFetch(`/admin/subcategories/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
        setMenuMessage("Sub-kategori berhasil diubah.", true);
        loadMenu();
      }

      if (action === "del-sub") {
        const id = btn.dataset.id;
        const ok = confirm("Hapus sub-kategori ini? Produk terkait akan pindah ke Umum.");
        if (!ok) return;
        await apiFetch(`/admin/subcategories/${id}`, { method: "DELETE" });
        setMenuMessage("Sub-kategori berhasil dihapus.", true);
        loadMenu();
      }
    } catch (error) {
      setMenuMessage(error.message);
    }
  });
}

if (companyProfileForm) {
  companyProfileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setCompanyProfileMessage("");
    try {
      const payload = {
        about: aboutInput.value,
        vision: visionInput.value,
        mission: missionInput.value,
        email: contactEmailInput.value,
        phone: contactPhoneInput.value,
        address: contactAddressInput.value,
      };

      await apiFetch("/admin/settings/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // Clear cached settings so homepage reflects latest data immediately on refresh.
      localStorage.removeItem("marketplace_settings_cache");
      setCompanyProfileMessage("Profil perusahaan berhasil disimpan.", true);
    } catch (error) {
      setCompanyProfileMessage(error.message);
    }
  });
}

if (productForm) {
  productCategoryInput.addEventListener("change", () => {
    updateProductSubcategoryOptions(productCategoryInput.value);
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setProductsMessage("");
    const payload = {
      name: productNameInput.value.trim(),
      category: productCategoryInput.value.trim(),
      subcategory: productSubcategoryInput.value.trim(),
      price: Number(productPriceInput.value),
      discount: Number(productDiscountInput.value || 0),
      rating: Number(productRatingInput.value || 4.5),
      image: editingProductImageUrl,
      waPhone: productWaPhoneInput.value.trim(),
      description: productDescriptionInput.value.trim(),
    };

    try {
      const pickedFile = productImageFileInput?.files?.[0];
      if (pickedFile) {
        payload.image = await uploadProductImage(pickedFile);
      }
      if (!payload.image) {
        throw new Error("Gambar produk wajib diupload.");
      }

      if (editingProductId) {
        await apiFetch(`/admin/products/${editingProductId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setProductsMessage("Produk berhasil diupdate.", true);
      } else {
        await apiFetch("/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setProductsMessage("Produk berhasil ditambahkan.", true);
      }
      resetProductForm();
      loadAdminProducts();
      loadMenu();
    } catch (error) {
      setProductsMessage(error.message);
    }
  });

  productCancelEditButton.addEventListener("click", () => {
    resetProductForm();
    setProductsMessage("");
  });
}

if (productsList) {
  productsList.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "edit-product") {
      const product = JSON.parse(decodeURIComponent(btn.dataset.product || ""));
      fillProductForm(product);
      setProductsMessage("Mode edit produk aktif.");
      return;
    }

    if (action === "delete-product") {
      const id = Number(btn.dataset.id);
      if (!id) return;
      const ok = confirm("Hapus produk ini?");
      if (!ok) return;
      try {
        await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
        setProductsMessage("Produk berhasil dihapus.", true);
        if (editingProductId === id) {
          resetProductForm();
        }
        loadAdminProducts();
        loadMenu();
      } catch (error) {
        setProductsMessage(error.message);
      }
    }
  });
}

renderUserArea();
if (guardAccess()) {
  initTabs();
  applyRoleRulesToUI();
  loadUsers();
  loadAdminProducts();
  loadMenu();
  loadCompanyProfileSettings();
}

