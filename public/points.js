const userTotalPointsEl = document.getElementById("userTotalPoints");
const rewardsListEl = document.getElementById("rewardsList");
const userPointsHistoryTbody = document.getElementById("userPointsHistoryTbody");
const redeemMessage = document.getElementById("redeemMessage");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPointDate(value) {
  const date = new Date(String(value || "").replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function historyView(entry) {
  const raw = Number(entry.points) || 0;
  const type = String(entry.type || "");
  let amount = raw;
  if (type === "earn") amount = Math.abs(raw);
  else if (type === "redeem") amount = -Math.abs(raw);
  const positive = amount > 0;
  const text = `${amount > 0 ? "+" : ""}${amount}`;
  return {
    label: positive ? "Dapat Poin" : "Tukar Hadiah",
    text,
    className: positive ? "is-plus" : "is-minus",
  };
}

const giftSvg = `
  <svg class="loyalty-gift" viewBox="0 0 64 64" aria-hidden="true">
    <rect x="8" y="28" width="48" height="28" rx="4" fill="#f6ead2" stroke="#e4d0aa" />
    <rect x="6" y="22" width="52" height="10" rx="3" fill="#f3e2c4" stroke="#e4d0aa" />
    <rect x="29" y="22" width="6" height="34" fill="#d4a24a" />
    <path d="M32 23c-8-12-18-8-15-2 2.4 4.6 8 6 15 2z" fill="#e6bc6a" />
    <path d="M32 23c8-12 18-8 15-2-2.4 4.6-8 6-15 2z" fill="#c9963e" />
  </svg>
`;

async function loadUserPoints() {
  try {
    const data = await apiFetch("/points/my");
    const total = Number(data.totalPoints) || 0;
    userTotalPointsEl.textContent = total.toLocaleString("id-ID");
  } catch (error) {
    userTotalPointsEl.textContent = "0";
  }
}

async function loadRewards() {
  try {
    const rewards = await apiFetch("/points/rewards");
    if (!rewards || rewards.length === 0) {
      rewardsListEl.innerHTML = '<p class="loyalty-muted">Belum ada hadiah tersedia.</p>';
      return;
    }

    rewardsListEl.innerHTML = rewards
      .map(
        (reward) => `
      <article class="loyalty-reward">
        ${giftSvg}
        <div class="loyalty-reward-copy">
          <strong>${escapeHtml(reward.name ? reward.name.charAt(0).toUpperCase() + reward.name.slice(1) : "")}</strong>
          <p>${escapeHtml(reward.description || "Hadiah spesial untuk anda!")}</p>
          <b>${Number(reward.points_required) || 0} Poin</b>
        </div>
        <button
          type="button"
          class="loyalty-redeem"
          data-id="${Number(reward.id)}"
          data-name="${escapeHtml(reward.name)}"
          data-points="${Number(reward.points_required) || 0}"
        >Tukar</button>
      </article>`
      )
      .join("");
  } catch (error) {
    rewardsListEl.innerHTML = '<p class="loyalty-muted">Gagal memuat hadiah.</p>';
  }
}

async function loadPointsHistory() {
  try {
    const history = await apiFetch("/points/my/history");
    if (!history || history.length === 0) {
      userPointsHistoryTbody.innerHTML =
        '<tr><td colspan="4" class="loyalty-history-empty">Belum ada riwayat poin.</td></tr>';
      return;
    }

    userPointsHistoryTbody.innerHTML = history
      .map((entry) => {
        const view = historyView(entry);
        return `
        <tr>
          <td>${escapeHtml(formatPointDate(entry.created_at))}</td>
          <td class="${view.className}">${view.label}</td>
          <td class="${view.className}">${view.text}</td>
          <td>${escapeHtml(entry.description || "-")}</td>
        </tr>`;
      })
      .join("");
  } catch (error) {
    userPointsHistoryTbody.innerHTML =
      '<tr><td colspan="4" class="loyalty-history-empty">Gagal memuat riwayat.</td></tr>';
  }
}

async function redeemReward(rewardId, rewardName, pointsRequired) {
  const currentPoints = Number(String(userTotalPointsEl.textContent).replace(/\./g, "")) || 0;
  if (currentPoints < pointsRequired) {
    redeemMessage.textContent = `Poin Anda tidak mencukupi. Butuh ${pointsRequired} poin.`;
    redeemMessage.className = "message";
    return;
  }

  if (!confirm(`Tukar ${pointsRequired} poin dengan "${rewardName}"?`)) return;

  redeemMessage.textContent = "Memproses...";
  redeemMessage.className = "message";

  try {
    const result = await apiFetch("/points/redeem", {
      method: "POST",
      body: JSON.stringify({ rewardId }),
    });
    redeemMessage.textContent = result.message;
    redeemMessage.className = "message success";
    loadUserPoints();
    loadPointsHistory();
  } catch (error) {
    redeemMessage.textContent = error.message;
    redeemMessage.className = "message";
  }
}

rewardsListEl.addEventListener("click", (event) => {
  const button = event.target.closest(".loyalty-redeem");
  if (!button) return;
  redeemReward(Number(button.dataset.id), button.dataset.name, Number(button.dataset.points));
});

async function initPointsPage() {
  const auth = getAuth();
  if (!auth) {
    window.location.href = "/login.html?next=/points.html";
    return;
  }

  try {
    await apiFetch("/auth/me");
  } catch (error) {
    const tokenError = /token tidak valid|token tidak ditemukan|kadaluarsa/i.test(error.message || "");
    if (tokenError) {
      clearAuth();
      window.location.href = "/login.html?next=/points.html";
      return;
    }
  }

  loadUserPoints();
  loadRewards();
  loadPointsHistory();
}

initPointsPage();
