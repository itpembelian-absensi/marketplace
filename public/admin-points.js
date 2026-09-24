const rewardForm = document.getElementById("rewardForm");
const rewardNameInput = document.getElementById("rewardName");
const rewardPointsInput = document.getElementById("rewardPoints");
const rewardTypeInput = document.getElementById("rewardType");
const rewardValueInput = document.getElementById("rewardValue");
const rewardActiveInput = document.getElementById("rewardActive");
const rewardDescInput = document.getElementById("rewardDesc");
const rewardSubmitBtn = document.getElementById("rewardSubmitBtn");
const rewardCancelBtn = document.getElementById("rewardCancelBtn");
const rewardMessage = document.getElementById("rewardMessage");
const rewardsTbody = document.getElementById("rewardsTbody");
const userPointsTbody = document.getElementById("userPointsTbody");
const pointsHistoryTbody = document.getElementById("pointsHistoryTbody");
const adjustPointsForm = document.getElementById("adjustPointsForm");
const adjustPointsUserId = document.getElementById("adjustPointsUserId");
const adjustPointsUserSearch = document.getElementById("adjustPointsUserSearch");
const openUserLookupBtn = document.getElementById("openUserLookupBtn");
const userLookupModal = document.getElementById("userLookupModal");
const userLookupBy = document.getElementById("userLookupBy");
const userLookupQuery = document.getElementById("userLookupQuery");
const userLookupTbody = document.getElementById("userLookupTbody");
const userLookupRecord = document.getElementById("userLookupRecord");
const adjustPointsAmount = document.getElementById("adjustPointsAmount");
const adjustPointsDesc = document.getElementById("adjustPointsDesc");
const adjustPointsMessage = document.getElementById("adjustPointsMessage");
let editingRewardId = null;
let pointsUserOptions = [];
let lookupFiltered = [];
let lookupPage = 0;
const LOOKUP_PAGE_SIZE = 8;

function openUserLookup() {
  if (!userLookupModal) return;
  if (userLookupQuery) userLookupQuery.value = "";
  lookupPage = 0;
  applyUserLookup();
  userLookupModal.classList.remove("hidden");
  userLookupModal.setAttribute("aria-hidden", "false");
  userLookupQuery?.focus();
}

function closeUserLookup() {
  userLookupModal?.classList.add("hidden");
  userLookupModal?.setAttribute("aria-hidden", "true");
}

function applyUserLookup() {
  const by = userLookupBy?.value || "name";
  const keyword = String(userLookupQuery?.value || "").trim().toLowerCase();
  lookupFiltered = pointsUserOptions.filter((user) => {
    if (!keyword) return true;
    if (by === "email") return String(user.email || "").toLowerCase().includes(keyword);
    if (by === "id") return String(user.id).includes(keyword);
    return String(user.name || "").toLowerCase().includes(keyword);
  });
  const maxPage = Math.max(0, Math.ceil(lookupFiltered.length / LOOKUP_PAGE_SIZE) - 1);
  if (lookupPage > maxPage) lookupPage = maxPage;
  renderUserLookupPage();
}

function renderUserLookupPage() {
  if (!userLookupTbody) return;
  const total = lookupFiltered.length;
  const start = lookupPage * LOOKUP_PAGE_SIZE;
  const pageRows = lookupFiltered.slice(start, start + LOOKUP_PAGE_SIZE);
  const from = total ? start + 1 : 0;
  const to = Math.min(start + LOOKUP_PAGE_SIZE, total);
  if (userLookupRecord) userLookupRecord.textContent = `Record ${from}..${to} of ${total}`;
  if (!pageRows.length) {
    userLookupTbody.innerHTML = '<tr><td colspan="4" style="padding:12px;text-align:center;">User tidak ditemukan.</td></tr>';
    return;
  }
  userLookupTbody.innerHTML = pageRows.map((user) => `
    <tr data-user-id="${user.id}">
      <td>#${user.id}</td>
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${user.total_points}</td>
    </tr>
  `).join("");
}

function selectLookupUser(user) {
  if (!user || !adjustPointsUserId || !adjustPointsUserSearch) return;
  adjustPointsUserId.value = String(user.id);
  adjustPointsUserSearch.value = `${user.name} (${user.email})`;
  closeUserLookup();
}

