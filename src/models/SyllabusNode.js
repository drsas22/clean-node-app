const mongoose = require("mongoose");

const syllabusNodeSchema = new mongoose.Schema({
  board: { type: String, required: true },
  stateBoard: { type: String, default: "" },
  grade: { type: String, required: true },
  subject: { type: String, required: true },

  chapterCode: { type: String, required: true },
  chapterNumber: { type: Number },
  chapterName: { type: String, required: true },

  topicCode: { type: String, required: true },
  topicName: { type: String, required: true },

  keywords: { type: [String], default: [] },
  aliases: { type: [String], default: [] },

  difficultyLevel: {
    type: String,
    default: "middle"
  },

  active: { type: Boolean, default: true },

  // ADD THESE
  searchableText: { type: String, default: "" },
  embedding: { type: [Number], default: [] }

}, { timestamps: true });

module.exports = mongoose.model("SyllabusNode", syllabusNodeSchema);