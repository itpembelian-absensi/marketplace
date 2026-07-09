const usersTable = document.getElementById("usersTable");
const usersMessage = document.getElementById("usersMessage");
const createUserForm = document.getElementById("createUserForm");
const createMessage = document.getElementById("createMessage");
const createUserHeading = document.getElementById("createUserHeading");
const createUserSubmitButton = document.getElementById("createUserSubmitButton");
const createUserCancelButton = document.getElementById("createUserCancelButton");
const passwordInput = document.getElementById("password");
const passwordLabel = document.getElementById("passwordLabel");
const togglePasswordBtn = document.getElementById("togglePasswordBtn");
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
const productImagesPreview = document.getElementById("productImagesPreview");
const productWaPhoneInput = document.getElementById("productWaPhone");
const productDescriptionInput = document.getElementById("productDescription");
const productSubmitButton = document.getElementById("productSubmitButton");
const productCancelEditButton = document.getElementById("productCancelEdit");
const productsMessage = document.getElementById("productsMessage");
const productsList = document.getElementById("productsList");
const productSizesContainer = document.getElementById("productSizesContainer");
const addSizeRowBtn = document.getElementById("addSizeRowBtn");
const productStockSJSInput = document.getElementById("productStockSJS");
const productStockSJLInput = document.getElementById("productStockSJL");
const productPointsInput = document.getElementById("productPoints");
const qrisForm = document.getElementById("qrisForm");
const qrisMessage = document.getElementById("qrisMessage");
const shippingSettingsForm = document.getElementById("shippingSettingsForm");
const shippingSettingsMessage = document.getElementById("shippingSettingsMessage");
const shippingApiStatus = document.getElementById("shippingApiStatus");
const homePageForm = document.getElementById("homePageForm");
const homePageMessage = document.getElementById("homePageMessage");
const homeSlidesContainer = document.getElementById("homeSlidesContainer");
const homeFeaturesContainer = document.getElementById("homeFeaturesContainer");
const homeAboutContainer = document.getElementById("homeAboutContainer");
const homeFooterContainer = document.getElementById("homeFooterContainer");
const addHomeSlideBtn = document.getElementById("addHomeSlideBtn");

const tabs = Array.from(document.querySelectorAll(".admin-sidebar .tab"));

const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;
let editingProductId = null;
let editingProductImages = [];
let editingUserId = null;
let cachedMenuCategories = [];

function setPasswordVisibility(visible) {
  if (!passwordInput || !togglePasswordBtn) return;
  passwordInput.type = visible ? "text" : "password";
  const eyeIcon = togglePasswordBtn.querySelector(".icon-eye");
  const eyeOffIcon = togglePasswordBtn.querySelector(".icon-eye-off");
  if (eyeIcon) eyeIcon.classList.toggle("hidden", visible);
  if (eyeOffIcon) eyeOffIcon.classList.toggle("hidden", !visible);
  const label = visible ? "Sembunyikan password" : "Tampilkan password";
  togglePasswordBtn.setAttribute("aria-label", label);
  togglePasswordBtn.title = label;
}

function resetUserForm() {
  editingUserId = null;
  createUserForm.reset();
  if (createUserHeading) createUserHeading.textContent = "Create User";
  if (createUserSubmitButton) createUserSubmitButton.textContent = "Buat User";
  if (createUserCancelButton) createUserCancelButton.classList.add("hidden");
  if (passwordInput) {
    passwordInput.required = true;
    passwordInput.placeholder = "Minimal 6 karakter";
  }
  if (passwordLabel) {
    passwordLabel.innerHTML = 'Password <span style="color:var(--danger)">*</span>';
  }
  setPasswordVisibility(false);
  applyRoleRulesToUI();
}

