const Student = require("../models/Student");
const aiService = require("../services/aiService");

const askAI = async (req, res) => {
  try {
    const { studentId, question, grade, language, mode, chatHistory } = req.body;

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
        grade: grade || "5",
        language: language || "English",
        mood: "neutral",
        recentQuestions: [],
        lastTopic: "",
        save: async () => {}
      };
    }

    const finalGrade = grade || student.grade || "5";
    const finalLanguage = language || student.language || "English";
    const finalMode = mode || "study";

    let modeInstruction = "";

    if (finalMode === "study") {
      modeInstruction = "Explain the concept simply, use one easy example, and end by asking the student a follow-up question to test their understanding.";
    } else if (finalMode === "exam") {
      modeInstruction = "Give a concise, direct, point-wise answer. Do not ask follow-up questions.";
    } else if (finalMode === "homework") {
      modeInstruction = "Guide the student step-by-step. Do not just give the final answer. End by asking if they are ready for the next step.";
    } else {
      modeInstruction = "Explain clearly in a helpful, conversational way.";
    }

    // --- PHASE 1: THE NEW CONVERSATIONAL SYSTEM PROMPT ---
    const systemPrompt = `
You are a highly skilled, mature, and friendly educational Fairy tutor. 
You are currently having a natural 1-on-1 conversation with a Grade ${finalGrade} student.

CRITICAL RULES:
1. Speak ONLY in ${finalLanguage}. Do not use English words unless ${finalLanguage} is English. Ensure grammatically perfect, natural syntax.
2. Act like a real human teacher. DO NOT use brackets, headers, or announce the grade level.
3. Your explanation must be tailored exactly to a Grade ${finalGrade} understanding. Do not give complex university-level answers unless the student is a Master's student.
4. Keep your answer concise (under 3 sentences) so the audio does not get too long.
5. ${modeInstruction}
`;

    // --- PHASE 1: BUILDING THE MEMORY ARRAY ---
    // This creates an array of messages exactly how OpenAI expects it.
    let messagesArray = [
      { role: "system", content: systemPrompt }
    ];

    // If the Unity app sends previous messages, we add them to the AI's memory!
    if (chatHistory && Array.isArray(chatHistory)) {
      messagesArray = messagesArray.concat(chatHistory);
    }

    // Finally, we add the brand new question the student just asked
    messagesArray.push({ role: "user", content: question });

    // Send the array to aiService (which we already updated to handle arrays!)
    const answer = await aiService.getAnswer(messagesArray);

    // Save history
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
      answer: answer,
      subject: "general",
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
