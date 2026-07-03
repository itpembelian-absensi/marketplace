const addressTableBody = document.getElementById("addressTableBody");
const addressFormPanel = document.getElementById("addressFormPanel");
const addressShowFormBtn = document.getElementById("addressShowFormBtn");
const addressSearchInput = document.getElementById("addressSearch");
const addressCountLabel = document.getElementById("addressCountLabel");
const addressForm = document.getElementById("addressForm");
const addressFormTitle = document.getElementById("addressFormTitle");
const addressMessage = document.getElementById("addressMessage");
const addressLabelInput = document.getElementById("addressLabel");
const addressRecipientInput = document.getElementById("addressRecipient");
const addressPhoneInput = document.getElementById("addressPhone");
const addressTextInput = document.getElementById("addressText");
const addressLatInput = document.getElementById("addressLat");
const addressLngInput = document.getElementById("addressLng");
const addressDefaultInput = document.getElementById("addressDefault");
const addressSubmitBtn = document.getElementById("addressSubmitBtn");
const addressCancelBtn = document.getElementById("addressCancelBtn");
const addressGpsBtn = document.getElementById("addressGpsBtn");

let editingAddressId = null;
let allAddresses = [];

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setAddressMessage(text, isSuccess = false) {
  if (!addressMessage) return;
  addressMessage.textContent = text || "";
  addressMessage.className = "message " + (isSuccess ? "success" : "");
  addressMessage.classList.remove("hidden");
}

