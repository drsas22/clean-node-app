const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

// DEBUG LOG
router.post("/ask", (req, res, next) => {
  console.log("AI ROUTE HIT");
  next();
}, aiController.askAI);

module.exports = router;