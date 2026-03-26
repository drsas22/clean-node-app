const express = require("express");
const router = express.Router();
const SyllabusNode = require("../models/SyllabusNode");

// Add one
router.post("/add", async (req, res) => {
  try {
    const node = new SyllabusNode(req.body);
    await node.save();

    res.json({
      success: true,
      message: "Syllabus added",
      data: node
    });
  } catch (error) {
    console.error("Add syllabus error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add many
router.post("/bulk-add", async (req, res) => {
  try {
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body must be a non-empty array"
      });
    }

    const inserted = await SyllabusNode.insertMany(items);

    res.json({
      success: true,
      message: "Bulk syllabus inserted successfully",
      count: inserted.length,
      data: inserted
    });
  } catch (error) {
    console.error("Bulk add syllabus error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all
router.get("/all", async (req, res) => {
  try {
    const nodes = await SyllabusNode.find().sort({
      grade: 1,
      subject: 1,
      chapterNumber: 1,
      topicName: 1
    });

    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    console.error("Get syllabus error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete all (use carefully)
router.delete("/delete-all", async (req, res) => {
  try {
    const result = await SyllabusNode.deleteMany({});

    res.json({
      success: true,
      message: "All syllabus deleted",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Delete syllabus error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;