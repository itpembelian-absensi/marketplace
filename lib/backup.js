const fs = require("fs");
const os = require("os");
const path = require("path");
const unzipper = require("unzipper");

const MEDIA_FOLDERS = [
  "public/product",
  "public/picture",
  "public/banner",
  "public/profile_pictures",
  "public/qris",
];

function absFromRel(rootDir, rel) {
  return path.join(rootDir, ...String(rel).split("/"));
}

function sqliteLiteralPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "''");
}

function incomingDbPath(rootDir) {
  return path.join(rootDir, "data", "marketplace.db.incoming");
}

function applyIncomingDatabase(rootDir, liveDbPath) {
  const incoming = incomingDbPath(rootDir);
  if (!fs.existsSync(incoming)) return false;
  fs.mkdirSync(path.dirname(liveDbPath), { recursive: true });
  if (fs.existsSync(liveDbPath)) {
    fs.copyFileSync(liveDbPath, path.join(rootDir, "data", "marketplace.pre-restore.db"));
  }
  for (const suffix of ["-wal", "-shm"]) {
    const extra = `${liveDbPath}${suffix}`;
    if (fs.existsSync(extra)) fs.unlinkSync(extra);
  }
  fs.copyFileSync(incoming, liveDbPath);
  fs.unlinkSync(incoming);
  return true;
}

async function snapshotDatabase(runQuery, destPath, liveDbPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
  try {
    await runQuery(`VACUUM INTO '${sqliteLiteralPath(destPath)}'`);
    if (fs.existsSync(destPath)) return;
  } catch {
    /* fallback below */
  }
  if (!liveDbPath || !fs.existsSync(liveDbPath)) {
    throw new Error("Gagal membuat snapshot database.");
  }
  try {
    await runQuery("PRAGMA wal_checkpoint(TRUNCATE)");
  } catch {
    /* ignore */
  }
  fs.copyFileSync(liveDbPath, destPath);
}

async function streamBackup({ res, runQuery, rootDir, dbPath }) {
  const { ZipArchive } = await import("archiver");
  const tmpDb = path.join(os.tmpdir(), `sjs-db-${Date.now()}.db`);
  await snapshotDatabase(runQuery, tmpDb, dbPath);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const archive = new ZipArchive({ zlib: { level: 4 } });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="sjs-backup-${stamp}.zip"`);
  const cleanup = () => {
    try {
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      /* ignore */
    }
  };
  archive.on("error", (error) => {
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || "Gagal membuat backup." });
    } else {
      res.end();
    }
  });
  archive.pipe(res);

  archive.append(
    JSON.stringify(
      {
        app: "web-sjs",
        kind: "full-backup",
        version: 1,
        createdAt: new Date().toISOString(),
        includes: ["database", "products", "photos"],
      },
      null,
      2
    ),
    { name: "manifest.json" }
  );
  archive.file(tmpDb, { name: "data/marketplace.db" });

  for (const folder of MEDIA_FOLDERS) {
    const abs = absFromRel(rootDir, folder);
    if (fs.existsSync(abs)) {
      archive.directory(abs, folder);
    }
  }
  const logo = path.join(rootDir, "public", "logo-sjs.png");
  if (fs.existsSync(logo)) {
    archive.file(logo, { name: "public/logo-sjs.png" });
  }
  try {
    await archive.finalize();
    await new Promise((resolve) => {
      if (res.writableEnded) {
        resolve();
        return;
      }
      res.once("finish", resolve);
      res.once("close", resolve);
    });
  } finally {
    cleanup();
  }
}

function findRestoredDatabase(extractDir) {
  const queue = [{ dir: extractDir, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    const nested = path.join(dir, "data", "marketplace.db");
    if (fs.existsSync(nested)) return { dbFile: nested, root: dir };
    const direct = path.join(dir, "marketplace.db");
    if (fs.existsSync(direct)) return { dbFile: direct, root: dir };
    if (depth >= 3) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    }
  }
  return null;
}

function replaceDirectory(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

function emptyDirectory(dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
}

async function restoreFromZip({ zipPath, rootDir }) {
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjs-restore-"));
  try {
    const directory = await unzipper.Open.file(zipPath);
    await directory.extract({ path: extractDir });
    const found = findRestoredDatabase(extractDir);
    if (!found) {
      throw new Error("File ZIP tidak berisi database (data/marketplace.db).");
    }
    const incoming = incomingDbPath(rootDir);
    fs.mkdirSync(path.dirname(incoming), { recursive: true });
    fs.copyFileSync(found.dbFile, incoming);

    let restoredFolders = 0;
    for (const folder of MEDIA_FOLDERS) {
      const dest = absFromRel(rootDir, folder);
      const src = absFromRel(found.root, folder);
      if (fs.existsSync(src)) {
        replaceDirectory(src, dest);
      } else {
        emptyDirectory(dest);
      }
      restoredFolders += 1;
    }
    const logoSrc = path.join(found.root, "public", "logo-sjs.png");
    const logoDest = path.join(rootDir, "public", "logo-sjs.png");
    if (fs.existsSync(logoSrc)) {
      fs.copyFileSync(logoSrc, logoDest);
    }
    return {
      ok: true,
      overwritten: true,
      needsRestart: true,
      restoredFolders,
      message:
        "Restore menimpa database, produk, dan semua foto dengan isi ZIP. Restart server agar database baru aktif.",
    };
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
    try {
      if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  applyIncomingDatabase,
  streamBackup,
  restoreFromZip,
  incomingDbPath,
};