function fillUserForm(user) {
  editingUserId = user.id;
  document.getElementById("name").value = user.name || "";
  document.getElementById("email").value = user.email || "";
  roleSelect.value = user.role || "user";
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.required = false;
    passwordInput.placeholder = "Kosongkan jika tidak diubah";
  }
  if (passwordLabel) {
    passwordLabel.textContent = "Password baru (opsional)";
  }
  setPasswordVisibility(false);
  if (createUserHeading) createUserHeading.textContent = `Edit User #${user.id}`;
  if (createUserSubmitButton) createUserSubmitButton.textContent = "Simpan Perubahan";
  if (createUserCancelButton) createUserCancelButton.classList.remove("hidden");
  createUserForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap">
                          <select data-action="change-role" data-user-id="${u.id}" style="padding:8px; border:1px solid #e5e7eb; border-radius:8px">
                            <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
                            <option value="manager" ${u.role === "manager" ? "selected" : ""}>manager</option>
                            <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
                          </select>
                          <button type="button" class="btn-secondary" data-action="edit-user" data-user='${encodeURIComponent(
                            JSON.stringify(u)
                          )}'>Edit</button>
                          <button type="button" class="btn-danger" data-action="delete-user" data-id="${u.id}" data-name="${encodeURIComponent(
                            u.name || ""
                          )}">Hapus</button>
                        </div>
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
  const password = passwordInput.value;
  const role = roleSelect.value;

  try {
    if (editingUserId) {
      const payload = { name, email, role };
      if (password) payload.password = password;
      await apiFetch(`/users/${editingUserId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      createMessage.classList.add("success");
      createMessage.textContent = "User berhasil diperbarui.";
      resetUserForm();
    } else {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      createMessage.classList.add("success");
      createMessage.textContent = "User berhasil dibuat.";
      resetUserForm();
    }
    loadUsers();
  } catch (error) {
    createMessage.textContent = error.message;
  }
});

if (createUserCancelButton) {
  createUserCancelButton.addEventListener("click", () => {
    resetUserForm();
    createMessage.textContent = "";
  });
}

if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener("click", () => {
    setPasswordVisibility(passwordInput.type === "password");
  });
}

usersTable.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "edit-user") {
    const user = JSON.parse(decodeURIComponent(btn.dataset.user || ""));
    fillUserForm(user);
    createMessage.textContent = "Mode edit user aktif.";
    return;
  }

  if (action === "delete-user") {
    const id = Number(btn.dataset.id);
    const name = decodeURIComponent(btn.dataset.name || "user ini");
    if (!id) return;
    const ok = confirm(`Hapus user "${name}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!ok) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      usersMessage.classList.add("success");
      usersMessage.textContent = `User "${name}" berhasil dihapus.`;
      if (editingUserId === id) {
        resetUserForm();
        createMessage.textContent = "";
      }
      loadUsers();
    } catch (error) {
      alert(error.message);
    }
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

      ["usersTab", "productsTab", "menuTab", "brandingTab", "settingsTab", "ordersTab", "salesTab", "inventoryTab", "pointsTab", "bannerTab", "whatsappTab"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle("hidden", id !== tabId);
      });

      // Load data on tab activation
      if (tabId === "ordersTab") loadOrders();
      if (tabId === "salesTab") loadSalesReport();
      if (tabId === "inventoryTab") loadInventoryReport();
      if (tabId === "bannerTab") loadHomePageSettings();
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

function clearSizeRows() {
  if (productSizesContainer) {
    productSizesContainer.innerHTML = "";
  }
}

function updateGlobalStockFromSizes() {
  const sizes = getSizesFromForm();
  if (sizes.length > 0) {
    let totalSjs = 0;
    let totalSjl = 0;
    sizes.forEach(s => {
      totalSjs += s.stock_sjs;
      totalSjl += s.stock_sjl;
    });
    productStockSJSInput.value = totalSjs;
    productStockSJLInput.value = totalSjl;
    productStockSJSInput.readOnly = true;
    productStockSJLInput.readOnly = true;
    productStockSJSInput.style.backgroundColor = "#f3f4f6";
    productStockSJLInput.style.backgroundColor = "#f3f4f6";
  } else {
    productStockSJSInput.readOnly = false;
    productStockSJLInput.readOnly = false;
    productStockSJSInput.style.backgroundColor = "";
    productStockSJLInput.style.backgroundColor = "";
  }
}

function addSizeRow(sizeName, sizePrice, stockSjs, stockSjl) {
  if (!productSizesContainer) return;
  const row = document.createElement("div");
  row.className = "size-row-item";
  row.style.cssText = "display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 4px; padding: 8px; border: 1px solid #f3f4f6; border-radius: 6px;";
  row.innerHTML = `
    <div style="flex: 1; min-width: 150px;">
      <input type="text" placeholder="Nama ukuran" value="${sizeName || ''}" class="size-name-input" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
    </div>
    <div style="flex: 1; min-width: 120px;">
      <input type="number" placeholder="Harga (Rp)" value="${sizePrice || ''}" min="1" class="size-price-input" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
    </div>
    <div style="width: 100px;">
      <input type="number" placeholder="Stok SJS" value="${stockSjs || 0}" min="0" class="size-stocksjs-input" title="Stok SJS" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
    </div>
    <div style="width: 100px;">
      <input type="number" placeholder="Stok SJL" value="${stockSjl || 0}" min="0" class="size-stocksjl-input" title="Stok SJL" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
    </div>
    <button type="button" class="btn-danger remove-size-row" style="padding: 6px 10px; font-size: 0.8rem; white-space: nowrap;">Hapus</button>
  `;
  row.querySelector(".remove-size-row").addEventListener("click", () => {
    row.remove();
    updateGlobalStockFromSizes();
  });
  productSizesContainer.appendChild(row);
  
  const sjsInput = row.querySelector(".size-stocksjs-input");
  const sjlInput = row.querySelector(".size-stocksjl-input");
  if (sjsInput) sjsInput.addEventListener("input", updateGlobalStockFromSizes);
  if (sjlInput) sjlInput.addEventListener("input", updateGlobalStockFromSizes);
  updateGlobalStockFromSizes();
}

function getSizesFromForm() {
  if (!productSizesContainer) return [];
  const rows = productSizesContainer.querySelectorAll(".size-row-item");
  const sizes = [];
  rows.forEach((row) => {
    const nameInput = row.querySelector(".size-name-input");
    const priceInput = row.querySelector(".size-price-input");
    const stockSjsInput = row.querySelector(".size-stocksjs-input");
    const stockSjlInput = row.querySelector(".size-stocksjl-input");
    if (nameInput && priceInput) {
      const name = nameInput.value.trim();
      const price = Number(priceInput.value);
      const stock_sjs = Number(stockSjsInput ? stockSjsInput.value : 0);
      const stock_sjl = Number(stockSjlInput ? stockSjlInput.value : 0);
      if (name && price > 0) {
        sizes.push({ size: name, price: price, stock_sjs, stock_sjl });
      }
    }
  });
  return sizes;
}

if (addSizeRowBtn) {
  addSizeRowBtn.addEventListener("click", () => addSizeRow());
}

function renderProductImagePreviews() {
  if (!productImagesPreview) return;
  if (!editingProductImages.length) {
    productImagesPreview.innerHTML = "";
    return;
  }
  productImagesPreview.innerHTML = editingProductImages
    .map(
      (url, index) => `
        <div class="product-image-preview-item">
          <img src="${url}" alt="Gambar produk ${index + 1}" />
          <button type="button" data-remove-image="${index}" aria-label="Hapus gambar">×</button>
        </div>
      `
    )
    .join("");
}

function resetProductForm() {
  if (!productForm) return;
  editingProductId = null;
  editingProductImages = [];
  productForm.reset();
  renderProductImagePreviews();
  clearSizeRows();
  updateGlobalStockFromSizes();
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
  if (productStockSJSInput) productStockSJSInput.value = product.stock_sjs || 0;
  if (productStockSJLInput) productStockSJLInput.value = product.stock_sjl || 0;
  if (productPointsInput) productPointsInput.value = product.points_per_purchase ?? product.loyalty_points ?? 0;
  productDiscountInput.value = product.discount || 0;
  productRatingInput.value = product.rating || "";
  editingProductImages = getProductImages(product);
  renderProductImagePreviews();
  productWaPhoneInput.value = product.wa_phone || "";
  productDescriptionInput.value = product.description || "";
  
  clearSizeRows();
  try {
    const sizes = typeof product.sizes === "string" ? JSON.parse(product.sizes || "[]") : (product.sizes || []);
    sizes.forEach((s) => addSizeRow(s.size, s.price, s.stock_sjs, s.stock_sjl));
    updateGlobalStockFromSizes();
  } catch (e) {
    // ignore
  }

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
  const formData = new FormData();
  formData.append("image", file);

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
      stockSjs: Number(productStockSJSInput?.value || 0),
      stockSjl: Number(productStockSJLInput?.value || 0),
      pointsPerPurchase: Number(productPointsInput?.value || 0),
      sizes: getSizesFromForm(),
      discount: Number(productDiscountInput.value || 0),
      rating: Number(productRatingInput.value || 4.5),
      images: editingProductImages,
      image: editingProductImages[0] || "",
      waPhone: productWaPhoneInput.value.trim(),
      description: productDescriptionInput.value.trim(),
    };

    try {
      const pickedFiles = productImageFileInput?.files;
      if (pickedFiles && pickedFiles.length) {
        for (const file of pickedFiles) {
          const compressed = await compressImageToMax2MB(file);
          const uploadedUrl = await uploadProductImage(compressed);
          if (uploadedUrl) editingProductImages.push(uploadedUrl);
        }
        payload.images = editingProductImages;
        payload.image = editingProductImages[0] || "";
        productImageFileInput.value = "";
        renderProductImagePreviews();
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

if (productImagesPreview) {
  productImagesPreview.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remove-image]");
    if (!btn) return;
    const index = Number(btn.dataset.removeImage);
    if (Number.isNaN(index)) return;
    editingProductImages.splice(index, 1);
    renderProductImagePreviews();
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

if (qrisForm) {
  qrisForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (qrisMessage) {
      qrisMessage.className = "message";
      qrisMessage.textContent = "Menyimpan...";
    }
    try {
      const file = document.getElementById("qrisFile").files[0];
      if (!file) throw new Error("Pilih gambar barcode QRIS terlebih dahulu.");

      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/admin/settings/qris-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      await apiFetch("/admin/settings/payment", {
        method: "PUT",
        body: JSON.stringify({ qrisImageUrl: data.imageUrl })
      });

      if (qrisMessage) {
        qrisMessage.className = "message success";
        qrisMessage.textContent = "QRIS berhasil disimpan!";
      }
      loadCompanyProfileSettings();
      document.getElementById("qrisFile").value = "";
    } catch (error) {
      if (qrisMessage) {
        qrisMessage.className = "message";
        qrisMessage.textContent = error.message;
      }
    }
  });
}

let currentHomePage = {
  tagline: "",
  sectionTitle: "",
  slides: [],
  features: [],
  aboutSection: null,
};

const DEFAULT_ABOUT_SECTION = {
  stats: [
    { value: "1.000+", label: "Produk Terjual", icon: "box", style: "light" },
    { value: "500+", label: "Total Proyek", icon: "tools", style: "dark" },
    { value: "70+", label: "Rekan & Mitra", icon: "people", style: "light" },
  ],
  title: "Pengiriman Multi-Wilayah",
  subtitle: "Menjangkau pengiriman ke berbagai daerah di Indonesia",
  gallery: Array.from({ length: 4 }, () => ({ imageUrl: "" })),
};

function cloneAboutSection(about) {
  const base = { ...DEFAULT_ABOUT_SECTION, ...(about || {}) };
  base.stats = (base.stats || DEFAULT_ABOUT_SECTION.stats).slice(0, 3).map((stat, index) => ({
    ...(DEFAULT_ABOUT_SECTION.stats[index] || { value: "", label: "", icon: "box", style: "light" }),
    value: String(stat?.value || "").trim(),
    label: String(stat?.label || "").trim(),
    icon: String(stat?.icon || "box").trim(),
    style: stat?.style === "dark" ? "dark" : "light",
  }));
  while (base.stats.length < 3) {
    base.stats.push({ ...DEFAULT_ABOUT_SECTION.stats[base.stats.length] });
  }
  base.title = String(base.title || DEFAULT_ABOUT_SECTION.title).trim();
  base.subtitle = String(base.subtitle || DEFAULT_ABOUT_SECTION.subtitle).trim();
  base.gallery = Array.from({ length: 4 }, (_, index) => ({
    imageUrl: String(about?.gallery?.[index]?.imageUrl || base.gallery?.[index]?.imageUrl || "").trim(),
  }));
  return base;
}

const DEFAULT_FOOTER_SECTION = {
  newsletterTitle: "Jangan sampai ketinggalan informasi\n& promo dari kami!",
  emailPlaceholder: "Masukkan e-mail...",
  buttonText: "Kirim",
  socialLinks: [
    { platform: "instagram", url: "#" },
    { platform: "facebook", url: "#" },
    { platform: "tiktok", url: "#" },
  ],
  columns: [
    {
      title: "Bantuan Pengguna",
      links: [
        { label: "Cara Berbelanja", url: "#" },
        { label: "Pertanyaan Umum", url: "#" },
      ],
    },
    {
      title: "Kerja Sama & Kolaborasi",
      links: [
        { label: "Pembelian Retail", url: "#" },
        { label: "Kerja Sama Bisnis", url: "#" },
      ],
    },
    {
      title: "Kebijakan Kami",
      links: [
        { label: "Ketentuan Pengguna", url: "#" },
        { label: "Pengembalian Produk", url: "#" },
        { label: "Kebijakan Privasi", url: "#" },
        { label: "Ketentuan Pengiriman", url: "#" },
      ],
    },
  ],
  copyright: "Copyright © 2026 - PT Sahabat Jaya Sukses",
};

const FOOTER_COLUMN_LINK_COUNTS = [2, 2, 4];

function renderMediaPreview(url) {
  if (!url) return "";
  const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
  if (isVideo) {
    return `<video src="${url}" autoplay loop muted playsinline style="max-width: 100%; max-height: 100px; object-fit: contain; border-radius: 8px; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;"></video>`;
  }
  return `<img src="${url}" style="max-width: 100%; max-height: 100px; object-fit: contain; border-radius: 8px; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;" />`;
}

function renderHomeSlideRow(slide, index) {
  const previewHtml = slide.imageUrl
    ? `<div class="slide-preview-large-wrap">${renderMediaPreview(slide.imageUrl).replace(/max-height: 100px/g, "max-height: 160px")}</div>`
    : "";
  return `
    <div class="info-card home-slide-row" data-index="${index}" style="margin-bottom: 12px; background:#fff;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h4 style="margin:0; color:#5a3e32;">Slide ${index + 1}</h4>
        <button type="button" class="btn-danger btn-remove-slide" data-index="${index}">Hapus Slide</button>
      </div>
      <label class="slide-upload-zone" data-index="${index}">
        <input type="file" class="home-slide-file" data-index="${index}" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" />
        <strong>Klik atau tarik foto/video ke sini</strong>
        <p>PNG, JPG, WEBP, GIF, MP4 — maks. 20MB</p>
        <div class="home-slide-preview" data-index="${index}">${previewHtml}</div>
      </label>
      <div style="margin-top:12px; display:grid; gap:8px;">
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Judul di atas foto:</label>
          <input type="text" class="home-slide-title" data-index="${index}" value="${(slide.title || "").replace(/"/g, "&quot;")}" placeholder="Registrasi Gratis Biaya Admin!" style="width:100%;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Subjudul / deskripsi:</label>
          <textarea class="home-slide-subtitle" data-index="${index}" rows="2" placeholder="Deskripsi promo..." style="width:100%;box-sizing:border-box;">${slide.subtitle || ""}</textarea>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label style="font-size:0.85rem;color:#6b7280;">Teks tombol:</label>
            <input type="text" class="home-slide-cta-text" data-index="${index}" value="${(slide.ctaText || "").replace(/"/g, "&quot;")}" placeholder="Registrasi Member" style="width:100%;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:0.85rem;color:#6b7280;">Link tombol:</label>
            <input type="text" class="home-slide-cta-link" data-index="${index}" value="${(slide.ctaLink || "").replace(/"/g, "&quot;")}" placeholder="/register.html" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Catatan kaki (opsional):</label>
          <input type="text" class="home-slide-footnote" data-index="${index}" value="${(slide.footnote || "").replace(/"/g, "&quot;")}" placeholder="*Periode promo: Jan - Mar 2026" style="width:100%;box-sizing:border-box;" />
        </div>
      </div>
    </div>`;
}

function previewLocalSlideFile(file, index) {
  const previewEl = homePageForm?.querySelector(`.home-slide-preview[data-index="${index}"]`);
  if (!previewEl || !file) return;
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith("video/");
  previewEl.innerHTML = isVideo
    ? `<div class="slide-preview-large-wrap"><video src="${url}" autoplay loop muted playsinline class="slide-preview-large"></video></div>`
    : `<img src="${url}" class="slide-preview-large" alt="Preview slide" />`;
}

function renderHomeFeaturePreview(feature) {
  const imageUrl = String(feature?.imageUrl || "").trim();
  if (!imageUrl) {
    return `<p class="home-feature-preview-empty">Preview foto</p>`;
  }
  return `<div class="slide-preview-large-wrap">${renderMediaPreview(imageUrl).replace(/max-height: 100px/g, "max-height: 160px")}</div>`;
}

function previewLocalFeatureFile(file, index) {
  const previewEl = homePageForm?.querySelector(`.home-feature-preview[data-index="${index}"]`);
  if (!previewEl || !file) return;
  if (!file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  previewEl.innerHTML = `<div class="slide-preview-large-wrap"><img src="${url}" class="slide-preview-large" alt="Preview kartu fitur" /></div>`;
}

function bindHomeFeatureHandlers() {
  if (!homePageForm) return;
  homePageForm.querySelectorAll(".home-feature-file").forEach((input) => {
    const index = Number(input.dataset.index);
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) previewLocalFeatureFile(file, index);
    });
  });
}

