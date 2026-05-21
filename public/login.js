const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

if (getAuth()?.user) {
  window.location.href = "/";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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
});
