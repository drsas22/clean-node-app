const mongoose = require("mongoose");

const weakTopicSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  subject: { type: String, required: true },
  count: { type: Number, default: 1 }
});

const recentQuestionSchema = new mongoose.Schema({
  question: String,
  subject: String,
  grade: String,
  topic: String,
  timestamp: { type: Date, default: Date.now }
});

const studentMemorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    recentQuestions: [recentQuestionSchema],
    weakTopics: [weakTopicSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentMemory", studentMemorySchema);