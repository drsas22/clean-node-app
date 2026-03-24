const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// IMPORT OCR HELPER (adjust path if needed)
const { extractText } = require("../services/ocrService");

// Ensure uploads folder exists
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

// IMAGE HOMEWORK SOLVER
router.post(
  "/solve-homework",
  (req, res, next) => {
    console.log("[HOMEWORK] POST /solve-homework hit");
    next();
  },
  upload.single("image"),
  async (req, res) => {
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

      // 1. Run OCR on the saved image
      const extractedText = await extractText(req.file.path);
      console.log("[HOMEWORK] OCR text:", extractedText);

      if (!extractedText || !extractedText.trim()) {
        return res.json({
          success: false,
          extractedText: "",
          answer: "",
          error: "Could not read text from image."
        });
      }

      // 2. For now, just echo the OCR text as the "answer".
      // Later you can send extractedText to your OpenAI askAI logic.
      return res.json({
        success: true,
        extractedText,
        answer: `OCR read this from your image:\n\n${extractedText}`
      });
    } catch (error) {
      console.error("[HOMEWORK] error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to solve homework"
      });
    }
  }
);

module.exports = router;