function showAddressForm(show = true) {
  if (addressFormPanel) addressFormPanel.classList.toggle("hidden", !show);
  if (show) addressFormPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAddressForm() {
  editingAddressId = null;
  if (addressForm) addressForm.reset();
  if (addressFormTitle) addressFormTitle.textContent = "Tambah Alamat Baru";
  if (addressSubmitBtn) addressSubmitBtn.textContent = "Simpan Alamat";
}

function fillAddressForm(addr) {
  editingAddressId = addr.id;
  if (addressFormTitle) addressFormTitle.textContent = `Edit Alamat #${addr.id}`;
  if (addressLabelInput) addressLabelInput.value = addr.label || "";
  if (addressRecipientInput) addressRecipientInput.value = addr.recipientName || "";
  if (addressPhoneInput) addressPhoneInput.value = addr.phone || "";
  if (addressTextInput) addressTextInput.value = addr.address || "";
  if (addressLatInput) addressLatInput.value = addr.lat != null ? addr.lat : "";
  if (addressLngInput) addressLngInput.value = addr.lng != null ? addr.lng : "";
  if (addressDefaultInput) addressDefaultInput.checked = Boolean(addr.isDefault);
  if (addressSubmitBtn) addressSubmitBtn.textContent = "Perbarui Alamat";
  showAddressForm(true);
}

function getFilteredAddresses() {
  const q = (addressSearchInput?.value || "").trim().toLowerCase();
  if (!q) return allAddresses;
  return allAddresses.filter((a) => {
    const hay = [a.label, a.recipientName, a.phone, a.address].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function renderAddressTable(addresses) {
  if (!addressTableBody) return;
  const rows = addresses;
  if (addressCountLabel) {
    addressCountLabel.textContent = `${rows.length} alamat${rows.length !== allAddresses.length ? ` (dari ${allAddresses.length})` : ""}`;
  }
  if (!rows.length) {
    addressTableBody.innerHTML = `
      <tr><td colspan="7" class="empty-state" style="padding:16px;text-align:center">
        ${allAddresses.length ? "Tidak ada alamat yang cocok dengan pencarian." : "Belum ada alamat. Klik Tambah Alamat."}
      </td></tr>`;
    return;
  }
  addressTableBody.innerHTML = rows
    .map((addr) => {
      const gps =
        addr.lat != null && addr.lng != null
          ? `${Number(addr.lat).toFixed(5)}, ${Number(addr.lng).toFixed(5)}`
          : "—";
      const shortAddr =
        addr.address.length > 60 ? `${escapeHtml(addr.address.slice(0, 60))}…` : escapeHtml(addr.address);
      return `
      <tr class="${addr.isDefault ? "address-row-default" : ""}">
        <td><strong>${escapeHtml(addr.label || "—")}</strong></td>
        <td>${escapeHtml(addr.recipientName)}</td>
        <td>${escapeHtml(addr.phone)}</td>
        <td title="${escapeHtml(addr.address)}">${shortAddr}</td>
        <td style="font-size:0.8rem">${gps}</td>
        <td>${addr.isDefault ? '<span class="address-default-badge">Default</span>' : "—"}</td>
        <td class="address-table-actions">
          ${!addr.isDefault ? `<button type="button" class="btn-secondary" data-action="set-default" data-id="${addr.id}">Default</button>` : ""}
          <button type="button" class="btn-secondary" data-action="edit" data-id="${addr.id}">Edit</button>
          <button type="button" class="btn-danger" data-action="delete" data-id="${addr.id}">Hapus</button>
        </td>
      </tr>`;
    })
    .join("");
}

async function loadUserAddresses() {
  if (!getToken()) {
    window.location.href = "/login.html?next=/addresses.html";
    return [];
  }
  try {
    allAddresses = await apiFetch("/addresses");
    if (!Array.isArray(allAddresses)) allAddresses = [];
    renderAddressTable(getFilteredAddresses());
    return allAddresses;
  } catch (error) {
    if (addressTableBody) {
      addressTableBody.innerHTML = `<tr><td colspan="7" style="padding:16px;color:red;text-align:center">${escapeHtml(error.message)}</td></tr>`;
    }
    return [];
  }
}

function guardAddressMasterPage() {
  if (!getToken()) {
    window.location.href = "/login.html?next=/addresses.html";
    return false;
  }
  return true;
}

if (addressShowFormBtn) {
  addressShowFormBtn.addEventListener("click", () => {
    resetAddressForm();
    showAddressForm(true);
    addressRecipientInput?.focus();
  });
}

if (addressCancelBtn) {
  addressCancelBtn.addEventListener("click", () => {
    resetAddressForm();
    showAddressForm(false);
    setAddressMessage("");
  });
}

if (addressSearchInput) {
  addressSearchInput.addEventListener("input", () => renderAddressTable(getFilteredAddresses()));
}

if (addressGpsBtn) {
  addressGpsBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung GPS.");
      return;
    }
    addressGpsBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (addressLatInput) addressLatInput.value = pos.coords.latitude.toFixed(6);
        if (addressLngInput) addressLngInput.value = pos.coords.longitude.toFixed(6);
        addressGpsBtn.disabled = false;
        setAddressMessage("Koordinat GPS diisi.", true);
      },
      () => {
        alert("Gagal mengambil GPS.");
        addressGpsBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

if (addressForm) {
  addressForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      label: addressLabelInput?.value?.trim() || "",
      recipientName: addressRecipientInput?.value?.trim() || "",
      phone: addressPhoneInput?.value?.trim() || "",
      address: addressTextInput?.value?.trim() || "",
      lat: addressLatInput?.value?.trim() || null,
      lng: addressLngInput?.value?.trim() || null,
      isDefault: addressDefaultInput?.checked || false,
    };
    try {
      if (editingAddressId) {
        await apiFetch(`/addresses/${editingAddressId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setAddressMessage("Alamat berhasil diperbarui.", true);
      } else {
        await apiFetch("/addresses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setAddressMessage("Alamat berhasil ditambahkan.", true);
      }
      resetAddressForm();
      showAddressForm(false);
      await loadUserAddresses();
    } catch (error) {
      setAddressMessage(error.message);
    }
  });
}

if (addressTableBody) {
  addressTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    if (!id) return;

    if (action === "edit") {
      const addr = allAddresses.find((a) => a.id === id);
      if (addr) fillAddressForm(addr);
      return;
    }

    if (action === "set-default") {
      try {
        await apiFetch(`/addresses/${id}/default`, { method: "PUT" });
        setAddressMessage("Alamat default diperbarui.", true);
        await loadUserAddresses();
      } catch (error) {
        setAddressMessage(error.message);
      }
      return;
    }

    if (action === "delete") {
      if (!window.confirm("Hapus alamat ini dari master?")) return;
      try {
        await apiFetch(`/addresses/${id}`, { method: "DELETE" });
        setAddressMessage("Alamat dihapus.", true);
        if (editingAddressId === id) {
          resetAddressForm();
          showAddressForm(false);
        }
        await loadUserAddresses();
      } catch (error) {
        setAddressMessage(error.message);
      }
    }
  });
}

window.loadUserAddresses = loadUserAddresses;

if (guardAddressMasterPage()) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("action") === "new") {
    resetAddressForm();
    showAddressForm(true);
  }
  loadUserAddresses();
}
