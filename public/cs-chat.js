(function initCustomerServiceChat() {
  if (document.getElementById("csChatRoot")) return;

  const HIDE_KEY = "sjs_sasa_hidden";
  const CLOSE_NOTICE_MS = 2500;

  const root = document.createElement("div");
  root.id = "csChatRoot";
  root.className = "cs-chat-root";
  root.innerHTML = `
    <button type="button" class="cs-chat-restore hidden" id="csChatRestore" aria-label="Chat Sasa">
      <img class="cs-chat-toggle-avatar" src="/sasa-avatar.svg" alt="" width="40" height="40" />
      <span>Chat Sasa</span>
    </button>
    <button type="button" class="cs-chat-toggle" id="csChatToggle" aria-label="Chat customer service AI">
      <span class="cs-chat-toggle-bubble">Ada yang bisa Sasa bantu?</span>
      <img class="cs-chat-toggle-avatar" src="/sasa-avatar.svg" alt="" width="56" height="56" />
    </button>
    <section class="cs-chat-panel hidden" id="csChatPanel" aria-label="Chat AI customer service">
      <header class="cs-chat-header">
        <div class="cs-chat-header-id">
          <img class="cs-chat-header-avatar" src="/sasa-avatar.svg" alt="" width="36" height="36" />
          <div>
            <strong>Sasa</strong>
            <small>AI CS sementara · data produk &amp; harga toko</small>
          </div>
        </div>
        <div class="cs-chat-header-actions">
          <button type="button" class="cs-chat-hide" id="csChatHide">Sembunyikan</button>
          <button type="button" class="cs-chat-close" id="csChatClose" aria-label="Tutup chat">×</button>
        </div>
      </header>
      <div class="cs-chat-messages" id="csChatMessages"></div>
      <form class="cs-chat-form" id="csChatForm">
        <input type="text" id="csChatInput" maxlength="800" placeholder="Tanya harga, stok, atau fungsi produk..." autocomplete="off" />
        <button type="submit" id="csChatSend">Kirim</button>
      </form>
      <a class="cs-chat-wa hidden" id="csChatWhatsapp" target="_blank" rel="noopener">Lanjut ke WhatsApp CS manusia</a>
    </section>
  `;
  document.body.appendChild(root);

  const panel = document.getElementById("csChatPanel");
  const toggle = document.getElementById("csChatToggle");
  const restore = document.getElementById("csChatRestore");
  const closeBtn = document.getElementById("csChatClose");
  const hideBtn = document.getElementById("csChatHide");
  const form = document.getElementById("csChatForm");
  const input = document.getElementById("csChatInput");
  const messages = document.getElementById("csChatMessages");
  const sendBtn = document.getElementById("csChatSend");
  const waLink = document.getElementById("csChatWhatsapp");
  const history = [];

  let idleMinutes = 5;
  let idleTimer = null;
  let closingTimer = null;
  let isClosing = false;

  function isVisitorHidden() {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setVisitorHidden(hidden) {
    try {
      if (hidden) localStorage.setItem(HIDE_KEY, "1");
      else localStorage.removeItem(HIDE_KEY);
    } catch {
      /* ignore */
    }
  }

  function isPanelOpen() {
    return !panel.classList.contains("hidden") && !root.classList.contains("is-minimized");
  }

  function clearIdleTimers() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (closingTimer) {
      clearTimeout(closingTimer);
      closingTimer = null;
    }
  }

  function resetIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (isClosing || !isPanelOpen() || idleMinutes <= 0) return;
    idleTimer = setTimeout(beginIdleClose, idleMinutes * 60 * 1000);
  }

  function beginIdleClose() {
    if (!isPanelOpen() || isClosing) return;
    isClosing = true;
    appendMessage(
      "system",
      "Percakapan akan ditutup karena tidak ada aktivitas. Silakan buka chat lagi jika masih butuh bantuan."
    );
    sendBtn.disabled = true;
    input.disabled = true;
    closingTimer = setTimeout(() => {
      endConversation();
      closePanel();
    }, CLOSE_NOTICE_MS);
  }

  function cancelIdleClose() {
    if (!isClosing) return;
    isClosing = false;
    if (closingTimer) {
      clearTimeout(closingTimer);
      closingTimer = null;
    }
    sendBtn.disabled = false;
    input.disabled = false;
  }

  function endConversation() {
    clearIdleTimers();
    isClosing = false;
    history.length = 0;
    messages.innerHTML = "";
    sendBtn.disabled = false;
    input.disabled = false;
    input.value = "";
  }

  function applyVisibility() {
    const minimized = isVisitorHidden();
    root.classList.toggle("is-minimized", minimized);
    if (minimized) {
      panel.classList.add("hidden");
      clearIdleTimers();
    }
    const open = !panel.classList.contains("hidden") && !minimized;
    restore.classList.toggle("hidden", !minimized);
    toggle.classList.toggle("hidden", minimized || open);
    toggle.classList.toggle("is-open", open);
  }

  function appendMessage(role, text) {
    const row = document.createElement("div");
    const kind = role === "user" ? "is-user" : role === "system" ? "is-system" : "is-bot";
    row.className = `cs-chat-msg ${kind}`;
    row.textContent = text;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function openPanel() {
    cancelIdleClose();
    setVisitorHidden(false);
    panel.classList.remove("hidden");
    applyVisibility();
    if (!messages.childElementCount) {
      appendMessage(
        "bot",
        "Halo, saya Sasa. Saya AI yang jawab sementara berdasarkan produk, harga, dan fungsi di toko ini. Untuk CS manusia, gunakan WhatsApp di bawah."
      );
    }
    input.focus();
    resetIdleTimer();
  }

  function closePanel() {
    panel.classList.add("hidden");
    applyVisibility();
    clearIdleTimers();
    isClosing = false;
    sendBtn.disabled = false;
    input.disabled = false;
  }

  function hideWidget() {
    closePanel();
    setVisitorHidden(true);
    applyVisibility();
  }

  toggle.addEventListener("click", () => {
    if (panel.classList.contains("hidden")) openPanel();
    else closePanel();
  });
  closeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePanel();
  });
  hideBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    hideWidget();
  });
  restore.addEventListener("click", openPanel);
  input.addEventListener("input", () => {
    if (isClosing) cancelIdleClose();
    resetIdleTimer();
  });

  async function bindSettings() {
    try {
      const settings =
        typeof loadSettings === "function"
          ? await loadSettings()
          : await (await fetch("/api/settings")).then((r) => r.json());
      if (settings?.sasaChatEnabled === false) {
        clearIdleTimers();
        root.remove();
        window.SasaChat = { open() {} };
        return;
      }
      const idle = Number(settings?.sasaChatIdleMinutes);
      idleMinutes = Number.isFinite(idle) ? Math.max(0, Math.min(180, Math.round(idle))) : 5;
      let number = settings?.whatsappBotNumber || settings?.companyProfile?.phone || "";
      number = String(number).replace(/\D/g, "");
      if (number && waLink) {
        waLink.href = `https://wa.me/${number}?text=${encodeURIComponent("Halo, saya ingin dibantu CS manusia.")}`;
        waLink.classList.remove("hidden");
      }
    } catch {
      /* optional */
    }
    applyVisibility();
    if (isPanelOpen()) resetIdleTimer();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isClosing) cancelIdleClose();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    appendMessage("user", text);
    history.push({ role: "user", content: text });
    resetIdleTimer();
    sendBtn.disabled = true;
    try {
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history }),
      });
      const reply = data.reply || "Maaf, Sasa belum bisa menjawab.";
      appendMessage("bot", reply);
      history.push({ role: "model", content: reply });
      resetIdleTimer();
    } catch (error) {
      appendMessage("bot", error.message || "Sasa sedang sibuk. Silakan lanjut ke WhatsApp CS.");
      resetIdleTimer();
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });

  applyVisibility();
  bindSettings();

  window.SasaChat = {
    open: openPanel,
    close: closePanel,
  };
})();
