const express = require("express");
const router = express.Router();

const controller = require("../controllers/aiController");

console.log("aiController keys:", Object.keys(controller));

router.post("/ask", controller.askAI);

module.exports = router;