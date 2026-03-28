const Student = require("../models/Student");
const SyllabusNode = require("../models/SyllabusNode");
const aiService = require("../services/aiService");

function cleanAIText(text) {
  if (!text) return "";

  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]*-[ \t]+/gm, "• ")
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "• ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function buildKeywordFallback(question, syllabusTopics) {
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
  return scoredTopics[0] || null;
}

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
        "End with one short follow-up question to check understanding.";
    } else if (finalMode === "exam") {
      modeInstruction =
        "Give the answer in crisp exam-ready point-wise style with important keywords and do not ask a follow-up question.";
    } else if (finalMode === "homework") {
      modeInstruction =
        "Solve step-by-step clearly without skipping reasoning and do not ask unrelated follow-up questions.";
    } else {
      modeInstruction = "Explain clearly in a helpful, conversational way.";
    }

    let syllabusContext = "";
    let matchedTopicName = "";
    let matchedChapterName = "";

    try {
      const questionEmbedding = await aiService.getEmbedding(question);

      const vectorResults = await SyllabusNode.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: questionEmbedding,
            numCandidates: 50,
            limit: 5,
            filter: {
  $and: [
    { board: finalBoard },
    { grade: finalGrade },
    { subject: finalSubject },
    { active: true }
  ]
}
          }
        },
        {
          $project: {
            board: 1,
            grade: 1,
            subject: 1,
            chapterNumber: 1,
            chapterName: 1,
            topicName: 1,
            keywords: 1,
            aliases: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);

      if (vectorResults.length > 0) {
        const bestMatch = vectorResults[0];

        matchedTopicName = bestMatch.topicName || "";
        matchedChapterName = bestMatch.chapterName || "";

        syllabusContext =
          "Matched Chapter: " + (bestMatch.chapterName || "") + "\n" +
          "Matched Topic: " + (bestMatch.topicName || "") + "\n" +
          "Keywords: " + (bestMatch.keywords || []).join(", ") + "\n" +
          "Aliases: " + (bestMatch.aliases || []).join(", ");

        console.log("Best vector match:", {
          chapter: matchedChapterName,
          topic: matchedTopicName,
          score: bestMatch.score
        });
      } else {
        const fallbackTopics = await SyllabusNode.find({
          board: finalBoard,
          grade: finalGrade,
          subject: finalSubject,
          active: true
        })
          .select("chapterNumber chapterName topicName keywords aliases")
          .limit(50)
          .lean();

        const bestFallback = buildKeywordFallback(question, fallbackTopics);

        if (bestFallback && bestFallback.score > 0) {
          matchedTopicName = bestFallback.item.topicName || "";
          matchedChapterName = bestFallback.item.chapterName || "";

          syllabusContext =
            "Matched Chapter: " + (bestFallback.item.chapterName || "") + "\n" +
            "Matched Topic: " + (bestFallback.item.topicName || "") + "\n" +
            "Keywords: " + (bestFallback.item.keywords || []).join(", ") + "\n" +
            "Aliases: " + (bestFallback.item.aliases || []).join(", ");
        } else {
          syllabusContext = fallbackTopics
            .slice(0, 10)
            .map((item) => {
              return (
                "Chapter " +
                (item.chapterNumber || "") +
                ": " +
                item.chapterName +
                " | Topic: " +
                item.topicName
              );
            })
            .join("\n");
        }
      }
    } catch (err) {
      console.log("Syllabus vector search failed:", err.message);

      try {
        const fallbackTopics = await SyllabusNode.find({
          board: finalBoard,
          grade: finalGrade,
          subject: finalSubject,
          active: true
        })
          .select("chapterNumber chapterName topicName keywords aliases")
          .limit(50)
          .lean();

        const bestFallback = buildKeywordFallback(question, fallbackTopics);

        if (bestFallback && bestFallback.score > 0) {
          matchedTopicName = bestFallback.item.topicName || "";
          matchedChapterName = bestFallback.item.chapterName || "";

          syllabusContext =
            "Matched Chapter: " + (bestFallback.item.chapterName || "") + "\n" +
            "Matched Topic: " + (bestFallback.item.topicName || "") + "\n" +
            "Keywords: " + (bestFallback.item.keywords || []).join(", ") + "\n" +
            "Aliases: " + (bestFallback.item.aliases || []).join(", ");
        } else {
          syllabusContext = fallbackTopics
            .slice(0, 10)
            .map((item) => {
              return (
                "Chapter " +
                (item.chapterNumber || "") +
                ": " +
                item.chapterName +
                " | Topic: " +
                item.topicName
              );
            })
            .join("\n");
        }
      } catch (fallbackErr) {
        console.log("Syllabus fallback failed:", fallbackErr.message);
      }
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
1. Speak ONLY in ${finalLanguage}. Use simple, natural, grammatically correct language.
2. Teach strictly at Grade ${finalGrade} level.
3. Stay aligned with ${finalBoard} syllabus.
4. If topic is matched, stay tightly within that topic.

DEPTH CONTROL (VERY IMPORTANT):
- Grade 1–3 → very simple, 2–3 sentences + 1 example
- Grade 4–7 → short explanation + example + 3 key points
- Grade 8–10 → clear explanation + example + key points (moderate depth)
- Grade 11–12 → deeper explanation + reasoning + key points
- Higher → conceptual + detailed explanation

RESPONSE STRUCTURE:
1. Start with a direct answer (1–2 lines)
2. Then explain clearly (depth based on grade)
3. Add example if useful
4. Add key points if needed (especially exam mode)

MODE BEHAVIOR:
- Study → explain + example + ask 1 question
- Exam → concise, point-wise, keywords focused
- Homework → step-by-step solution

OUTPUT RULES:
- Avoid unnecessary repetition
- Avoid very long paragraphs
- Keep answer clean and readable
- Make it good for voice + screen
- Do NOT force short answers when topic needs depth

${modeInstruction}
Your response must feel like a real teacher explaining clearly, not like an AI.
`.trim();

    let messagesArray = [{ role: "system", content: systemPrompt }];

    if (chatHistory && Array.isArray(chatHistory)) {
      messagesArray = messagesArray.concat(chatHistory);
    }

    messagesArray.push({ role: "user", content: question });

    let answer = await aiService.getAnswer(messagesArray);
    answer = cleanAIText(answer);

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