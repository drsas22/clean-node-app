const mongoose = require("mongoose");

const ConceptBankSchema = new mongoose.Schema({
  board: { type: String, required: true },
  stateBoard: { type: String, default: "" },

  grade: { type: String, required: true },
  subject: { type: String, required: true },

  chapterCode: { type: String, required: true },
  topicCode: { type: String, required: true },

  conceptType: {
    type: String,
    enum: [
      "definition",
      "explanation",
      "formula",
      "worked_example",
      "exam_note",
      "common_mistake",
      "summary"
    ],
    required: true
  },

  title: { type: String, required: true },

  content: { type: String, required: true },

  tags: [{ type: String }]

}, { timestamps: true });

module.exports = mongoose.model("ConceptBank", ConceptBankSchema);