function bindSlideUploadHandlers() {
  if (!homePageForm) return;

  homePageForm.querySelectorAll(".slide-upload-zone").forEach((zone) => {
    const index = Number(zone.dataset.index);
    const input = zone.querySelector(".home-slide-file");

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file && input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        previewLocalSlideFile(file, index);
      }
    });

    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) previewLocalSlideFile(file, index);
    });
  });
}

function renderHomeFeatureRow(feature, index) {
  return `
    <div class="info-card home-feature-row" data-index="${index}" style="margin-bottom: 12px">
      <h3 style="margin:0 0 8px">Kartu ${index + 1}</h3>
      <div style="display:flex; gap:16px; align-items:flex-start;">
        <div style="flex:1;">
          <label style="font-size:0.9rem;color:#6b7280;">Foto:</label>
          <input type="file" class="home-feature-file" data-index="${index}" accept="image/png,image/jpeg,image/webp,image/gif" />
          <label style="font-size:0.9rem;color:#6b7280;margin-top:8px;display:block;">Judul:</label>
          <input type="text" class="home-feature-title" data-index="${index}" value="${feature.title || ""}" placeholder="Judul kartu" />
          <label style="font-size:0.9rem;color:#6b7280;margin-top:8px;display:block;">Keterangan:</label>
          <textarea class="home-feature-desc" data-index="${index}" rows="2" placeholder="Keterangan singkat">${feature.description || ""}</textarea>
          <label style="font-size:0.9rem;color:#6b7280;margin-top:8px;display:block;">Link (Opsional):</label>
          <input type="text" class="home-feature-link" data-index="${index}" value="${feature.link || ""}" placeholder="/shop.html" />
        </div>
        <div class="home-feature-preview" data-index="${index}">${renderHomeFeaturePreview(feature)}</div>
      </div>
    </div>`;
}

function renderHomeAboutStatRow(stat, index) {
  const styleOptions = [
    { value: "light", label: "Abu-abu terang" },
    { value: "dark", label: "Coklat gelap" },
  ];
  const iconOptions = [
    { value: "box", label: "Kotak / Produk" },
    { value: "tools", label: "Alat / Proyek" },
    { value: "people", label: "Orang / Mitra" },
  ];
  const styleSelect = styleOptions
    .map((opt) => `<option value="${opt.value}"${stat.style === opt.value ? " selected" : ""}>${opt.label}</option>`)
    .join("");
  const iconSelect = iconOptions
    .map((opt) => `<option value="${opt.value}"${stat.icon === opt.value ? " selected" : ""}>${opt.label}</option>`)
    .join("");

  return `
    <div class="info-card home-about-stat-row" data-index="${index}" style="margin-bottom: 10px; background:#fafafa;">
      <h4 style="margin:0 0 8px; color:#5a3e32;">Statistik ${index + 1}</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Angka:</label>
          <input type="text" class="home-about-stat-value" data-index="${index}" value="${(stat.value || "").replace(/"/g, "&quot;")}" placeholder="1.000+" style="width:100%;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Label:</label>
          <input type="text" class="home-about-stat-label" data-index="${index}" value="${(stat.label || "").replace(/"/g, "&quot;")}" placeholder="Produk Terjual" style="width:100%;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Ikon:</label>
          <select class="home-about-stat-icon" data-index="${index}" style="width:100%;box-sizing:border-box;">${iconSelect}</select>
        </div>
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Warna kartu:</label>
          <select class="home-about-stat-style" data-index="${index}" style="width:100%;box-sizing:border-box;">${styleSelect}</select>
        </div>
      </div>
    </div>`;
}

