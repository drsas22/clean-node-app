const StudentMemory = require("../models/StudentMemory");

async function getStudentReport(userId) {
  try {
    const memory = await StudentMemory.findOne({ userId }).lean();

    if (!memory) {
      return {
        userId,
        totalQuestions: 0,
        recentQuestions: [],
        weakTopics: [],
        strongestFocus: null,
        summary: "No learning data available yet."
      };
    }

    const recentQuestions = Array.isArray(memory.recentQuestions)
      ? [...memory.recentQuestions].slice(-10).reverse()
      : [];

    const weakTopics = Array.isArray(memory.weakTopics)
      ? [...memory.weakTopics].sort((a, b) => (b.count || 0) - (a.count || 0))
      : [];

    const totalQuestions = Array.isArray(memory.recentQuestions)
      ? memory.recentQuestions.length
      : 0;

    const strongestFocus = weakTopics.length > 0 ? weakTopics[0] : null;

    let summary = "Student is exploring multiple topics.";
    if (strongestFocus) {
      if ((strongestFocus.count || 0) >= 5) {
        summary = `Student needs strong revision in ${strongestFocus.topic} (${strongestFocus.subject}).`;
      } else if ((strongestFocus.count || 0) >= 3) {
        summary = `Student appears weak in ${strongestFocus.topic} (${strongestFocus.subject}).`;
      } else {
        summary = `Student has started building activity in ${strongestFocus.topic} (${strongestFocus.subject}).`;
      }
    }

    return {
      userId,
      totalQuestions,
      recentQuestions,
      weakTopics,
      strongestFocus,
      summary
    };
  } catch (err) {
    console.error("Report fetch error:", err.message);
    throw err;
  }
}

module.exports = {
  getStudentReport
};