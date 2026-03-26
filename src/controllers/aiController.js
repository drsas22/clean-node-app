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

    // ✅ Fetch syllabus context and find best topic match
    let syllabusContext = "";
    let matchedTopicName = "";
    let matchedChapterName = "";

    try {
      const syllabusTopics = await SyllabusNode.find({
        board: finalBoard,
        grade: finalGrade,
        subject: finalSubject,
        active: true
      });

      if (syllabusTopics.length > 0) {
        const lowerQuestion = question.toLowerCase();

        const scoredTopics = syllabusTopics.map((item) => {
          let score = 0;

          if (item.topicName && lowerQuestion.includes(item.topicName.toLowerCase())) {
            score += 5;
          }

          if (item.chapterName && lowerQuestion.includes(item.chapterName.toLowerCase())) {
            score += 3;
          }

          if (Array.isArray(item.keywords)) {
            item.keywords.forEach((keyword) => {
              if (lowerQuestion.includes(String(keyword).toLowerCase())) {
                score += 2;
              }
            });
          }

          if (Array.isArray(item.aliases)) {
            item.aliases.forEach((alias) => {
              if (lowerQuestion.includes(String(alias).toLowerCase())) {
                score += 2;
              }
            });
          }

          return { item, score };
        });

        scoredTopics.sort((a, b) => b.score - a.score);

        const bestMatch = scoredTopics[0];

        if (bestMatch && bestMatch.score > 0) {
          matchedTopicName = bestMatch.item.topicName;
          matchedChapterName = bestMatch.item.chapterName;

          syllabusContext = `
Matched Chapter: ${bestMatch.item.chapterName}
Matched Topic: ${bestMatch.item.topicName}
Keywords: ${(bestMatch.item.keywords || []).join(", ")}
Aliases: ${(bestMatch.item.aliases || []).join(", ")}
          `;
        } else {
          syllabusContext = syllabusTopics
            .slice(0, 10)
            .map(
              (item) =>
                `Chapter ${item.chapterNumber || ""}: ${item.chapterName} | Topic: ${item.topicName}`
            )
            .join("\n");
        }
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

MATCHING RESULT:
- Matched Chapter: ${matchedChapterName || "Not confidently matched"}
- Matched Topic: ${matchedTopicName || "Not confidently matched"}

SYLLABUS CONTEXT:
${syllabusContext || "No exact syllabus context found. Stay appropriate for the student's grade, board, and subject."}

CRITICAL RULES:
1. Speak ONLY in ${finalLanguage}. Use natural, grammatically correct language.
2. Teach strictly at the student's level. Do not go beyond syllabus depth.
3. Stay aligned with the selected board, grade, and subject.
4. If a matched topic is provided, prioritize that topic strongly.
5. If no strong topic match is found, answer safely within standard syllabus knowledge.

6. Start with a direct answer in 1–2 simple lines.

7. Then explain clearly like a teacher using simple language suitable for Grade ${finalGrade}.

8. Then give ONE real-life example (if relevant).

9. Then give 3–5 key points using simple bullet format like:
* point 1  
* point 2  
* point 3  

10. If mode is "study", end with ONE short question to check understanding.

11. If mode is "exam", give answer in crisp point-wise format with important keywords.

12. If mode is "homework", solve step-by-step without skipping reasoning.

13. Format your answer cleanly using normal spacing.
DO NOT use raw symbols like "\\n", "\\n1", or code-style formatting.

14. Make the output clean, readable, and perfect for mobile UI and voice (TTS).

15. Do NOT use headings like "Explanation:", "Example:", etc.
Write everything naturally like a teacher speaking.

16. Avoid unnecessary long introductions or robotic tone.

17. Keep it concise but complete.

18. ${modeInstruction}

Your response must feel like a real teacher explaining clearly, not like an AI.
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
      matchedChapter: matchedChapterName,
      matchedTopic: matchedTopicName,
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