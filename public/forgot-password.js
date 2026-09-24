const forgotForm = document.getElementById("forgotForm");
const message = document.getElementById("message");

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.classList.remove("success");
  message.textContent = "Mengirim tautan reset...";

  const email = document.getElementById("email").value.trim();
  try {
    const result = await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    message.classList.add("success");
    message.textContent = result.message || "Tautan reset sudah dikirim.";
  } catch (error) {
    message.classList.remove("success");
    message.textContent = error.message;
  }
});
