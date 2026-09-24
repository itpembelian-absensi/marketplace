const resetForm = document.getElementById("resetForm");
const message = document.getElementById("message");
const hint = document.getElementById("resetHint");
const token = new URLSearchParams(window.location.search).get("token") || "";

function showError(text) {
  message.classList.remove("success");
  message.textContent = text;
}

async function checkToken() {
  if (!token) {
    hint.textContent = "Tautan reset tidak lengkap. Minta tautan baru dari halaman lupa password.";
    return;
  }
  try {
    const result = await apiFetch(`/auth/reset-password?token=${encodeURIComponent(token)}`);
    hint.textContent = result.email
      ? `Buat password baru untuk ${result.email}.`
      : "Buat password baru untuk akun Anda.";
    resetForm.classList.remove("hidden");
  } catch (error) {
    hint.textContent = error.message;
  }
}

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.classList.remove("success");
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (password !== confirmPassword) {
    showError("Password dan ulangan password tidak sama.");
    return;
  }
  message.textContent = "Menyimpan password...";
  try {
    const result = await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    message.classList.add("success");
    message.textContent = result.message || "Password berhasil diubah.";
    resetForm.classList.add("hidden");
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);
  } catch (error) {
    showError(error.message);
  }
});

checkToken();
