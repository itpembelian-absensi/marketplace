(function initCustomerServiceChat() {
  if (document.getElementById("csChatRoot")) return;

  const HIDE_KEY = "sjs_sasa_hidden";

  const root = document.createElement("div");
  root.id = "csChatRoot";
  root.className = "cs-chat-root";
  root.innerHTML = `
    <button type="button" class="cs-chat-restore hidden" id="csChatRestore">Chat Sasa</button>
    <button type="button" class="cs-chat-toggle" id="csChatToggle" aria-label="Chat customer service AI">
      <span class="cs-chat-toggle-bubble">Ada yang bisa Sasa bantu?</span>
      <span class="cs-chat-toggle-avatar" aria-hidden="true">S</span>
    </button>
    <section class="cs-chat-panel hidden" id="csChatPanel" aria-label="Chat AI customer service">
      <header class="cs-chat-header">
        <div>
          <strong>Sasa</strong>
          <small>AI CS sementara · data produk &amp; harga toko</small>
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

  function applyVisibility() {
    const hidden = isVisitorHidden();
    root.classList.toggle("is-minimized", hidden);
    toggle.classList.toggle("hidden", hidden);
    restore.classList.toggle("hidden", !hidden);
    if (hidden) {
      panel.classList.add("hidden");
      toggle.classList.remove("is-open");
    }
  }

  function appendMessage(role, text) {
    const row = document.createElement("div");
    row.className = `cs-chat-msg ${role === "user" ? "is-user" : "is-bot"}`;
    row.textContent = text;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function openPanel() {
    setVisitorHidden(false);
    applyVisibility();
    panel.classList.remove("hidden");
    toggle.classList.add("is-open");
    if (!messages.childElementCount) {
      appendMessage(
        "bot",
        "Halo, saya Sasa. Saya AI yang jawab sementara berdasarkan produk, harga, dan fungsi di toko ini. Untuk CS manusia, gunakan WhatsApp di bawah."
      );
    }
    input.focus();
  }

  function closePanel() {
    panel.classList.add("hidden");
    toggle.classList.remove("is-open");
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
  closeBtn.addEventListener("click", closePanel);
  hideBtn.addEventListener("click", hideWidget);
  restore.addEventListener("click", openPanel);

  async function bindSettings() {
    try {
      const settings =
        typeof loadSettings === "function"
          ? await loadSettings()
          : await (await fetch("/api/settings")).then((r) => r.json());
      if (settings?.sasaChatEnabled === false) {
        root.remove();
        return;
      }
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
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    appendMessage("user", text);
    history.push({ role: "user", content: text });
    sendBtn.disabled = true;
    try {
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history }),
      });
      const reply = data.reply || "Maaf, Sasa belum bisa menjawab.";
      appendMessage("bot", reply);
      history.push({ role: "model", content: reply });
    } catch (error) {
      appendMessage("bot", error.message || "Sasa sedang sibuk. Silakan lanjut ke WhatsApp CS.");
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });

  applyVisibility();
  bindSettings();
})();
