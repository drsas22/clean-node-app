const express = require("express");
const router = express.Router();
const { askAI, getReportCard } = require("../controllers/aiController");

// ask route
router.post(
  "/ask",
  (req, res, next) => {
    console.log("AI ROUTE HIT");
    next();
  },
  askAI
);

// report route
router.get(
  "/report/:userId",
  (req, res, next) => {
    console.log("AI REPORT ROUTE HIT");
    next();
  },
  getReportCard
);

module.exports = router;