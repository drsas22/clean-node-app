const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

// DEBUG LOG for ask route
router.post(
  "/ask",
  (req, res, next) => {
    console.log("AI ROUTE HIT");
    next();
  },
  aiController.askAI
);

// DEBUG LOG for report route
router.get(
  "/report/:userId",
  (req, res, next) => {
    console.log("AI REPORT ROUTE HIT");
    next();
  },
  aiController.getReportCard
);

module.exports = router;