const aiService = require("./aiService");

async function generateCasualReply({ question, language }) {
  const lang = language || "English";

  const casualPrompt = `
You are Fairy, a warm, friendly, emotionally supportive AI companion for school students.
The student is NOT asking a syllabus-based academic question.
Reply naturally like a kind human guide, not like a textbook.
Keep the reply short, warm, conversational, and easy to understand.
Do not force science, school lessons, chapter names, revision, weak topics, or quizzes.
If the student is sharing feelings, respond gently and supportively.
Reply in ${lang}.

Student message: ${question}
`;

  const answer = await aiService.getAnswer({
    question: casualPrompt,
    grade: "",
    subject: "General",
    mode: "study",
    syllabusContext: "No syllabus context. Casual conversation only.",
    retrievalStrength: "none",
    weakContext: "",
    revisionMode: false
  });

  return (answer || "Hey, I am here with you. You can tell me anything.").trim();
}

module.exports = { generateCasualReply };