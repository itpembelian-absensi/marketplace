const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const TEST_PORT = 5099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "marketplace.db");
const DB_BACKUP_PATH = path.join(DATA_DIR, "marketplace.db.test_bak");

let activeProcess = null;
let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(DB_PATH);
  }
  return dbInstance;
}

function queryGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function queryRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function startTestServer() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Backup existing marketplace.db if any
  if (fs.existsSync(DB_PATH)) {
    if (fs.existsSync(DB_BACKUP_PATH)) {
      try { fs.unlinkSync(DB_BACKUP_PATH); } catch (e) {}
    }
    fs.copyFileSync(DB_PATH, DB_BACKUP_PATH);
    fs.unlinkSync(DB_PATH);
  }

  // Also clean wal / shm files if exist
  try { if (fs.existsSync(DB_PATH + "-wal")) fs.unlinkSync(DB_PATH + "-wal"); } catch (e) {}
  try { if (fs.existsSync(DB_PATH + "-shm")) fs.unlinkSync(DB_PATH + "-shm"); } catch (e) {}

  const env = {
    ...process.env,
    PORT: String(TEST_PORT),
    HOST: "127.0.0.1",
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-at-least-32-characters-long-1234567890",
    SEED_ADMIN_EMAIL: "admin@test.com",
    SEED_ADMIN_PASSWORD: "adminpassword123",
    SEED_ADMIN_NAME: "Admin Test",
    FONNTE_API_TOKEN: "valid-fonnte-token-test",
    FONNTE_WEBHOOK_SECRET: "my-secret-webhook-key-test",
  };

  const child = spawn("node", ["server.js"], {
    cwd: PROJECT_ROOT,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  activeProcess = child;

  let ready = false;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!ready) {
        clearInterval(pollInterval);
        child.kill();
        reject(new Error("Timeout waiting for test server to start"));
      }
    }, 15000);

    const pollInterval = setInterval(async () => {
      if (ready) {
        clearInterval(pollInterval);
        return;
      }
      try {
        const res = await fetch(`${BASE_URL}/`);
        if (res.status) {
          ready = true;
          clearInterval(pollInterval);
          clearTimeout(timeout);
          resolve();
        }
      } catch (e) {
        // server not ready yet
      }
    }, 300);

    child.stdout.on("data", (chunk) => {
      const msg = chunk.toString();
      console.log("[SERVER OUT]", msg.trim());
      if (msg.includes("running at") || msg.includes("5099") || msg.includes("Marketplace app")) {
        ready = true;
        clearInterval(pollInterval);
        clearTimeout(timeout);
        resolve();
      }
    });

    child.stderr.on("data", (chunk) => {
      console.error("[SERVER ERR]", chunk.toString());
    });

    child.on("error", (err) => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
      reject(err);
    });

    child.on("exit", (code) => {
      if (!ready) {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        reject(new Error(`Server exited unexpectedly with code ${code}`));
      }
    });
  });

  // Give a small grace period for DB migrations to complete
  await new Promise((r) => setTimeout(r, 600));

  return {
    baseUrl: BASE_URL,
    child,
  };
}

async function stopTestServer() {
  if (dbInstance) {
    await new Promise((r) => dbInstance.close(() => r()));
    dbInstance = null;
  }

  if (activeProcess) {
    try {
      activeProcess.kill("SIGKILL");
    } catch (e) {}
    activeProcess = null;
  }

  // Small delay to ensure file handles are released
  await new Promise((r) => setTimeout(r, 400));

  // Remove test database
  try {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    if (fs.existsSync(DB_PATH + "-wal")) fs.unlinkSync(DB_PATH + "-wal");
    if (fs.existsSync(DB_PATH + "-shm")) fs.unlinkSync(DB_PATH + "-shm");
  } catch (e) {}

  // Restore backup database if it was present
  if (fs.existsSync(DB_BACKUP_PATH)) {
    try {
      fs.copyFileSync(DB_BACKUP_PATH, DB_PATH);
      fs.unlinkSync(DB_BACKUP_PATH);
    } catch (e) {}
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };

  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

async function login(email, password) {
  const res = await api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (res.status !== 200 || !res.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function register(userData) {
  const res = await api("/api/auth/register", {
    method: "POST",
    body: userData,
  });
  return res;
}

module.exports = {
  PROJECT_ROOT,
  BASE_URL,
  startTestServer,
  stopTestServer,
  api,
  login,
  register,
  queryGet,
  queryAll,
  queryRun,
};
