const mongoose = require("mongoose");

const studentMemorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },

    recentQuestions: [
      {
        question: String,
        subject: String,
        grade: String,
        topic: String,
        timestamp: { type: Date, default: Date.now }
      }
    ],

    weakTopics: [
      {
        topic: String,
        subject: String,
        count: { type: Number, default: 1 }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentMemory", studentMemorySchema);