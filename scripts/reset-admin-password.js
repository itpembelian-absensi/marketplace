const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "marketplace.db");
const email = process.env.SEED_ADMIN_EMAIL || "admin@company.com";
const password = process.env.SEED_ADMIN_PASSWORD || "admin12345";

const db = new sqlite3.Database(dbPath);

db.all("SELECT id, name, email, role FROM users WHERE role = 'admin'", async (err, rows) => {
  if (err) {
    console.error("Gagal membaca user admin:", err.message);
    process.exit(1);
  }

  console.log("Admin users:", rows);

  const passwordHash = await bcrypt.hash(password, 10);

  db.run(
    "UPDATE users SET password_hash = ? WHERE role = 'admin'",
    [passwordHash],
    function (updateErr) {
      if (updateErr) {
        console.error("Gagal reset password:", updateErr.message);
        process.exit(1);
      }

      if (this.changes === 0) {
        console.log("Tidak ada user admin, membuat akun admin baru...");
        db.run(
          "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
          [process.env.SEED_ADMIN_NAME || "Admin", email, passwordHash, "admin"],
          function (insertErr) {
            if (insertErr) {
              console.error("Gagal membuat admin:", insertErr.message);
              process.exit(1);
            }
            console.log("Akun admin baru dibuat untuk:", email);
            db.close();
          }
        );
        return;
      }

      console.log(`Password berhasil direset untuk ${this.changes} akun admin.`);
      console.log("Email admin:", rows.map((r) => r.email).join(", "));
      console.log("Password baru:", password);
      db.close();
    }
  );
});
