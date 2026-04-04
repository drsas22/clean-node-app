const Student = require("../models/Student");
const SyllabusNode = require("../models/SyllabusNode");
const StudentMemory = require("../models/StudentMemory");
const aiService = require("../services/aiService");
const { getWeakTopics, shouldTriggerRevision } = require("../services/memoryService");
const { generateQuiz } = require("../services/quizService");
const { getStudentReport } = require("../services/reportService");
const { detectIntent } = require("../utils/detectIntent");
const { generateCasualReply } = require("../services/casualService");

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

    undergraduate: "undergraduate",
    undergraduatelevel: "undergraduate",
    ug: "undergraduate",
    college: "undergraduate",
    bachelor: "undergraduate",
    bachelors: "undergraduate",
    mbbs: "undergraduate",
    bds: "undergraduate",
    bams: "undergraduate",
    bhms: "undergraduate",
    bpt: "undergraduate",
    nursing: "undergraduate",
    engineering: "undergraduate",

    postgraduate: "postgraduate",
    postgraduatelevel: "postgraduate",
    pg: "postgraduate",
    master: "postgraduate",
    masters: "postgraduate",
    md: "postgraduate",
    ms: "postgraduate",
    mds: "postgraduate",
    resident: "postgraduate",
    residency: "postgraduate",

    research: "researcher",
    researcher: "researcher",
    researchers: "researcher",
    phd: "researcher",
    doctorate: "researcher",
    doctoral: "researcher",
    scientist: "researcher"
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
    "addition",
    "subtraction",
    "multiplication",
    "division",
    "numbers",
    "fractions",
    "plants",
    "body parts",
    "photosynthesis",
    "respiration",
    "digestion",
    "nutrition",
    "reproduction",
    "cell",
    "tissue",
    "force",
    "motion",
    "friction",
    "light",
    "reflection",
    "refraction",
    "electricity",
    "magnetism",
    "acid",
    "base",
    "salt",
    "atom",
    "molecule",
    "heat",
    "sound",
    "derivative",
    "trigonometry",
    "molarity",
    "newton",
    "coulomb",
    "genetics",
    "cell structure"
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

async function runAcademicPipeline({ question, grade, subject, mode, studentId, userId }) {
  const detectedTopic = extractTopic(question);

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
      {
        keywords: {
          $elemMatch: { $regex: escapeRegex(detectedTopic), $options: "i" }
        }
      },
      {
        aliases: {
          $elemMatch: { $regex: escapeRegex(detectedTopic), $options: "i" }
        }
      }
    );
  }

  const importantWords = String(question)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (w) =>
        ![
          "what",
          "is",
          "are",
          "the",
          "of",
          "in",
          "on",
          "for",
          "a",
          "an",
          "explain",
          "define"
        ].includes(w)
    )
    .slice(0, 5);

  importantWords.forEach((word) => {
    if (word.length >= 3) {
      lexicalOr.push(
        { topicName: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
        { chapterName: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
        { searchableText: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
        { content: new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
        {
          keywords: {
            $elemMatch: { $regex: `\\b${escapeRegex(word)}\\b`, $options: "i" }
          }
        },
        {
          aliases: {
            $elemMatch: { $regex: `\\b${escapeRegex(word)}\\b`, $options: "i" }
          }
        }
      );
    }
  });

  if (lexicalOr.length > 0) {
    const lexicalMatches = await SyllabusNode.find({
      ...lexicalQuery,
      $or: lexicalOr
    })
      .limit(20)
      .lean();

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
            path: "The syntax error is because your file currently has **two overlapping versions** of the academic flow plus a literal comment fragment `full aicontroller pls check it` in the middle. You need to keep only **one** implementation of the academic pipeline and `askAI`, and remove everything between the two versions.

Right now your file has:

1. A clean `runAcademicPipeline(...)` + `askAI(...)` (the first big block).
2. Then this stray line:

```js
}full aicontroller pls check it 
```

3. Then an **old copy** of the academic logic that still does `res.status(200).json(...)` directly inside the pipeline.

That entire second block (from `}full aicontroller pls check it` down to the extra `return res.status(200).json({ ... });` and its `catch`/`}`) must be deleted, because you already replaced it with the new `runAcademicPipeline(...)` + `askAI(...)` structure above.

## Exact fix

In `src/controllers/aiController.js`:

1. Keep everything from the top down through:

```js
async function runAcademicPipeline({ question, grade, subject, mode, studentId, userId, res }) {
  // ...
  return {
    answer,
    meta: {
      // ...
    },
    matchedChapter,
    matchedTopic,
    quiz: triggeredQuiz
  };
}

async function askAI(req, res) {
  try {
    // ...
    // intent check
    // ...
    // academic branch:
    const result = await runAcademicPipeline({ ... });

    return res.status(200).json({
      success: true,
      answer: result.answer,
      meta: {
        ...result.meta,
        intent: "academic"
      },
      matchedChapter: result.matchedChapter,
      matchedTopic: result.matchedTopic,
      mood: "explainer",
      quiz: result.quiz
    });
  } catch (error) {
    console.error("askAI error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: "Something went wrong while generating the answer"
    });
  }
}
```

2. **Delete everything** starting from this stray text:

```js
}full aicontroller pls check it 
```

down to just before:

```js
async function getReportCard(req, res) {
```

That means the second copy of:

- `const syllabusContext = formatSyllabusContext(finalMatches);`
- the old `return res.status(200).json({ success: true, answer, meta: { ... } })` block,
- the second `catch (error) { ... }` after it,

all of that must be removed.

3. After cleanup, the bottom of your file should look like this:

```js
async function askAI(req, res) {
  try {
    // ... as in the first version you pasted ...
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
