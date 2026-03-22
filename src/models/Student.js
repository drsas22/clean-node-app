const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  _id: { type: String }, // Use string ID instead of ObjectId
  name: String,
  grade: String,
  mood: String,
  recentQuestions: [String],
  lastTopic: String
}, { _id: false }); // disables automatic ObjectId generation

module.exports = mongoose.model('Student', studentSchema);