function renderHomeAboutGalleryRow(item, index) {
  const labels = ["Kiri atas", "Kanan atas", "Kiri bawah", "Kanan bawah"];
  const imageUrl = String(item?.imageUrl || "").trim();
  const previewHtml = imageUrl
    ? `<div class="slide-preview-large-wrap">${renderMediaPreview(imageUrl).replace(/max-height: 100px/g, "max-height: 120px")}</div>`
    : "";
  const removeBtn = imageUrl
    ? `<button type="button" class="btn-danger btn-clear-about-gallery" data-index="${index}" style="margin-top:8px;">Hapus foto</button>`
    : "";
  return `
    <div class="info-card home-about-gallery-row" data-index="${index}" style="margin-bottom: 10px;">
      <h4 style="margin:0 0 8px; color:#5a3e32;">Foto ${index + 1} (${labels[index] || ""})</h4>
      <input type="hidden" class="home-about-gallery-url" data-index="${index}" value="${imageUrl.replace(/"/g, "&quot;")}" />
      <label class="slide-upload-zone about-gallery-upload-zone" data-index="${index}">
        <input type="file" class="home-about-gallery-file" data-index="${index}" accept="image/png,image/jpeg,image/webp,image/gif" />
        <strong>Klik atau tarik foto ke sini</strong>
        <p>PNG, JPG, WEBP — maks. 2MB</p>
        <div class="home-about-gallery-preview" data-index="${index}">${previewHtml}</div>
      </label>
      ${removeBtn}
    </div>`;
}

function renderHomeAboutForm(about) {
  const data = cloneAboutSection(about);
  const stats = data.stats.slice(0, 3);
  const gallery = data.gallery.slice(0, 4);

  return `
    <div style="margin-bottom: 12px;">
      <label style="font-size:0.9rem;color:#6b7280;">Judul utama:</label>
      <input type="text" id="homeAboutTitle" value="${(data.title || "").replace(/"/g, "&quot;")}" placeholder="Pengiriman Multi-Wilayah" style="width:100%;box-sizing:border-box;" />
      <label style="font-size:0.9rem;color:#6b7280;margin-top:8px;display:block;">Subjudul:</label>
      <input type="text" id="homeAboutSubtitle" value="${(data.subtitle || "").replace(/"/g, "&quot;")}" placeholder="Menjangkau pengiriman ke berbagai daerah di Indonesia" style="width:100%;box-sizing:border-box;" />
    </div>
    <h4 style="margin:16px 0 8px; color:#5a3e32;">Kartu Statistik</h4>
    ${stats.map((stat, i) => renderHomeAboutStatRow(stat, i)).join("")}
    <h4 style="margin:16px 0 8px; color:#5a3e32;">Kolase Foto (4 gambar)</h4>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;">
      ${gallery.map((item, i) => renderHomeAboutGalleryRow(item, i)).join("")}
    </div>`;
}

function previewLocalAboutGalleryFile(file, index) {
  const previewEl = homePageForm?.querySelector(`.home-about-gallery-preview[data-index="${index}"]`);
  if (!previewEl || !file) return;
  const url = URL.createObjectURL(file);
  previewEl.innerHTML = `<img src="${url}" class="slide-preview-large" alt="Preview galeri" />`;
}

function clearAboutGalleryPhoto(index) {
  const hidden = homePageForm?.querySelector(`.home-about-gallery-url[data-index="${index}"]`);
  const previewEl = homePageForm?.querySelector(`.home-about-gallery-preview[data-index="${index}"]`);
  const fileInput = homePageForm?.querySelector(`.home-about-gallery-file[data-index="${index}"]`);
  const removeBtn = homePageForm?.querySelector(`.btn-clear-about-gallery[data-index="${index}"]`);
  if (hidden) hidden.value = "";
  if (previewEl) previewEl.innerHTML = "";
  if (fileInput) fileInput.value = "";
  if (removeBtn) removeBtn.remove();
  if (currentHomePage.aboutSection?.gallery?.[index]) {
    currentHomePage.aboutSection.gallery[index].imageUrl = "";
  }
}

function bindAboutGalleryHandlers() {
  if (!homePageForm) return;

  homePageForm.querySelectorAll(".btn-clear-about-gallery").forEach((btn) => {
    btn.addEventListener("click", () => clearAboutGalleryPhoto(Number(btn.dataset.index)));
  });

  homePageForm.querySelectorAll(".about-gallery-upload-zone").forEach((zone) => {
    const index = Number(zone.dataset.index);
    const input = zone.querySelector(".home-about-gallery-file");

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file && input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        previewLocalAboutGalleryFile(file, index);
        const row = homePageForm.querySelector(`.home-about-gallery-row[data-index="${index}"]`);
        if (row && !row.querySelector(".btn-clear-about-gallery")) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn-danger btn-clear-about-gallery";
          btn.dataset.index = String(index);
          btn.style.marginTop = "8px";
          btn.textContent = "Hapus foto";
          btn.addEventListener("click", () => clearAboutGalleryPhoto(index));
          row.appendChild(btn);
        }
      }
    });

    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) {
        previewLocalAboutGalleryFile(file, index);
        const row = homePageForm.querySelector(`.home-about-gallery-row[data-index="${index}"]`);
        if (row && !row.querySelector(".btn-clear-about-gallery")) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn-danger btn-clear-about-gallery";
          btn.dataset.index = String(index);
          btn.style.marginTop = "8px";
          btn.textContent = "Hapus foto";
          btn.addEventListener("click", () => clearAboutGalleryPhoto(index));
          row.appendChild(btn);
        }
      }
    });
  });
}

async function collectAboutSectionFromForm() {
  const aboutSection = cloneAboutSection(currentHomePage.aboutSection);
  aboutSection.title = document.getElementById("homeAboutTitle")?.value.trim() || "";
  aboutSection.subtitle = document.getElementById("homeAboutSubtitle")?.value.trim() || "";
  aboutSection.stats = aboutSection.stats.map((stat, idx) => ({
    value: homePageForm.querySelector(`.home-about-stat-value[data-index="${idx}"]`)?.value.trim() || "",
    label: homePageForm.querySelector(`.home-about-stat-label[data-index="${idx}"]`)?.value.trim() || "",
    icon: homePageForm.querySelector(`.home-about-stat-icon[data-index="${idx}"]`)?.value || "box",
    style: homePageForm.querySelector(`.home-about-stat-style[data-index="${idx}"]`)?.value || "light",
  }));
  aboutSection.gallery = Array.from({ length: 4 }, (_, idx) => ({
    imageUrl: homePageForm.querySelector(`.home-about-gallery-url[data-index="${idx}"]`)?.value.trim() || "",
  }));

  for (let idx = 0; idx < 4; idx++) {
    const fileInput = homePageForm.querySelector(`.home-about-gallery-file[data-index="${idx}"]`);
    if (fileInput?.files?.[0]) {
      aboutSection.gallery[idx].imageUrl = await uploadAboutGalleryImage(fileInput.files[0]);
    }
  }
  return aboutSection;
}

