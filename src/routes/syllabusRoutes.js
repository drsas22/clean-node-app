const express = require("express");
const router = express.Router();

const SyllabusNode = require("../models/SyllabusNode");

// 🔥 TEST INSERT API
router.post("/add", async (req, res) => {
  try {
    const data = req.body;

    const node = new SyllabusNode(data);
    await node.save();

    res.json({ success: true, message: "Syllabus added", data: node });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔥 GET ALL
router.get("/all", async (req, res) => {
  try {
    const nodes = await SyllabusNode.find();
    res.json({ success: true, data: nodes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;