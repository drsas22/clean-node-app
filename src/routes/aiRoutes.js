const express = require("express");
const router = express.Router();

const { askAI, getReportCard } = require("../controllers/aiController");

router.post(
  "/ask",
  (req, res, next) => {
    console.log("AI ROUTE HIT");
    next();
  },
  askAI
);

router.get(
  "/report/:userId",
  (req, res, next) => {
    console.log("AI REPORT ROUTE HIT");
    next();
  },
  getReportCard
);

module.exports = router;