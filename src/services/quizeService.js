const aiService = require("./aiService");

function buildQuizPrompt({ topic, subject, grade, count = 5 }) {
  return `
You are creating a small quiz for a student.

Rules:
- Return ONLY valid JSON
- No markdown
- No explanation outside JSON
- Create exactly ${count} MCQs
- Each MCQ must have:
  - question
  - options (array of 4 strings)
  - correctAnswer
  - explanation
- Keep level appropriate for grade ${grade}
- Subject: ${subject}
- Topic: ${topic}
- Keep it school-friendly and clear

Required JSON format:
{
  "topic": "${topic}",
  "subject": "${subject}",
  "grade": "${grade}",
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
`;
}

async function generateQuiz({ topic, subject, grade, count = 5 }) {
  const prompt = buildQuizPrompt({ topic, subject, grade, count });

  const raw = await aiService.getAnswer({
    question: prompt,
    grade,
    subject,
    mode: "exam",
    syllabusContext: `Generate quiz from topic: ${topic}`,
    retrievalStrength: "strong",
    weakContext: "",
    revisionMode: false
  });

  try {
    const cleaned = String(raw || "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("Quiz JSON not found");
    }

    const jsonText = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(jsonText);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid quiz format");
    }

    return parsed;
  } catch (err) {
    console.error("Quiz parse error:", err.message);

    return {
      topic,
      subject,
      grade,
      questions: []
    };
  }
}

module.exports = {
  generateQuiz
};