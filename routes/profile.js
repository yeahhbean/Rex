const express = require("express");
const router = express.Router();
const { verifyToken } = require("./auth");
const profileController = require("../controllers/profileController");

// GET: 프로필 페이지 조회
router.get("/", verifyToken, profileController.viewProfile);

// POST: 프로필 수정 (파일 업로드 포함)
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("PNG 또는 JPG만 업로드 가능합니다."));
  },
});

router.post(
  "/update",
  verifyToken,
  upload.single("profile_image"),
  profileController.updateProfile
);

module.exports = router;
