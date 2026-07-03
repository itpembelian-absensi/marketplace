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
    loadUserPoints();
    loadRewards();
    loadPointsHistory();
  } catch (error) {
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

// --- Points System ---
const userTotalPointsEl = document.getElementById("userTotalPoints");
const rewardsListEl = document.getElementById("rewardsList");
const userPointsHistoryTbody = document.getElementById("userPointsHistoryTbody");
const redeemMessage = document.getElementById("redeemMessage");

async function loadUserPoints() {
  try {
    const data = await apiFetch("/points/my");
    userTotalPointsEl.textContent = data.totalPoints || 0;
  } catch (error) {
    userTotalPointsEl.textContent = "Error";
  }
}

async function loadRewards() {
  try {
    const rewards = await apiFetch("/points/rewards");
    if (!rewards || rewards.length === 0) {
      rewardsListEl.innerHTML = '<p style="color: #6b7280; font-style: italic;">Belum ada hadiah tersedia.</p>';
      return;
    }

    rewardsListEl.innerHTML = rewards.map(r => `
      <div style="border: 1px solid var(--border); border-radius: 8px; padding: 15px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
        <h4 style="margin: 0 0 5px;">${r.name}</h4>
        <p style="font-size: 0.85rem; color: #6b7280; margin: 0 0 10px; flex: 1;">${r.description || 'Hadiah spesial untuk Anda!'}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-weight: bold; color: var(--primary); font-size: 1.1rem;">${r.points_required} Poin</span>
        </div>
        <button class="btn-primary" onclick="redeemReward(${r.id}, '${r.name}', ${r.points_required})" style="width: 100%; padding: 8px; font-size: 0.9rem;">Tukar</button>
      </div>
    `).join('');
  } catch (error) {
    rewardsListEl.innerHTML = '<p style="color: red;">Gagal memuat hadiah.</p>';
  }
}

async function loadPointsHistory() {
  try {
    const history = await apiFetch("/points/my/history");
    if (!history || history.length === 0) {
      userPointsHistoryTbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center;">Belum ada riwayat poin.</td></tr>';
      return;
    }

    userPointsHistoryTbody.innerHTML = history.map(h => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${new Date(h.created_at).toLocaleDateString('id-ID')}</td>
        <td style="padding: 10px;">${h.type === 'earn' ? '<span style="color:green; font-weight:500;">Dapat Poin</span>' : '<span style="color:red; font-weight:500;">Tukar Hadiah</span>'}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; ${h.type === 'earn' ? 'color:green' : 'color:red'}">${h.type === 'earn' ? '+' : '-'}${h.points}</td>
        <td style="padding: 10px;">${h.description || '-'}</td>
      </tr>
    `).join('');
  } catch (error) {
    userPointsHistoryTbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center; color: red;">Gagal memuat riwayat.</td></tr>';
  }
}

window.redeemReward = async function(rewardId, rewardName, pointsRequired) {
  const currentPoints = parseInt(userTotalPointsEl.textContent) || 0;
  if (currentPoints < pointsRequired) {
    redeemMessage.textContent = `Poin Anda tidak mencukupi. Butuh ${pointsRequired} poin.`;
    redeemMessage.className = "message";
    return;
  }

  if (!confirm(`Tukar ${pointsRequired} poin dengan "${rewardName}"?`)) return;

  redeemMessage.textContent = "Memproses...";
  redeemMessage.className = "message";

  try {
    const res = await apiFetch("/points/redeem", {
      method: "POST",
      body: JSON.stringify({ rewardId })
    });
    
    redeemMessage.textContent = res.message;
    redeemMessage.className = "message success";
    
    // Refresh data
    loadUserPoints();
    loadPointsHistory();
  } catch (error) {
    redeemMessage.textContent = error.message;
    redeemMessage.className = "message";
  }
};