function renderHomeFooterForm(footer) {
  const data = { ...DEFAULT_FOOTER_SECTION, ...(footer || {}) };
  const columns = (data.columns || DEFAULT_FOOTER_SECTION.columns).slice(0, 3);
  while (columns.length < 3) columns.push({ ...DEFAULT_FOOTER_SECTION.columns[columns.length] });

  const socialRows = (data.socialLinks || DEFAULT_FOOTER_SECTION.socialLinks)
    .slice(0, 3)
    .map((item, index) => {
      const labels = ["Instagram", "Facebook", "TikTok"];
      return `
        <div style="margin-bottom:8px;">
          <label style="font-size:0.85rem;color:#6b7280;">${labels[index] || "Sosmed"} URL:</label>
          <input type="text" class="home-footer-social-url" data-index="${index}" value="${(item.url || "").replace(/"/g, "&quot;")}" placeholder="https://..." style="width:100%;box-sizing:border-box;" />
        </div>`;
    })
    .join("");

  const columnRows = columns
    .map((col, colIndex) => {
      const linkCount = FOOTER_COLUMN_LINK_COUNTS[colIndex] || 2;
      const links = (col.links || []).slice(0, linkCount);
      while (links.length < linkCount) links.push({ label: "", url: "#" });
      const linkFields = links
        .map(
          (link, linkIndex) => `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px;">
            <input type="text" class="home-footer-link-label" data-col="${colIndex}" data-link="${linkIndex}" value="${(link.label || "").replace(/"/g, "&quot;")}" placeholder="Label link" style="width:100%;box-sizing:border-box;" />
            <input type="text" class="home-footer-link-url" data-col="${colIndex}" data-link="${linkIndex}" value="${(link.url || "").replace(/"/g, "&quot;")}" placeholder="/halaman.html" style="width:100%;box-sizing:border-box;" />
          </div>`
        )
        .join("");
      return `
        <div class="info-card" style="margin-bottom:10px; background:#fafafa;">
          <h4 style="margin:0 0 8px; color:#5a3e32;">Kolom ${colIndex + 1}</h4>
          <label style="font-size:0.85rem;color:#6b7280;">Judul kolom:</label>
          <input type="text" class="home-footer-col-title" data-col="${colIndex}" value="${(col.title || "").replace(/"/g, "&quot;")}" style="width:100%;box-sizing:border-box; margin-bottom:8px;" />
          ${linkFields}
        </div>`;
    })
    .join("");

  return `
    <div style="margin-bottom: 12px;">
      <label style="font-size:0.9rem;color:#6b7280;">Judul newsletter (Enter = baris baru):</label>
      <textarea id="homeFooterNewsletterTitle" rows="2" placeholder="Jangan sampai ketinggalan informasi..." style="width:100%;box-sizing:border-box;">${data.newsletterTitle || ""}</textarea>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Placeholder e-mail:</label>
          <input type="text" id="homeFooterEmailPlaceholder" value="${(data.emailPlaceholder || "").replace(/"/g, "&quot;")}" style="width:100%;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:0.85rem;color:#6b7280;">Teks tombol:</label>
          <input type="text" id="homeFooterButtonText" value="${(data.buttonText || "").replace(/"/g, "&quot;")}" style="width:100%;box-sizing:border-box;" />
        </div>
      </div>
    </div>
    <h4 style="margin:12px 0 8px; color:#5a3e32;">Link Media Sosial</h4>
    ${socialRows}
    <h4 style="margin:16px 0 8px; color:#5a3e32;">Kolom Footer</h4>
    ${columnRows}
    <div style="margin-top:12px;">
      <label style="font-size:0.9rem;color:#6b7280;">Teks copyright:</label>
      <input type="text" id="homeFooterCopyright" value="${(data.copyright || "").replace(/"/g, "&quot;")}" style="width:100%;box-sizing:border-box;" />
    </div>`;
}

function collectFooterSectionFromForm() {
  const footerSection = currentHomePage.footerSection || { ...DEFAULT_FOOTER_SECTION };
  footerSection.newsletterTitle = document.getElementById("homeFooterNewsletterTitle")?.value.trim() || "";
  footerSection.emailPlaceholder = document.getElementById("homeFooterEmailPlaceholder")?.value.trim() || "";
  footerSection.buttonText = document.getElementById("homeFooterButtonText")?.value.trim() || "";
  footerSection.copyright = document.getElementById("homeFooterCopyright")?.value.trim() || "";
  footerSection.socialLinks = [0, 1, 2].map((index) => ({
    platform: DEFAULT_FOOTER_SECTION.socialLinks[index]?.platform || "instagram",
    url: homePageForm.querySelector(`.home-footer-social-url[data-index="${index}"]`)?.value.trim() || "#",
  }));
  footerSection.columns = [0, 1, 2].map((colIndex) => {
    const linkCount = FOOTER_COLUMN_LINK_COUNTS[colIndex] || 2;
    const links = [];
    for (let linkIndex = 0; linkIndex < linkCount; linkIndex++) {
      links.push({
        label: homePageForm.querySelector(`.home-footer-link-label[data-col="${colIndex}"][data-link="${linkIndex}"]`)?.value.trim() || "",
        url: homePageForm.querySelector(`.home-footer-link-url[data-col="${colIndex}"][data-link="${linkIndex}"]`)?.value.trim() || "#",
      });
    }
    return {
      title: homePageForm.querySelector(`.home-footer-col-title[data-col="${colIndex}"]`)?.value.trim() || "",
      links,
    };
  });
  return footerSection;
}

function renderHomePageForms() {
  if (homeSlidesContainer) {
    homeSlidesContainer.innerHTML = (currentHomePage.slides || [])
      .map((slide, i) => renderHomeSlideRow(slide, i))
      .join("");
    homeSlidesContainer.querySelectorAll(".btn-remove-slide").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        currentHomePage.slides.splice(idx, 1);
        renderHomePageForms();
      });
    });
    bindSlideUploadHandlers();
  }
  if (homeFeaturesContainer) {
    homeFeaturesContainer.innerHTML = (currentHomePage.features || [])
      .map((feature, i) => renderHomeFeatureRow(feature, i))
      .join("");
    bindHomeFeatureHandlers();
  }
  if (homeAboutContainer) {
    homeAboutContainer.innerHTML = renderHomeAboutForm(currentHomePage.aboutSection);
    bindAboutGalleryHandlers();
  }
  if (homeFooterContainer) {
    homeFooterContainer.innerHTML = renderHomeFooterForm(currentHomePage.footerSection);
  }
}

async function loadHomePageSettings() {
  if (!homePageForm) return;
  try {
    const settings = await apiFetch("/settings");
    currentHomePage = settings?.homePage || { tagline: "", sectionTitle: "", slides: [], features: [] };
    if (!currentHomePage.slides?.length) {
      currentHomePage.slides = [{ imageUrl: "", title: "", subtitle: "", ctaText: "", ctaLink: "", footnote: "" }];
    }
    if (!currentHomePage.features?.length) {
      currentHomePage.features = Array.from({ length: 7 }, () => ({
        imageUrl: "", title: "", description: "", link: "",
      }));
    }
    if (!currentHomePage.aboutSection) {
      currentHomePage.aboutSection = cloneAboutSection(null);
    } else {
      currentHomePage.aboutSection = cloneAboutSection(currentHomePage.aboutSection);
    }
    if (!currentHomePage.footerSection) {
      currentHomePage.footerSection = { ...DEFAULT_FOOTER_SECTION };
    }
    document.getElementById("homeTagline").value = currentHomePage.tagline || "";
    document.getElementById("homeSectionTitle").value = currentHomePage.sectionTitle || "";
    renderHomePageForms();
  } catch (err) {}
}

async function uploadPictureImage(file, folder) {
  if (!file) {
    throw new Error("Pilih file gambar terlebih dahulu.");
  }
  if (file.type.startsWith("video/") && folder !== "slides") {
    throw new Error("Video hanya untuk slideshow.");
  }
  if (file.type.startsWith("video/") && file.size > 20 * 1024 * 1024) {
    throw new Error("Video terlalu besar, maksimal 20MB.");
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);

  const response = await fetch("/api/admin/picture/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Gagal upload gambar.");
  return data.imageUrl || "";
}

async function uploadBannerImage(file) {
  return uploadPictureImage(file, "slides");
}

async function uploadFeatureImage(file) {
  return uploadPictureImage(file, "features");
}

async function uploadAboutGalleryImage(file) {
  return uploadPictureImage(file, "about");
}

if (addHomeSlideBtn) {
  addHomeSlideBtn.addEventListener("click", () => {
    currentHomePage.slides.push({ imageUrl: "", title: "", subtitle: "", ctaText: "", ctaLink: "", footnote: "" });
    renderHomePageForms();
  });
}

