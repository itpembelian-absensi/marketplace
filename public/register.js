const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

if (getAuth()?.user) {
  window.location.href = "/";
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setAuth(result);
    message.classList.add("success");
    message.textContent = "Registrasi berhasil, mengarahkan ke beranda...";
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  } catch (error) {
    message.classList.remove("success");
    message.textContent = error.message;
  }
});

async function initGoogleAuth() {
  try {
    const res = await apiFetch("/settings/google-client-id");
    if (!res.clientId) return;

    window.handleGoogleCallback = async (response) => {
      message.textContent = "Memproses login Google...";
      try {
        const result = await apiFetch("/auth/google", {
          method: "POST",
          body: JSON.stringify({ credential: response.credential }),
        });
        setAuth(result);
        message.classList.add("success");
        message.textContent = "Login berhasil, mengarahkan ke beranda...";
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      } catch (error) {
        message.classList.remove("success");
        message.textContent = error.message;
      }
    };

    if (window.google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: res.clientId,
        callback: window.handleGoogleCallback
      });
      google.accounts.id.renderButton(
        document.getElementById("googleSignInBtn"),
        { theme: "outline", size: "large", text: "signup_with" }
      );
    } else {
      // If Google script hasn't loaded yet, wait for it
      window.onload = () => {
        google.accounts.id.initialize({
          client_id: res.clientId,
          callback: window.handleGoogleCallback
        });
        google.accounts.id.renderButton(
          document.getElementById("googleSignInBtn"),
          { theme: "outline", size: "large", text: "signup_with" }
        );
      };
    }
  } catch (err) {
    console.error("Gagal memuat konfigurasi Google", err);
  }
}

initGoogleAuth();
