const Student = require("../models/Student");
const SyllabusNode = require("../models/SyllabusNode");
const StudentMemory = require("../models/StudentMemory");
const aiService = require("../services/aiService");
const { getWeakTopics, shouldTriggerRevision } = require("../services/memoryService");
const { generateQuiz } = require("../services/quizService");
const { getStudentReport } = require("../services/reportService");

function cleanAIText(text) {
  if (!text) return "";

  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\\[(.*?)\\\]/gs, "$1")
    .replace(/\\\((.*?)\\\)/gs, "$1")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1 / $2")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\pi/g, "pi")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\\/g, "")
    .replace(/^[ \t]*-[ \t]+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegex(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeGrade(input) {
  let g = String(input || "").trim().toLowerCase();

  if (!g) return "";

  g = g.replace(/^grade\s*/i, "").replace(/^class\s*/i, "").replace(/\s+/g, "").trim();

  const gradeMap = {
    "1st": "1",
    "2nd": "2",
    "3rd": "3",
    "4th": "4",
    "5th": "5",
    "6th": "6",
    "7th": "7",
    "8th": "8",
    "9th": "9",
    "10th": "10",
    "11th": "11",
    "12th": "12",

    "undergraduate": "undergraduate",
    "undergraduatelevel": "undergraduate",
    "ug": "undergraduate",
    "college": "undergraduate",
    "bachelor": "undergraduate",
    "bachelors": "undergraduate",
    "mbbs": "undergraduate",
    "bds": "undergraduate",
    "bams": "undergraduate",
    "bhms": "undergraduate",
    "bpt": "undergraduate",
    "nursing": "undergraduate",
    "engineering": "undergraduate",

    "postgraduate": "postgraduate",
    "postgraduatelevel": "postgraduate",
    "pg": "postgraduate",
    "master": "postgraduate",
    "masters": "postgraduate",
    "md": "postgraduate",
    "ms": "postgraduate",
    "mds": "postgraduate",
    "resident": "postgraduate",
    "residency": "postgraduate",

    "research": "researcher",
    "researcher": "researcher",
    "researchers": "researcher",
    "phd": "researcher",
    "doctorate": "researcher",
    "doctoral": "researcher",
    "scientist": "researcher"
  };

  return gradeMap[g] || g;
}

function formatStoredGrade(grade) {
  if (!grade) return "";
  if (/^\d+$/.test(String(grade))) return `Grade ${grade}`;
  return String(grade).trim();
}

function normalizeMode(input) {
  const mode = String(input || "").trim().toLowerCase();
  return mode === "exam" ? "exam" : "study";
}

function normalizeSubject(input) {
  return String(input || "").trim();
}

function getChapter(node) {
  return node.chapter || node.chapterName || "";
}

function getTopic(node) {
  return node.topic || node.topicName || "";
}

function extractTopic(question) {
  const q = String(question || "").toLowerCase();

  const knownTopics = [
    "addition", "subtraction", "multiplication", "division", "numbers", "fractions",
    "plants", "body parts", "photosynthesis", "respiration", "digestion", "nutrition",
    "reproduction", "cell", "tissue", "force", "motion", "friction", "light",
    "reflection", "refraction", "electricity", "magnetism", "acid", "base", "salt",
    "atom", "molecule", "heat", "sound", "derivative", "trigonometry", "molarity",
    "newton", "coulomb", "genetics", "cell structure"
  ];

  for (const topic of knownTopics) {
    if (q.includes(topic)) return topic;
  }

  return "";
}

function buildKeywordFallback(question, syllabusTopics) {
  const lowerQuestion = String(question || "").toLowerCase();

  const scoredTopics = syllabusTopics.map((item) => {
    let bonus = 0;

    const topic = String(item.topicName || item.topic || "").toLowerCase();
    const chapter = String(item.chapterName || item.chapter || "").toLowerCase();

    if (topic && lowerQuestion.includes(topic)) bonus += 5;
    if (chapter && lowerQuestion.includes(chapter)) bonus += 3;

    if (Array.isArray(item.keywords)) {
      item.keywords.forEach((keyword) => {
        if (lowerQuestion.includes(String(keyword).toLowerCase())) bonus += 2;
      });
    }

    if (Array.isArray(item.aliases)) {
      item.aliases.forEach((alias) => {
        if (lowerQuestion.includes(String(alias).toLowerCase())) bonus += 2;
      });
    }

    return {
      ...item,
      lexicalBonus: bonus,
      finalScore: (item.score || 0) + bonus / 10
    };
  });

  scoredTopics.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  return scoredTopics;
}

function formatSyllabusContext(nodes = []) {
  if (!nodes.length) return "No syllabus context found.";

  return nodes
    .map((node, index) => {
      return `
[Context ${index + 1}]
Subject: ${node.subject || "Unknown"}
Grade: ${node.grade || "Unknown"}
Chapter: ${getChapter(node) || "Unknown"}
Topic: ${getTopic(node) || "Unknown"}
Content: ${node.content || node.searchableText || ""}
`;
    })
    .join("\n");
}

async function updateMemory(userId, question, subject, grade, topic) {
  try {
    console.log("Memory function called");

    let memory = await StudentMemory.findOne({ userId });

    if (!memory) {
      console.log("No memory found. Creating new memory document for:", userId);

      memory = new StudentMemory({
        userId,
        recentQuestions: [],
        weakTopics: []
      });
    }

    memory.recentQuestions.push({
      question,
      subject,
      grade,
      topic,
      timestamp: new Date()
    });

    if (memory.recentQuestions.length > 30) {
      memory.recentQuestions = memory.recentQuestions.slice(-30);
    }

    const safeTopic = topic || "unknown";

    const existing = memory.weakTopics.find(
      (t) => t.topic === safeTopic && t.subject === subject
    );

    if (existing) {
      existing.count += 1;
    } else {
      memory.weakTopics.push({
        topic: safeTopic,
        subject,
        count: 1
      });
    }

    await memory.save();
    console.log("Memory saved successfully for:", userId);
  } catch (err) {
    console.error("Memory update failed:", err);
  }
}

async function askAI(req, res) {
  try {
    const question = String(req.body.question || "").trim();
    const grade = normalizeGrade(req.body.grade);
    const subject = normalizeSubject(req.body.subject);
    const mode = normalizeMode(req.body.mode);
    const studentId = req.body.studentId || null;
    const userId = studentId || "demo-user";
    const detectedTopic = extractTopic(question);

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Question is required"
      });
    }

    if (question.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Question is too long"
      });
    }

    let student = null;
    if (studentId) {
      try {
        student = await Student.findById(studentId);
      } catch (err) {
        console.log("Student lookup skipped");
      }
    }

    let matches = [];
    let retrievalMethod = "none";

    const lexicalQuery = { active: true };

    if (subject) {
      lexicalQuery.subject = new RegExp(`^${escapeRegex(subject)}$`, "i");
    }

    if (grade) {
      lexicalQuery.grade = new RegExp(`^${escapeRegex(formatStoredGrade(grade))}$`, "i");
    }

    const lexicalOr = [];

    if (detectedTopic) {
      lexicalOr.push(
        { topicName: new RegExp(escapeRegex(detectedTopic), "i") },
        { chapterName: new RegExp(escapeRegex(detectedTopic), "i") },
        { searchableText: new RegExp(escapeRegex(detectedTopic), "i") },
        { content: new RegExp(escapeRegex(detectedTopic), "i") },
        { keywords: { $elemMatch: { $regex: escapeRegex(detectedTopic), $options: "i" } } },
        { aliases: { $elemMatch: { $regex: escapeRegex(detectedTopic), $options: "i" } } }
      );
    }

    const importantWords = String(question)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((w) => !["what", "is", "are", "the", "of", "in", "on", "for", "a", "an", "explain", "define"].includes(w))
      .slice(0, 5);

    importantWords.forEach((word) => {
      if (word.length >= 3) {
        lexicalOr.push(
          { topicName: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
          { chapterName: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
          { searchableText: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
          { content: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
          { keywords: { $elemMatch: { $regex: `\\b${escapeRegex(word)}\\b`, $options: "i" } } },
          { aliases: { $elemMatch: { $regex: `\\b${escapeRegex(word)}\\b`, $options: "i" } } }
        );
      }
    });

    if (lexicalOr.length > 0) {
      const lexicalMatches = await SyllabusNode.find({
        ...lexicalQuery,
        $or: lexicalOr
      }).limit(20).lean();

      if (lexicalMatches.length > 0) {
        matches = buildKeywordFallback(question, lexicalMatches).slice(0, 5);
        retrievalMethod = "lexical";
      }
    }

    if (!matches.length) {
      const enrichedQuery = `${question} ${subject} grade ${grade} ${detectedTopic}`.trim();
      const embedding = await aiService.getEmbedding(enrichedQuery);

      const vectorFilter = { active: true };
      if (subject) vectorFilter.subject = subject;
      if (grade) vectorFilter.grade = formatStoredGrade(grade);

      try {
        const vectorMatches = await SyllabusNode.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: embedding,
              numCandidates: 150,
              limit: 20,
              filter: vectorFilter
            }
          },
          {
            $project: {
              subject: 1,
              grade: 1,
              board: 1,
              chapter: 1,
              chapterName: 1,
              chapterCode: 1,
              topic: 1,
              topicName: 1,
              topicCode: 1,
              content: 1,
              searchableText: 1,
              keywords: 1,
              aliases: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]);

        if (vectorMatches.length > 0) {
          matches = buildKeywordFallback(question, vectorMatches);
          retrievalMethod = "vector";
        }
      } catch (vectorError) {
        console.error("Vector search failed:", vectorError.message);
      }
    }

        let finalMatches = [];
        let retrievalStrength = "none";

    if (matches.length > 0) {
      if (retrievalMethod === "lexical") {
        // Only treat as strong if we have at least 2 lexical hits
        finalMatches = matches.slice(0, 3);
        retrievalStrength = finalMatches.length >= 2 ? "strong" : "weak";
      } else {
        const scored = matches.map((m) => ({
          ...m,
          _score: m.finalScore ?? m.score ?? 0
        }));

        const strongMatches = scored.filter((node) => node._score >= 0.80);
        const mediumMatches = scored.filter((node) => node._score >= 0.65);

        if (strongMatches.length > 0) {
          finalMatches = strongMatches.slice(0, 4);
          retrievalStrength = "strong";
        } else if (mediumMatches.length > 0) {
          finalMatches = mediumMatches.slice(0, 3);
          retrievalStrength = "weak";
        } else {
          // context exists but is too fuzzy – treat as weak and only pass top 1–2
          finalMatches = scored.slice(0, 2);
          retrievalStrength = "weak";
        }
      }
    }


    const syllabusContext = formatSyllabusContext(finalMatches);

    const matchedTopic = finalMatches[0] ? getTopic(finalMatches[0]) || null : null;
    const matchedChapter = finalMatches[0] ? getChapter(finalMatches[0]) || null : null;

    // DEBUG: retrieval transparency
    console.log("[ASKAI] retrievalMethod:", retrievalMethod);
    console.log("[ASKAI] retrievalStrength:", retrievalStrength);
    console.log("[ASKAI] matchedChapter:", matchedChapter);
    console.log("[ASKAI] matchedTopic:", matchedTopic);
    console.log(
      "[ASKAI] usedMatches:",
      finalMatches.map((m) => ({
        chapter: getChapter(m),
        topic: getTopic(m),
        score: m.finalScore || m.score || 0
      }))
    );

    const weakTopics = await getWeakTopics(userId);
    const revisionMode = await shouldTriggerRevision(userId, matchedTopic || "unknown");

    let weakContext = "";
    if (weakTopics.length > 0) {
      weakContext = weakTopics
        .map((t) => `${t.topic} (${t.subject}) count=${t.count}`)
        .join(", ");
    }

    let answer = await aiService.getAnswer({
      question,
      grade,
      subject,
      mode,
      syllabusContext,
      retrievalStrength,
      weakContext,
      revisionMode
    });

    answer = cleanAIText(answer);

    console.log("Updating memory for:", userId);

    await updateMemory(
      userId,
      question,
      subject,
      grade,
      matchedTopic || "unknown"
    );

    let triggeredQuiz = null;
    if (revisionMode && matchedTopic) {
      triggeredQuiz = await generateQuiz({
        topic: matchedTopic,
        subject,
        grade,
        count: 5
      });
    }

    try {
      if (student && student.recentQuestions) {
        student.recentQuestions.push(question);
        await student.save();
      }
    } catch (err) {
      console.log("History save skipped");
    }

    return res.status(200).json({
      success: true,
      answer,
      meta: {
        mode,
        grade: grade || null,
        subject: subject || null,
        detectedTopic: detectedTopic || null,
        retrievalMethod,
        contextUsed: finalMatches.length > 0,
        retrievalStrength,
        revisionMode,
        weakTopics: weakTopics.slice(0, 3),
        totalMatches: matches.length,
        usedMatches: finalMatches.length,
        matchedTopics: finalMatches
          .filter((item) => (item.finalScore || item.score || 0) > 0.2)
          .map((item) => ({
            subject: item.subject || null,
            grade: item.grade || null,
            chapter: getChapter(item) || null,
            chapterCode: item.chapterCode || null,
            topic: getTopic(item) || null,
            topicCode: item.topicCode || null,
            score: item.finalScore || item.score || 0
          }))
      },
      matchedChapter,
      matchedTopic,
      mood: "explainer",
      quiz: triggeredQuiz
    });
  } catch (error) {
    console.error("askAI error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: "Something went wrong while generating the answer"
    });
  }
}

async function getReportCard(req, res) {
  try {
    const userId = req.params.userId || req.query.userId || "demo-user";
    const report = await getStudentReport(userId);

    return res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error("getReportCard error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Could not generate report card"
    });
  }
}

module.exports = {
  askAI,
  getReportCard
};