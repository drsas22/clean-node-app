const express = require("express");
const router = express.Router();

const { askAI } = require("../controllers/aiController"); // ✅ FIXED

router.post(
  "/ask",
  (req, res, next) => {
    console.log("AI ROUTE HIT");
    next();
  },
  askAI // ✅ direct function, not object
);

module.exports = router;