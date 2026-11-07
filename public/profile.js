const profileForm = document.getElementById("profileForm");
const profileNameInput = document.getElementById("profileName");
const profilePasswordInput = document.getElementById("profilePassword");
const profileMessage = document.getElementById("profileMessage");

const profileAvatarContainer = document.getElementById("profileAvatarContainer");
const profileNameDisplay = document.getElementById("profileNameDisplay");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");
const profileRoleDisplay = document.getElementById("profileRoleDisplay");
const profileImageInput = document.getElementById("profileImageInput");

let currentProfilePic = "";

function showMessage(msg, isSuccess = false) {
  profileMessage.textContent = msg;
  profileMessage.className = "message " + (isSuccess ? "success" : "");
  profileMessage.classList.remove("hidden");
}

function renderAvatar() {
  if (currentProfilePic) {
    profileAvatarContainer.innerHTML = `<img src="${currentProfilePic}" alt="Profile" class="profile-avatar-large" />`;
  } else {
    const initial = profileNameInput.value ? profileNameInput.value.charAt(0).toUpperCase() : "?";
    profileAvatarContainer.innerHTML = `<div class="profile-avatar-placeholder-large">${initial}</div>`;
  }
}

async function loadProfileAddressSummary() {
  const el = document.getElementById("profileAddressSummary");
  if (!el) return;
  try {
    const addresses = await apiFetch("/addresses");
    if (!addresses?.length) {
      el.textContent = "Belum ada alamat. Klik Buka Master Alamat untuk menambah.";
      return;
    }
    const def = addresses.find((a) => a.isDefault) || addresses[0];
    const extra = addresses.length > 1 ? ` (+${addresses.length - 1} alamat lain)` : "";
    el.innerHTML = `
      <strong>Default:</strong> ${def.label ? `${def.label} — ` : ""}${def.recipientName}<br/>
      <span style="color:#6b7280">${def.phone} · ${def.address}</span>
      <span style="color:#6b7280">${extra}</span>`;
    el.classList.remove("empty-state");
  } catch (error) {
    el.textContent = error.message;
  }
}

async function loadProfile() {
  const auth = getAuth();
  if (!auth) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const user = await apiFetch("/auth/me");
    profileNameDisplay.textContent = user.name;
    profileEmailDisplay.textContent = user.email;
    profileRoleDisplay.textContent = `Role: ${user.role}`;
    
    profileNameInput.value = user.name;
    currentProfilePic = user.profile_picture || "";
    renderAvatar();

    loadProfileAddressSummary();
  } catch (error) {
    const tokenError = /token tidak valid|token tidak ditemukan|kadaluarsa/i.test(
      error.message || ""
    );
    if (tokenError) {
      clearAuth();
      window.location.href = "/login.html?next=/profile.html";
      return;
    }
    showMessage(error.message);
  }
}

profileImageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    showMessage("Mengupload gambar...", true);
    const token = getToken();
    const response = await fetch("/api/auth/profile/upload-picture", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Gagal upload gambar");

    currentProfilePic = data.imageUrl;
    renderAvatar();
    
    // Auto save the profile with new image
    await saveProfile(profileNameInput.value, profilePasswordInput.value, currentProfilePic);
    
    showMessage("Foto profil berhasil diperbarui!", true);
  } catch (error) {
    showMessage(error.message);
  }
});

async function saveProfile(name, password, profile_picture) {
  const payload = { name, profile_picture };
  if (password) {
    payload.password = password;
  }

  const result = await apiFetch("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  // Update local auth storage
  const auth = getAuth();
  if (auth) {
    auth.user = result.user;
    setAuth(auth);
    renderUserArea(); // refresh topbar
  }

  return result;
}

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  profileMessage.classList.add("hidden");

  try {
    const result = await saveProfile(
      profileNameInput.value,
      profilePasswordInput.value,
      currentProfilePic
    );
    
    profileNameDisplay.textContent = result.user.name;
    profilePasswordInput.value = "";
    showMessage("Profil berhasil disimpan!", true);
  } catch (error) {
    showMessage(error.message);
  }
});

loadProfile();
