const mongoose = require("mongoose");

const SyllabusNodeSchema = new mongoose.Schema({
  board: { type: String, required: true },          // CBSE, ICSE, etc.
  stateBoard: { type: String, default: "" },        // Maharashtra, etc.

  grade: { type: String, required: true },          // Grade 8, Grade 10
  subject: { type: String, required: true },        // Science, Math

  chapterCode: { type: String, required: true },
  chapterNumber: { type: Number },
  chapterName: { type: String, required: true },

  topicCode: { type: String, required: true },
  topicName: { type: String, required: true },

  keywords: [{ type: String }],                     // for matching
  aliases: [{ type: String }],                      // alternative names

  difficultyLevel: {
    type: String,
    enum: ["easy", "middle", "advanced"],
    default: "middle"
  },

  active: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.model("SyllabusNode", SyllabusNodeSchema);