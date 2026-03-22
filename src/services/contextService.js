exports.buildContext = async (student, question) => {
  // Placeholder: combine last topic and recent questions
  let context = `Previous topic: ${student.lastTopic || "none"}. `;
  context += `Recent questions: ${student.recentQuestions.join(", ") || "none"}. `;
  return context;
};