adjustPointsUserSearch?.addEventListener("click", openUserLookup);
openUserLookupBtn?.addEventListener("click", openUserLookup);
document.getElementById("userLookupSearchBtn")?.addEventListener("click", () => {
  lookupPage = 0;
  applyUserLookup();
});
document.getElementById("userLookupClearBtn")?.addEventListener("click", () => {
  if (userLookupQuery) userLookupQuery.value = "";
  lookupPage = 0;
  applyUserLookup();
});
userLookupQuery?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    lookupPage = 0;
    applyUserLookup();
  }
});
document.getElementById("userLookupFirst")?.addEventListener("click", () => {
  lookupPage = 0;
  renderUserLookupPage();
});
document.getElementById("userLookupPrev")?.addEventListener("click", () => {
  lookupPage = Math.max(0, lookupPage - 1);
  renderUserLookupPage();
});
document.getElementById("userLookupNext")?.addEventListener("click", () => {
  const maxPage = Math.max(0, Math.ceil(lookupFiltered.length / LOOKUP_PAGE_SIZE) - 1);
  lookupPage = Math.min(maxPage, lookupPage + 1);
  renderUserLookupPage();
});
document.getElementById("userLookupLast")?.addEventListener("click", () => {
  lookupPage = Math.max(0, Math.ceil(lookupFiltered.length / LOOKUP_PAGE_SIZE) - 1);
  renderUserLookupPage();
});
userLookupTbody?.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-user-id]");
  if (!row) return;
  const user = pointsUserOptions.find((item) => String(item.id) === row.dataset.userId);
  selectLookupUser(user);
});
document.getElementById("userLookupClose")?.addEventListener("click", closeUserLookup);
document.getElementById("userLookupCloseBottom")?.addEventListener("click", closeUserLookup);
userLookupModal?.addEventListener("click", (event) => {
  if (event.target === userLookupModal) closeUserLookup();
});

const pointSubTabs = ["pointsRewardSubTab", "pointsUserSubTab", "pointsHistorySubTab"];

document.querySelectorAll("#pointsTab .tabs .tab").forEach((button) => {
  button.addEventListener("click", () => {
    const tabId = button.dataset.tab;
    document.querySelectorAll("#pointsTab .tabs .tab").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    pointSubTabs.forEach((id) => {
      document.getElementById(id)?.classList.toggle("hidden", id !== tabId);
    });
    if (tabId === "pointsRewardSubTab") loadRewards();
    if (tabId === "pointsUserSubTab") loadPointsUsers();
    if (tabId === "pointsHistorySubTab") loadPointsHistory();
  });
});

function setRewardMessage(msg, isSuccess = false) {
  if (!rewardMessage) return;
  rewardMessage.textContent = msg;
  rewardMessage.className = 'message ' + (isSuccess ? 'success' : '');
}

