// --- Points Logic ---

function setRewardMessage(msg, isSuccess = false) {
  if (!rewardMessage) return;
  rewardMessage.textContent = msg;
  rewardMessage.className = 'message ' + (isSuccess ? 'success' : '');
}

async function loadRewards() {
  if (!rewardsTbody) return;
  try {
    const data = await apiFetch('/points/rewards');
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
    
    // populate select options
    if (adjustPointsUserId) {
      adjustPointsUserId.innerHTML = '<option value="">Pilih User</option>' + data.map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join('');
    }
  } catch (e) {
    userPointsTbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center; color: red;">Gagal memuat.</td></tr>';
  }
}

if (adjustPointsForm) {
  adjustPointsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!adjustPointsMessage) return;
    try {
      await apiFetch('/admin/points/adjust', {
        method: 'POST',
        body: JSON.stringify({
          user_id: Number(adjustPointsUserId.value),
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
