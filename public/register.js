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
