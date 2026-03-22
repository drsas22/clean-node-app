const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
{
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  messages: [
    {
      role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
      },

      content: {
        type: String,
        required: true
      }
    }
  ]

},
{ timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);