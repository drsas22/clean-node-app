const Student = require("../models/Student");
const SyllabusNode = require("../models/SyllabusNode");
const aiService = require("../services/aiService");

function cleanAIText(text) {
  if (!text) return "";

  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\text\{.*?\}/g, "")
    .replace(/\\\\/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]*-[ \t]+/gm, "• ")
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "• ")
    .replace(/\n/g, " \n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function buildKeywordFallback(question, syllabusTopics) {
  const lowerQuestion = String(question || "").toLowerCase();

  const scoredTopics = syllabusTopics.map((item) => {
    let score = 0;

    if (item.topicName && lowerQuestion.includes(String(item.topicName).toLowerCase())) {
      score += 5;
    }

    if (item.chapterName && lowerQuestion.includes(String(item.chapterName).toLowerCase())) {
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

function normalizeGrade(input) {
  const g = String(input || "").trim().toLowerCase();

  if (!g) return "";

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
    "under graduate": "undergraduate",
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
    "post graduate": "postgraduate",
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

// 🔥 NEW FIX (IMPORTANT)
function normalizeStoredGrade(input) {
  const g = String(input || "").trim().toLowerCase();

  if (!g) return "";

  return g
    .replace(/^grade\s*/i, "")
    .replace(/^class\s*/i, "")
    .replace(/\s+/g, "")
    .trim();
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

async function askAI(req, res) {
  try {
    const question = String(req.body.question || "").trim();
    const grade = normalizeGrade(req.body.grade);
    const subject = normalizeSubject(req.body.subject);
    const mode = normalizeMode(req.body.mode);
    const studentId = req.body.studentId || null;

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

    const embedding = await aiService.getEmbedding(question);

    let matches = [];

    try {
      matches = await SyllabusNode.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: embedding,
            numCandidates: 50,
            limit: 8
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
    } catch (vectorError) {
      console.error("Vector search failed:", vectorError.message);
      matches = [];
    }

    // 🔥 FIXED GRADE FILTER
    if (grade) {
      const exactGradeMatches = matches.filter(
        (node) => normalizeStoredGrade(node.grade) === grade
      );

      if (exactGradeMatches.length > 0) {
        matches = exactGradeMatches;
      }
    }

    // SUBJECT FILTER
    if (subject) {
      const subjectLower = subject.toLowerCase();
      const subjectFiltered = matches.filter(
        (node) => String(node.subject || "").trim().toLowerCase() === subjectLower
      );
      if (subjectFiltered.length) matches = subjectFiltered;
    }

    let strongMatches = matches.filter((node) => (node.score || 0) >= 0.75);
    let weakMatches = matches.filter((node) => (node.score || 0) >= 0.6);

    // keyword fallback
    if (!strongMatches.length && !weakMatches.length && matches.length) {
      const bestKeyword = buildKeywordFallback(question, matches);
      if (bestKeyword && bestKeyword.score > 0) {
        weakMatches = [bestKeyword.item];
      }
    }

    let finalMatches = [];
    let retrievalStrength = "none";

    if (strongMatches.length > 0) {
      finalMatches = strongMatches.slice(0, 4);
      retrievalStrength = "strong";
    } else if (weakMatches.length > 0) {
      finalMatches = weakMatches.slice(0, 3);
      retrievalStrength = "weak";
    } else if (matches.length > 0) {
      finalMatches = matches.slice(0, 2);
      retrievalStrength = "weak";
    }

    const syllabusContext = formatSyllabusContext(finalMatches);

    let answer = await aiService.getAnswer({
      question,
      grade,
      subject,
      mode,
      syllabusContext,
      retrievalStrength
    });

    answer = cleanAIText(answer);

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
        contextUsed: finalMatches.length > 0,
        retrievalStrength,
        totalMatches: matches.length,
        usedMatches: finalMatches.length,
        matchedTopics: finalMatches.map((item) => ({
          subject: item.subject || null,
          grade: item.grade || null,
          chapter: getChapter(item) || null,
          chapterCode: item.chapterCode || null,
          topic: getTopic(item) || null,
          topicCode: item.topicCode || null,
          score: item.score || 0
        }))
      },
      matchedChapter: finalMatches[0] ? getChapter(finalMatches[0]) || null : null,
      matchedTopic: finalMatches[0] ? getTopic(finalMatches[0]) || null : null,
      mood: "explainer"
    });
  } catch (error) {
    console.error("askAI error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: "Something went wrong while generating the answer"
    });
  }
}

module.exports = {
  askAI
};