async function loadRewards() {
  if (!rewardsTbody) return;
  try {
    const data = await apiFetch('/admin/points/rewards');
    if (!data || !data.length) {
      rewardsTbody.innerHTML = '<tr><td colspan="5" style="padding: 10px; text-align: center;">Belum ada hadiah.</td></tr>';
      return;
    }
    rewardsTbody.innerHTML = data.map(r => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${r.name}<br/><span style="font-size:0.8rem;color:#6b7280;">${r.description || '-'}</span></td>
        <td style="padding: 10px; font-weight: bold; color: var(--primary);">${r.points_required}</td>
        <td style="padding: 10px;">${r.reward_type === 'discount_percent' ? 'Diskon ' + r.reward_value + '%' : (r.reward_type === 'discount_fixed' ? 'Potongan Rp' + r.reward_value : 'Lainnya')}</td>
        <td style="padding: 10px;">${r.is_active ? '<span style="color:green;">Aktif</span>' : '<span style="color:red;">Nonaktif</span>'}</td>
        <td style="padding: 10px;">
          <button class="btn-secondary" data-action="edit-reward" data-reward='${encodeURIComponent(JSON.stringify(r))}'>Edit</button>
          <button class="btn-danger" data-action="delete-reward" data-id="${r.id}">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    rewardsTbody.innerHTML = '<tr><td colspan="5" style="padding: 10px; text-align: center; color: red;">Gagal memuat hadiah.</td></tr>';
  }
}

if (rewardForm) {
  rewardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: rewardNameInput.value.trim(),
      points_required: Number(rewardPointsInput.value),
      reward_type: rewardTypeInput.value,
      reward_value: Number(rewardValueInput.value || 0),
      is_active: rewardActiveInput.checked ? 1 : 0,
      description: rewardDescInput.value.trim()
    };
    try {
      if (editingRewardId) {
        await apiFetch(`/admin/points/rewards/${editingRewardId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setRewardMessage('Hadiah berhasil diupdate.', true);
      } else {
        await apiFetch('/admin/points/rewards', { method: 'POST', body: JSON.stringify(payload) });
        setRewardMessage('Hadiah berhasil ditambahkan.', true);
      }
      rewardForm.reset();
      editingRewardId = null;
      rewardSubmitBtn.textContent = 'Simpan Hadiah';
      rewardCancelBtn.classList.add('hidden');
      loadRewards();
    } catch (error) {
      setRewardMessage(error.message);
    }
  });
  rewardCancelBtn.addEventListener('click', () => {
    rewardForm.reset();
    editingRewardId = null;
    rewardSubmitBtn.textContent = 'Simpan Hadiah';
    rewardCancelBtn.classList.add('hidden');
    setRewardMessage('');
  });
}

if (document.getElementById('rewardsTable')) {
  document.getElementById('rewardsTable').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'edit-reward') {
      const r = JSON.parse(decodeURIComponent(btn.dataset.reward));
      editingRewardId = r.id;
      rewardNameInput.value = r.name;
      rewardPointsInput.value = r.points_required;
      rewardTypeInput.value = r.reward_type;
      rewardValueInput.value = r.reward_value;
      rewardActiveInput.checked = !!r.is_active;
      rewardDescInput.value = r.description;
      rewardSubmitBtn.textContent = 'Update Hadiah';
      rewardCancelBtn.classList.remove('hidden');
      window.scrollTo(0, rewardForm.offsetTop - 50);
    } else if (action === 'delete-reward') {
      if (!confirm('Hapus hadiah ini?')) return;
      try {
        await apiFetch(`/admin/points/rewards/${btn.dataset.id}`, { method: 'DELETE' });
        loadRewards();
      } catch (err) {
        alert(err.message);
      }
    }
  });
}

async function loadPointsUsers() {
  if (!userPointsTbody) return;
  try {
    const data = await apiFetch('/admin/points/users');
    if (!data || !data.length) {
      userPointsTbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center;">Belum ada data.</td></tr>';
      return;
    }
    userPointsTbody.innerHTML = data.map(u => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">#${u.id}</td>
        <td style="padding: 10px;">${u.name}</td>
        <td style="padding: 10px;">${u.email}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; color: var(--primary);">${u.total_points}</td>
      </tr>
    `).join('');
    
    pointsUserOptions = data;
    if (userLookupModal && !userLookupModal.classList.contains("hidden")) applyUserLookup();
  } catch (e) {
    userPointsTbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center; color: red;">Gagal memuat.</td></tr>';
  }
}

if (adjustPointsForm) {
  adjustPointsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!adjustPointsMessage) return;
    if (!adjustPointsUserId?.value) {
      adjustPointsMessage.textContent = "Pilih user dari hasil pencarian.";
      adjustPointsMessage.className = "message";
      renderUserLookup(adjustPointsUserSearch?.value || "");
      return;
    }
    try {
      await apiFetch('/admin/points/adjust', {
        method: 'POST',
        body: JSON.stringify({
          user_id: Number(adjustPointsUserId?.value),
          amount: Number(adjustPointsAmount.value),
          description: adjustPointsDesc.value.trim()
        })
      });
      adjustPointsMessage.textContent = 'Poin berhasil disesuaikan.';
      adjustPointsMessage.className = 'message success';
      adjustPointsForm.reset();
      loadPointsUsers();
      loadPointsHistory();
    } catch (err) {
      adjustPointsMessage.textContent = err.message;
      adjustPointsMessage.className = 'message';
    }
  });
}

async function loadPointsHistory() {
  if (!pointsHistoryTbody) return;
  try {
    const data = await apiFetch('/admin/points/history');
    if (!data || !data.length) {
      pointsHistoryTbody.innerHTML = '<tr><td colspan="5" style="padding: 10px; text-align: center;">Belum ada riwayat.</td></tr>';
      return;
    }
    pointsHistoryTbody.innerHTML = data.map(h => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${new Date(h.created_at).toLocaleString('id-ID')}</td>
        <td style="padding: 10px;">${h.user_name} <br/><span style="font-size:0.8rem;color:#6b7280;">${h.user_email}</span></td>
        <td style="padding: 10px;">${h.type === 'earn' ? '<span style="color:green;">Earn</span>' : '<span style="color:red;">Redeem</span>'}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; ${h.type === 'earn' ? 'color:green' : 'color:red'}">${h.type === 'earn' ? '+' : '-'}${h.points}</td>
        <td style="padding: 10px;">${h.description || '-'}</td>
      </tr>
    `).join('');
  } catch (e) {
    pointsHistoryTbody.innerHTML = '<tr><td colspan="5" style="padding: 10px; text-align: center; color: red;">Gagal memuat.</td></tr>';
  }
}

document.querySelector('.admin-sidebar .tab[data-tab="pointsTab"]')?.addEventListener("click", () => {
  loadRewards();
  loadPointsUsers();
  loadPointsHistory();
});
