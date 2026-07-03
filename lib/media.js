const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PICTURE_ROOT = path.join(__dirname, "..", "public", "picture");

const FOLDERS = {
  slides: "slides",
  features: "features",
  about: "about",
  logo: "logo",
  products: "products",
};

const PRESETS = {
  slides: { maxWidth: 1920, maxHeight: 900, quality: 82 },
  features: { maxWidth: 720, maxHeight: 720, quality: 80 },
  about: { maxWidth: 1000, maxHeight: 1000, quality: 80 },
  logo: { maxWidth: 400, maxHeight: 400, quality: 85 },
  products: { maxWidth: 1200, maxHeight: 1200, quality: 80 },
};

function ensurePictureDirs() {
  Object.values(FOLDERS).forEach((folder) => {
    fs.mkdirSync(path.join(PICTURE_ROOT, folder), { recursive: true });
  });
}

function isValidFolder(folder) {
  return Object.prototype.hasOwnProperty.call(FOLDERS, folder);
}

function randomName(prefix, ext) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

function isVideo(mimetype) {
  return String(mimetype || "").startsWith("video/");
}

function isImage(mimetype) {
  return String(mimetype || "").startsWith("image/");
}

function videoExtension(mimetype, originalName) {
  const fromName = path.extname(originalName || "").toLowerCase();
  if ([".mp4", ".webm", ".ogg"].includes(fromName)) return fromName;
  if (mimetype === "video/webm") return ".webm";
  if (mimetype === "video/ogg") return ".ogg";
  return ".mp4";
}

async function compressAndSaveImage(buffer, folder, prefix) {
  const preset = PRESETS[folder] || PRESETS.features;
  const subfolder = FOLDERS[folder];
  const dir = path.join(PICTURE_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });

  const filename = randomName(prefix, ".webp");
  const outPath = path.join(dir, filename);

  await sharp(buffer)
    .rotate()
    .resize(preset.maxWidth, preset.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: preset.quality, effort: 4 })
    .toFile(outPath);

  return `/picture/${subfolder}/${filename}`;
}

async function saveVideo(buffer, folder, originalName, mimetype) {
  if (folder !== "slides") {
    throw new Error("Video hanya dapat diupload untuk slideshow.");
  }
  const subfolder = FOLDERS.slides;
  const dir = path.join(PICTURE_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });

  const ext = videoExtension(mimetype, originalName);
  const filename = randomName("slide", ext);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/picture/${subfolder}/${filename}`;
}

async function processUpload(file, folder) {
  const key = String(folder || "").trim();
  if (!isValidFolder(key)) {
    throw new Error("Folder upload tidak valid.");
  }
  if (!file?.buffer?.length) {
    throw new Error("File upload kosong.");
  }

  const prefix = key.slice(0, 4);

  if (isVideo(file.mimetype)) {
    return saveVideo(file.buffer, key, file.originalname, file.mimetype);
  }

  if (!isImage(file.mimetype)) {
    throw new Error("File harus berupa gambar atau video slideshow.");
  }

  return compressAndSaveImage(file.buffer, key, prefix);
}

module.exports = {
  FOLDERS,
  PICTURE_ROOT,
  ensurePictureDirs,
  isValidFolder,
  processUpload,
  compressAndSaveImage,
};
