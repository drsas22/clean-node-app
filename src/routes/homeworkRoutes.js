const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("[MULTER] destination called");
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    console.log("[MULTER] filename called:", file.originalname);
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get("/test", (req, res) => {
  console.log("[HOMEWORK] GET /test hit");
  res.json({ success: true, message: "homework route works" });
});

router.post("/solve-homework", (req, res, next) => {
  console.log("[HOMEWORK] POST /solve-homework hit");
  next();
}, upload.single("image"), async (req, res) => {
  try {
    console.log("[HOMEWORK] inside handler");

    if (!req.file) {
      console.log("[HOMEWORK] no file uploaded");
      return res.status(400).json({
        success: false,
        error: "No image uploaded"
      });
    }

    console.log("[HOMEWORK] file received:", req.file.path);

    return res.json({
      success: true,
      extractedText: "TEST OCR",
      answer: "Backend test answer is working."
    });
  } catch (error) {
    console.error("[HOMEWORK] error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to solve homework"
    });
  }
});

module.exports = router;