if (homePageForm) {
  homePageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (homePageMessage) {
      homePageMessage.className = "message";
      homePageMessage.textContent = "Menyimpan...";
    }
    try {
      currentHomePage.slides.forEach((slide, idx) => {
        slide.title = homePageForm.querySelector(`.home-slide-title[data-index="${idx}"]`)?.value.trim() || "";
        slide.subtitle = homePageForm.querySelector(`.home-slide-subtitle[data-index="${idx}"]`)?.value.trim() || "";
        slide.ctaText = homePageForm.querySelector(`.home-slide-cta-text[data-index="${idx}"]`)?.value.trim() || "";
        slide.ctaLink = homePageForm.querySelector(`.home-slide-cta-link[data-index="${idx}"]`)?.value.trim() || "";
        slide.footnote = homePageForm.querySelector(`.home-slide-footnote[data-index="${idx}"]`)?.value.trim() || "";
      });

      for (let idx = 0; idx < currentHomePage.slides.length; idx++) {
        const fileInput = homePageForm.querySelector(`.home-slide-file[data-index="${idx}"]`);
        if (fileInput?.files[0]) {
          currentHomePage.slides[idx].imageUrl = await uploadBannerImage(fileInput.files[0]);
        }
      }

      currentHomePage.features.forEach((feature, idx) => {
        feature.title = homePageForm.querySelector(`.home-feature-title[data-index="${idx}"]`)?.value.trim() || "";
        feature.description = homePageForm.querySelector(`.home-feature-desc[data-index="${idx}"]`)?.value.trim() || "";
        feature.link = homePageForm.querySelector(`.home-feature-link[data-index="${idx}"]`)?.value.trim() || "";
      });

      for (let idx = 0; idx < currentHomePage.features.length; idx++) {
        const fileInput = homePageForm.querySelector(`.home-feature-file[data-index="${idx}"]`);
        if (fileInput?.files[0]) {
          currentHomePage.features[idx].imageUrl = await uploadFeatureImage(fileInput.files[0]);
        }
      }

      const aboutSection = await collectAboutSectionFromForm();
      currentHomePage.aboutSection = aboutSection;
      currentHomePage.footerSection = collectFooterSectionFromForm();

      const payload = {
        tagline: document.getElementById("homeTagline").value.trim(),
        sectionTitle: document.getElementById("homeSectionTitle").value.trim(),
        slides: currentHomePage.slides,
        features: currentHomePage.features,
        aboutSection: currentHomePage.aboutSection,
        footerSection: currentHomePage.footerSection,
      };

      const result = await apiFetch("/admin/settings/home_page", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (result?.homePage) {
        currentHomePage = {
          ...currentHomePage,
          ...result.homePage,
          aboutSection: cloneAboutSection(result.homePage.aboutSection),
        };
      }

      if (homePageMessage) {
        homePageMessage.className = "message success";
        homePageMessage.textContent = "Pengaturan halaman utama berhasil disimpan!";
      }
      localStorage.removeItem("marketplace_settings_cache");
      renderHomePageForms();
    } catch (error) {
      if (homePageMessage) {
        homePageMessage.className = "message";
        homePageMessage.textContent = error.message;
      }
    }
  });
}

function shippingMethodLabel(method) {
  if (method === "store") return "Mobil toko";
  if (method === "lalamove") return "Lalamove";
  if (method === "gosend") return "GoSend";
  return method || "-";
}

function updateWarehouseOriginPreview() {
  const lat = Number(document.getElementById("shipOriginLat")?.value);
  const lng = Number(document.getElementById("shipOriginLng")?.value);
  const name = document.getElementById("shipOriginName")?.value?.trim() || "Gudang";
  const address = document.getElementById("shipOriginAddress")?.value?.trim() || "";
  const preview = document.getElementById("shipOriginPreview");
  const mapLink = document.getElementById("shipOriginMapLink");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    if (preview) {
      preview.textContent = "Isi latitude dan longitude gudang untuk mengaktifkan perhitungan ongkir.";
      preview.classList.add("empty-state");
    }
    if (mapLink) mapLink.href = "#";
    return;
  }
  if (preview) {
    preview.classList.remove("empty-state");
    preview.textContent = `Asal kirim: ${name} — ${lat.toFixed(6)}, ${lng.toFixed(6)}${address ? ` · ${address}` : ""}`;
  }
  if (mapLink) {
    mapLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  }
}

function parseCoordinatesFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const atMatch = raw.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  const qMatch = raw.match(/[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
  const pairMatch = raw.match(/(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)/);
  if (pairMatch) return { lat: Number(pairMatch[1]), lng: Number(pairMatch[2]) };
  return null;
}

function handleWarehouseOriginGps() {
  if (!navigator.geolocation) {
    alert("Browser tidak mendukung GPS.");
    return;
  }
  const btn = document.getElementById("shipOriginGpsBtn");
  if (btn) btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latEl = document.getElementById("shipOriginLat");
      const lngEl = document.getElementById("shipOriginLng");
      if (latEl) latEl.value = pos.coords.latitude.toFixed(6);
      if (lngEl) lngEl.value = pos.coords.longitude.toFixed(6);
      updateWarehouseOriginPreview();
      if (shippingSettingsMessage) {
        shippingSettingsMessage.classList.add("success");
        shippingSettingsMessage.textContent =
          "Koordinat gudang diisi dari GPS. Klik Simpan Pengaturan Kirim agar tersimpan.";
      }
      if (btn) btn.disabled = false;
    },
    () => {
      alert("Gagal mengambil GPS. Izinkan akses lokasi atau isi koordinat manual.");
      if (btn) btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 20000 }
  );
}

function handleParseWarehouseCoords() {
  const paste = document.getElementById("shipOriginCoordPaste")?.value || "";
  const parsed = parseCoordinatesFromText(paste);
  if (!parsed || !Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) {
    alert("Format tidak dikenali. Contoh: -6.2088, 106.8456 atau link Google Maps.");
    return;
  }
  document.getElementById("shipOriginLat").value = parsed.lat.toFixed(6);
  document.getElementById("shipOriginLng").value = parsed.lng.toFixed(6);
  updateWarehouseOriginPreview();
  if (shippingSettingsMessage) {
    shippingSettingsMessage.classList.add("success");
    shippingSettingsMessage.textContent = "Koordinat berhasil diisi. Klik Simpan Pengaturan Kirim.";
  }
}

async function loadShippingSettings() {
  if (!shippingSettingsForm) return;
  try {
    const data = await apiFetch("/admin/settings/shipping");
    const s = data.settings || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    const setCheck = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };
    setVal("shipOriginName", s.originName || "");
    setVal("shipOriginLat", s.originLat ?? -6.2088);
    setVal("shipOriginLng", s.originLng ?? 106.8456);
    setVal("shipOriginAddress", s.originAddress || "");
    setCheck("shipStoreEnabled", s.storeDelivery?.enabled !== false);
    setVal("shipStoreFlatFee", s.storeDelivery?.flatFee ?? 50000);
    setVal("shipStoreFreeAbove", s.storeDelivery?.freeAboveSubtotal ?? 0);
    setCheck("shipLalamoveEnabled", s.lalamove?.enabled !== false);
    setCheck("shipGosendEnabled", s.gosend?.enabled !== false);
    setVal("shipLalamoveServiceType", s.lalamove?.serviceType || "MOTORCYCLE");
    setVal("shipGosendMethod", s.gosend?.shipmentMethod || "Instant");
    setVal("shipFallbackPerKm", s.fallback?.perKmRate ?? 3500);
    setVal("shipFallbackMinFee", s.fallback?.minFee ?? 15000);
    updateWarehouseOriginPreview();
    if (shippingApiStatus) {
      const p = data.providers || {};
      const lala = p.lalamove?.configured
        ? `terhubung (${p.lalamove.sandbox ? "sandbox" : "production"}${p.lalamove.keyPreview ? `, ${p.lalamove.keyPreview}` : ""})`
        : "belum — pakai estimasi jarak";
      const gos = p.gosend?.configured
        ? `terhubung (${p.gosend.baseUrl || "URL terisi"})`
        : "belum — pakai estimasi jarak";
      shippingApiStatus.textContent = `API Lalamove: ${lala}. API GoSend: ${gos}.`;
    }
  } catch (error) {
    if (shippingSettingsMessage) shippingSettingsMessage.textContent = error.message;
  }
}

document.getElementById("shipOriginGpsBtn")?.addEventListener("click", handleWarehouseOriginGps);
document.getElementById("shipOriginParseBtn")?.addEventListener("click", handleParseWarehouseCoords);
["shipOriginLat", "shipOriginLng", "shipOriginName", "shipOriginAddress"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", updateWarehouseOriginPreview);
});

if (shippingSettingsForm) {
  shippingSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (shippingSettingsMessage) shippingSettingsMessage.textContent = "";
    const originLat = Number(document.getElementById("shipOriginLat")?.value);
    const originLng = Number(document.getElementById("shipOriginLng")?.value);
    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      if (shippingSettingsMessage) {
        shippingSettingsMessage.textContent = "Latitude dan longitude gudang wajib diisi dengan benar.";
      }
      return;
    }
    const payload = {
      originName: document.getElementById("shipOriginName")?.value?.trim() || "",
      originLat,
      originLng,
      originAddress: document.getElementById("shipOriginAddress")?.value?.trim() || "",
      storeDelivery: {
        enabled: document.getElementById("shipStoreEnabled")?.checked,
        flatFee: Number(document.getElementById("shipStoreFlatFee")?.value || 0),
        freeAboveSubtotal: Number(document.getElementById("shipStoreFreeAbove")?.value || 0),
        label: "Kirim mobil toko",
      },
      lalamove: {
        enabled: document.getElementById("shipLalamoveEnabled")?.checked,
        serviceType: document.getElementById("shipLalamoveServiceType")?.value || "MOTORCYCLE",
      },
      gosend: {
        enabled: document.getElementById("shipGosendEnabled")?.checked,
        shipmentMethod: document.getElementById("shipGosendMethod")?.value || "Instant",
      },
      fallback: {
        perKmRate: Number(document.getElementById("shipFallbackPerKm")?.value || 3500),
        minFee: Number(document.getElementById("shipFallbackMinFee")?.value || 15000),
      },
    };
    try {
      await apiFetch("/admin/settings/shipping", {
        method: "PUT",
        body: JSON.stringify({ settings: payload }),
      });
      if (shippingSettingsMessage) {
        shippingSettingsMessage.classList.add("success");
        shippingSettingsMessage.textContent = "Pengaturan pengiriman berhasil disimpan.";
      }
      loadShippingSettings();
    } catch (error) {
      if (shippingSettingsMessage) {
        shippingSettingsMessage.classList.remove("success");
        shippingSettingsMessage.textContent = error.message;
      }
    }
  });
}

