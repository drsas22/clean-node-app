const Student = require("../models/Student");
const SyllabusNode = require("../models/SyllabusNode");
const aiService = require("../services/aiService");

const askAI = async (req, res) => {
  try {
    const {
      studentId,
      question,
      grade,
      language,
      mode,
      board,
      subject,
      chatHistory
    } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Question is required"
      });
    }

    let student = null;

    if (studentId) {
      try {
        student = await Student.findById(studentId);
      } catch (err) {
        console.log("Student lookup error:", err.message);
      }
    }

    if (!student) {
      console.log("Student not found, using fallback demo student");
      student = {
        grade: grade || "Grade 5",
        language: language || "English",
        board: board || "CBSE",
        subjectPreference: subject || "General",
        mood: "neutral",
        recentQuestions: [],
        lastTopic: "",
        save: async () => {}
      };
    }

    const finalGrade = grade || student.grade || "Grade 5";
    const finalLanguage = language || student.language || "English";
    const finalMode = mode || "study";
    const finalBoard = board || student.board || "CBSE";
    const finalSubject = subject || student.subjectPreference || "General";

    let modeInstruction = "";

    if (finalMode === "study") {
      modeInstruction =
        "Explain like a teacher in a simple and clear way, use one easy example, and end with one short recap line.";
    } else if (finalMode === "exam") {
      modeInstruction =
        "Give an exam-ready answer in concise point-wise format with important keywords. Do not ask follow-up questions.";
    } else if (finalMode === "homework") {
      modeInstruction =
        "Guide step-by-step. If it is a problem, show the steps clearly. Do not skip reasoning.";
    } else {
      modeInstruction =
        "Explain clearly in a helpful, conversational way.";
    }

    // ✅ Fetch syllabus context
    let syllabusContext = "";
    try {
      const syllabusTopics = await SyllabusNode.find({
        board: finalBoard,
        grade: finalGrade,
        subject: finalSubject,
        active: true
      }).limit(20);

      if (syllabusTopics.length > 0) {
        syllabusContext = syllabusTopics
          .map(
            (item) =>
              `Chapter ${item.chapterNumber || ""}: ${item.chapterName} | Topic: ${item.topicName}`
          )
          .join("\n");
      }
    } catch (err) {
      console.log("Syllabus fetch failed:", err.message);
    }

    const systemPrompt = `
You are a highly skilled, mature, and friendly educational Fairy tutor having a natural 1-on-1 conversation with a student.

STUDENT PROFILE:
- Board: ${finalBoard}
- Grade: ${finalGrade}
- Subject: ${finalSubject}
- Language: ${finalLanguage}
- Mode: ${finalMode}

SYLLABUS CONTEXT:
${syllabusContext || "No exact syllabus context found. Stay appropriate for the student's grade, board, and subject."}

CRITICAL RULES:
1. Speak ONLY in ${finalLanguage}. Use natural, grammatically correct language.
2. Teach at exactly the student's level. Do not go far beyond syllabus depth.
3. Stay aligned with the selected board, grade, and subject.
4. First answer directly, then explain clearly.
5. Keep the answer concise but useful. Usually under 6 sentences unless the mode requires stepwise solving.
6. Do NOT use headers, brackets, or robotic formatting unless exam mode needs pointwise output.
7. If the question seems outside the likely syllabus, still answer helpfully but keep the depth appropriate.
8. ${modeInstruction}
`;

    let messagesArray = [
      { role: "system", content: systemPrompt }
    ];

    if (chatHistory && Array.isArray(chatHistory)) {
      messagesArray = messagesArray.concat(chatHistory);
    }

    messagesArray.push({ role: "user", content: question });

    const answer = await aiService.getAnswer(messagesArray);

    try {
      if (student.recentQuestions) {
        student.recentQuestions.push(question);
      }
      if (student.save) {
        await student.save();
      }
    } catch (err) {
      console.log("History save skipped");
    }

    return res.json({
      success: true,
      answer,
      subject: finalSubject,
      mood: "explainer"
    });

  } catch (error) {
    console.error("AI Controller Error:", error);

    return res.status(500).json({
      success: false,
      error: "AI processing failed"
    });
  }
};

module.exports = {
  askAI
};