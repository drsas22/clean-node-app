const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { extractText } = require("../services/ocrService");
const aiService = require("../services/aiService");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get("/test", (req, res) => {
  res.json({ success: true, message: "homework route works" });
});

router.post("/solve-homework", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image uploaded"
      });
    }

    const imagePath = req.file.path;
    console.log("Homework image received:", imagePath);

    const questionText = await extractText(imagePath);
    console.log("Extracted Text:", questionText);

    if (!questionText || questionText.trim().length === 0) {
      return res.status(200).json({
        success: false,
        error: "Could not extract text from image",
        extractedText: "",
        answer: ""
      });
    }

    const prompt = `
You are a helpful homework tutor.
Solve the following homework clearly and step by step.
Keep the answer simple, student-friendly, and easy to understand.

Homework text:
${questionText}
`;

    const answer = await aiService.getAnswer(prompt);

    return res.json({
      success: true,
      extractedText: questionText,
      answer: answer
    });

  } catch (error) {
    console.error("Homework solve error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to solve homework"
    });
  }
});

module.exports = router;