async function testShippingApi(provider) {
  if (!shippingSettingsMessage) return;
  shippingSettingsMessage.classList.remove("success");
  shippingSettingsMessage.textContent = `Menguji API ${provider}...`;
  try {
    const result = await apiFetch("/admin/settings/shipping/test", {
      method: "POST",
      body: JSON.stringify({ provider }),
    });
    if (result.ok) {
      shippingSettingsMessage.classList.add("success");
      shippingSettingsMessage.textContent = `${provider}: ${result.message}`;
    } else {
      shippingSettingsMessage.textContent = `${provider}: ${result.message}`;
    }
  } catch (error) {
    shippingSettingsMessage.textContent = error.message;
  }
}

document.getElementById("shipTestLalamoveBtn")?.addEventListener("click", () => testShippingApi("lalamove"));
document.getElementById("shipTestGosendBtn")?.addEventListener("click", () => testShippingApi("gosend"));

async function loadOrders() {
  const tbody = document.getElementById("ordersTbody");
  const msg = document.getElementById("ordersMessage");
  if (!tbody) return;
  try {
    const orders = await apiFetch("/admin/orders");
    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding: 10px; text-align: center;">Belum ada pesanan.</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map((order) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">#${order.id}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
          ${order.customer_name}<br/>
          <span style="font-size: 0.85rem; color: #6b7280;">${order.customer_email || '-'}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${new Date(order.created_at).toLocaleString('id-ID')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
          ${formatRupiah(order.total)}<br/>
          <span style="font-size: 0.78rem; color: #6b7280;">${shippingMethodLabel(order.shipping_method)}${order.shipping_fee ? ` · ongkir ${formatRupiah(order.shipping_fee)}` : ""}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
          <span style="background: #e5edff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">
            ${order.status}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
          <select data-action="change-entity" data-order-id="${order.id}" style="padding: 4px; font-size: 0.8rem; margin-right: 4px; border: 1px solid #d1d5db; border-radius: 4px;">
            <option value="" ${!order.fulfillment_entity ? 'selected' : ''}>PT Sahabat Jaya Sukses (Default)</option>
            <option value="SJS" ${order.fulfillment_entity === 'SJS' ? 'selected' : ''}>PT Sahabat Jaya Sukses</option>
            <option value="SJL" ${order.fulfillment_entity === 'SJL' ? 'selected' : ''}>PT Sukses Jaya Lestari</option>
          </select>
          <a href="/invoice.html?id=${order.id}" target="_blank" class="btn-secondary" style="font-size: 0.8rem; padding: 4px 8px; display: inline-block;">Lihat Invoice</a>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    if (msg) msg.textContent = error.message;
    tbody.innerHTML = '<tr><td colspan="6" style="padding: 10px; text-align: center; color: red;">Gagal memuat pesanan.</td></tr>';
  }
}

let lastSalesReport = null;

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function initReportPeriodFilters(monthId, yearId) {
  const monthEl = document.getElementById(monthId);
  const yearEl = document.getElementById(yearId);
  if (!monthEl || !yearEl) return;
  const now = new Date();
  monthEl.value = String(now.getMonth() + 1);
  yearEl.value = String(now.getFullYear());
}

function initSalesReportFilters() {
  initReportPeriodFilters("salesMonth", "salesYear");
}

function initInventoryReportFilters() {
  initReportPeriodFilters("inventoryMonth", "inventoryYear");
}

function setSalesMessage(text, isSuccess = false) {
  const el = document.getElementById("salesMessage");
  if (!el) return;
  el.classList.toggle("success", isSuccess);
  el.textContent = text || "";
}

function renderSalesSummary(summary, period) {
  const el = document.getElementById("salesSummary");
  if (!el || !summary) return;
  const monthLabel = MONTH_NAMES[(period?.month || 1) - 1] || "";
  el.innerHTML = `
    <div class="info-card" style="margin: 0; padding: 14px;">
      <p style="margin: 0 0 4px; font-size: 0.85rem; color: #6b7280;">Periode</p>
      <p style="margin: 0; font-weight: 700;">${monthLabel} ${period?.year || ""}</p>
    </div>
    <div class="info-card" style="margin: 0; padding: 14px;">
      <p style="margin: 0 0 4px; font-size: 0.85rem; color: #6b7280;">Total Omzet</p>
      <p style="margin: 0; font-weight: 700; color: #2563eb;">${formatRupiah(summary.total_revenue)}</p>
    </div>
    <div class="info-card" style="margin: 0; padding: 14px;">
      <p style="margin: 0 0 4px; font-size: 0.85rem; color: #6b7280;">Jumlah Order</p>
      <p style="margin: 0; font-weight: 700;">${summary.order_count}</p>
    </div>
    <div class="info-card" style="margin: 0; padding: 14px;">
      <p style="margin: 0 0 4px; font-size: 0.85rem; color: #6b7280;">Item Terjual</p>
      <p style="margin: 0; font-weight: 700;">${summary.total_items_sold}</p>
    </div>
    <div class="info-card" style="margin: 0; padding: 14px;">
      <p style="margin: 0 0 4px; font-size: 0.85rem; color: #6b7280;">Rata-rata / Order</p>
      <p style="margin: 0; font-weight: 700;">${formatRupiah(summary.avg_order_value)}</p>
    </div>
  `;
}

function paymentMethodLabel(method) {
  const map = { transfer: "Transfer Bank", qris: "QRIS", cod: "COD", ewallet: "E-Wallet" };
  return map[method] || method || "-";
}

async function loadSalesReport() {
  const productsTbody = document.getElementById("salesProductsTbody");
  const paymentTbody = document.getElementById("salesPaymentTbody");
  const ordersTbody = document.getElementById("salesOrdersTbody");
  const exportBtn = document.getElementById("salesExportBtn");
  const month = Number(document.getElementById("salesMonth")?.value);
  const year = Number(document.getElementById("salesYear")?.value);
  const status = document.getElementById("salesStatus")?.value || "all";

  if (!productsTbody) return;
  setSalesMessage("");
  productsTbody.innerHTML =
    '<tr><td colspan="4" style="padding: 10px; text-align: center;">Memuat laporan...</td></tr>';
  if (paymentTbody) {
    paymentTbody.innerHTML =
      '<tr><td colspan="3" style="padding: 10px; text-align: center;">Memuat...</td></tr>';
  }
  if (ordersTbody) {
    ordersTbody.innerHTML =
      '<tr><td colspan="7" style="padding: 10px; text-align: center;">Memuat...</td></tr>';
  }

  try {
    const report = await apiFetch(
      `/admin/sales/report?year=${year}&month=${month}&status=${encodeURIComponent(status)}`
    );
    lastSalesReport = report;
    if (exportBtn) exportBtn.disabled = false;

    renderSalesSummary(report.summary, report.period);

    const products = report.products || [];
    productsTbody.innerHTML = products.length
      ? products
          .map(
            (row) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${row.product_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${row.size || "-"}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${row.qty_sold}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${formatRupiah(row.revenue)}</td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="4" style="padding: 10px; text-align: center;">Tidak ada penjualan pada periode ini.</td></tr>';

    const payments = report.payment_methods || [];
    paymentTbody.innerHTML = payments.length
      ? payments
          .map(
            (row) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${paymentMethodLabel(row.payment_method)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${row.order_count}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${formatRupiah(row.revenue)}</td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="3" style="padding: 10px; text-align: center;">-</td></tr>';

    const orders = report.orders || [];
    ordersTbody.innerHTML = orders.length
      ? orders
          .map(
            (order) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">#${order.id}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
            ${order.customer_name}<br/>
            <span style="font-size: 0.85rem; color: #6b7280;">${order.customer_email || "-"}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${new Date(order.created_at).toLocaleString("id-ID")}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${paymentMethodLabel(order.payment_method)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
            <span style="background: #e5edff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${order.status}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${formatRupiah(order.total)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
            <a href="/invoice.html?id=${order.id}" target="_blank" class="btn-secondary" style="font-size: 0.8rem; padding: 4px 8px;">Invoice</a>
          </td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="7" style="padding: 10px; text-align: center;">Tidak ada order pada periode ini.</td></tr>';

    setSalesMessage("Laporan penjualan berhasil dimuat.", true);
  } catch (error) {
    lastSalesReport = null;
    if (exportBtn) exportBtn.disabled = true;
    setSalesMessage(error.message);
    productsTbody.innerHTML =
      '<tr><td colspan="4" style="padding: 10px; text-align: center; color: red;">Gagal memuat laporan.</td></tr>';
  }
}

function exportSalesReportCsv() {
  if (!lastSalesReport) return;
  const { period, summary, products, payment_methods: payments, orders } = lastSalesReport;
  const monthLabel = MONTH_NAMES[(period?.month || 1) - 1] || "";
  const lines = [
    `Laporan Penjualan - ${monthLabel} ${period?.year}`,
    "",
    "Ringkasan",
    `Total Omzet,${summary?.total_revenue || 0}`,
    `Jumlah Order,${summary?.order_count || 0}`,
    `Item Terjual,${summary?.total_items_sold || 0}`,
    `Rata-rata Order,${summary?.avg_order_value || 0}`,
    "",
    "Produk,Ukuran,Qty Terjual,Omzet",
    ...(products || []).map(
      (r) =>
        `"${String(r.product_name).replace(/"/g, '""')}","${String(r.size || "").replace(/"/g, '""')}",${r.qty_sold},${r.revenue}`
    ),
    "",
    "Metode Pembayaran,Jumlah Order,Omzet",
    ...(payments || []).map((r) => `${paymentMethodLabel(r.payment_method)},${r.order_count},${r.revenue}`),
    "",
    "Order ID,Customer,Tanggal,Pembayaran,Status,Total",
    ...(orders || []).map(
      (o) =>
        `${o.id},"${String(o.customer_name).replace(/"/g, '""')}",${o.created_at},${paymentMethodLabel(o.payment_method)},${o.status},${o.total}`
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-penjualan-${period?.year}-${String(period?.month).padStart(2, "0")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function setInventoryMessage(text, isSuccess = false) {
  const el = document.getElementById("inventoryMessage");
  if (!el) return;
  el.classList.toggle("success", isSuccess);
  el.textContent = text || "";
}

async function loadInventoryReport() {
  const tbody = document.getElementById("inventoryTbody");
  const month = Number(document.getElementById("inventoryMonth")?.value);
  const year = Number(document.getElementById("inventoryYear")?.value);

  if (!tbody) return;
  setInventoryMessage("");
  tbody.innerHTML =
    '<tr><td colspan="5" style="padding: 10px; text-align: center;">Memuat laporan...</td></tr>';

  try {
    const rows = await apiFetch(`/admin/inventory/report?year=${year}&month=${month}`);
    if (!rows || !rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="padding: 10px; text-align: center;">Belum ada data produk.</td></tr>';
      setInventoryMessage("Tidak ada data produk.", true);
      return;
    }

    tbody.innerHTML = rows
      .map(
        (row) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${row.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${row.opening_balance}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; color: var(--primary);">${row.in_qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; color: var(--danger);">${row.out_qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600;">${row.ending_balance}</td>
      </tr>`
      )
      .join("");

    const monthLabel = MONTH_NAMES[month - 1] || "";
    setInventoryMessage(`Laporan stok ${monthLabel} ${year} berhasil dimuat.`, true);
  } catch (error) {
    setInventoryMessage(error.message);
    tbody.innerHTML =
      '<tr><td colspan="5" style="padding: 10px; text-align: center; color: red;">Gagal memuat laporan stok.</td></tr>';
  }
}

document.getElementById("salesFilterBtn")?.addEventListener("click", loadSalesReport);
document.getElementById("salesExportBtn")?.addEventListener("click", exportSalesReportCsv);
document.getElementById("inventoryFilterBtn")?.addEventListener("click", loadInventoryReport);
initSalesReportFilters();
initInventoryReportFilters();

document.getElementById("ordersTbody")?.addEventListener("change", async (event) => {
  const target = event.target;
  if (target?.dataset?.action === "change-entity") {
    const orderId = target.dataset.orderId;
    const entity = target.value;
    try {
      await apiFetch(`/admin/orders/${orderId}/entity`, {
        method: "PUT",
        body: JSON.stringify({ entity }),
      });
      alert("Entitas invoice berhasil diubah.");
    } catch (error) {
      alert("Gagal mengubah entitas: " + error.message);
    }
  }
});

// --- WhatsApp Bot Admin Logic ---
const waSettingsForm = document.getElementById("waSettingsForm");
const waBotEnabled = document.getElementById("waBotEnabled");
const waBotNumber = document.getElementById("waBotNumber");
const waBotFallback = document.getElementById("waBotFallback");
const waSettingsMessage = document.getElementById("waSettingsMessage");
const waSessionsTbody = document.getElementById("waSessionsTbody");
const refreshWaSessionsBtn = document.getElementById("refreshWaSessionsBtn");

async function loadWaSettings() {
  if (!waSettingsForm) return;
  const waWebhookUrl = document.getElementById("waWebhookUrl");
  if (waWebhookUrl) {
    waWebhookUrl.textContent = `${window.location.origin}/api/whatsapp/webhook`;
  }
  try {
    const data = await apiFetch("/admin/settings/whatsapp");
    if (waBotEnabled) waBotEnabled.checked = !!data.enabled;
    if (waBotNumber) waBotNumber.value = data.botNumber || "";
    if (waBotFallback) waBotFallback.value = data.fallbackMessage || "";
  } catch (err) {
    console.error("Gagal memuat pengaturan WA Bot", err);
  }
}

async function loadWaSessions() {
  if (!waSessionsTbody) return;
  try {
    waSessionsTbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center;">Memuat riwayat...</td></tr>';
    const sessions = await apiFetch("/admin/whatsapp/sessions");
    if (!sessions || sessions.length === 0) {
      waSessionsTbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center;">Belum ada riwayat percakapan.</td></tr>';
      return;
    }
    waSessionsTbody.innerHTML = sessions.map(s => {
      const date = new Date(s.created_at).toLocaleString('id-ID', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute:'2-digit'
      });
      return `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 10px;">${date}</td>
          <td style="padding: 10px;">${escapeHtml(s.phone)}</td>
          <td style="padding: 10px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(s.message_in)}">${escapeHtml(s.message_in)}</td>
          <td style="padding: 10px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(s.message_out)}">${escapeHtml(s.message_out)}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    waSessionsTbody.innerHTML = `<tr><td colspan="4" style="padding: 10px; text-align: center; color: red;">Gagal memuat riwayat: ${err.message}</td></tr>`;
  }
}

if (waSettingsForm) {
  waSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (waSettingsMessage) {
      waSettingsMessage.className = "message";
      waSettingsMessage.textContent = "Menyimpan pengaturan...";
    }
    try {
      const payload = {
        enabled: waBotEnabled.checked,
        botNumber: waBotNumber ? waBotNumber.value.trim() : "",
        fallbackMessage: waBotFallback.value.trim()
      };
      const res = await apiFetch("/admin/settings/whatsapp", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      // Clear cache so frontend picks up new WA number immediately
      localStorage.removeItem("marketplace_settings_cache");
      
      if (waSettingsMessage) {
        waSettingsMessage.className = "message success";
        waSettingsMessage.textContent = res.message || "Pengaturan WhatsApp Bot disimpan.";
      }
    } catch (err) {
      if (waSettingsMessage) {
        waSettingsMessage.className = "message";
        waSettingsMessage.textContent = err.message;
      }
    }
  });
}

if (refreshWaSessionsBtn) {
  refreshWaSessionsBtn.addEventListener("click", loadWaSessions);
}

// ----------------

renderUserArea();
if (guardAccess()) {
  initTabs();
  initSalesReportFilters();
  initInventoryReportFilters();
  applyRoleRulesToUI();
  loadUsers();
  loadAdminProducts();
  loadMenu();
  loadCompanyProfileSettings();
  loadShippingSettings();
  loadWaSettings();
  loadWaSessions();
}

