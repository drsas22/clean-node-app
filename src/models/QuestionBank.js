const mongoose = require("mongoose");

const QuestionBankSchema = new mongoose.Schema({
  board: { type: String, required: true },
  stateBoard: { type: String, default: "" },

  grade: { type: String, required: true },
  subject: { type: String, required: true },

  chapterCode: { type: String, required: true },
  topicCode: { type: String, required: true },

  questionText: { type: String, required: true },

  questionKey: { type: String },   // optional unique key

  answer: { type: String, required: true },

  marks: { type: Number },         // 2, 5, etc.

  questionType: {
    type: String,
    enum: ["definition", "short", "long", "numerical", "conceptual"],
    default: "short"
  }

}, { timestamps: true });

module.exports = mongoose.model("QuestionBank", QuestionBankSchema);