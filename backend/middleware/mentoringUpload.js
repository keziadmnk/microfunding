const fs = require("fs");
const path = require("path");

const multer = require("multer");

const taskUploadRoot = path.join(__dirname, "..", "uploads", "mentoring", "task-submissions");
const materialUploadRoot = path.join(__dirname, "..", "uploads", "mentoring", "materials");

function makeStorage(uploadRoot, prefix) {
  return multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadRoot, { recursive: true });
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(-120);
    cb(null, `${prefix}-${req.params.taskId || req.params.workspaceId}-${Date.now()}-${safeName}`);
  },
  });
}

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

const mentoringTaskUpload = multer({
  storage: makeStorage(taskUploadRoot, "task"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Format file tidak didukung untuk pengumpulan task."));
  },
});

const mentoringMaterialUpload = multer({
  storage: makeStorage(materialUploadRoot, "material"),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Format file materi tidak didukung."));
  },
});

module.exports = { mentoringMaterialUpload, mentoringTaskUpload };
