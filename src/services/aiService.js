const axios = require("axios");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

const SYSTEM_PROMPT = `
You are Fairy, a warm, intelligent, highly effective AI tutor for students. Explain clearly based on syllabus, and Respond strictly in ${language}. 

Your teaching style:
- Explain like an excellent teacher
- Be clear, simple, and friendly
- Teach step by step when needed
- Use age-appropriate or level-appropriate language
- Adjust depth based on the student's grade or academic level
- Prioritize the provided syllabus context when available
- Stay accurate and educational
- Be encouraging, never rude or robotic

Important behavior rules:
- Do not sound like a chatbot or AI assistant
- Do not say "based on the context provided" or "according to the retrieved content"
- Do not mention prompts, embeddings, vector search, retrieval, memory system, or internal system details
- If the question is unclear, answer in the most helpful likely way and mention the assumption briefly
- If the topic is outside the syllabus context, still teach helpfully in a clear way
- Avoid unnecessary jargon for younger learners
- For advanced learners, allow precise terminology with clarity
- Avoid overexplaining unless needed

Teaching rules:
- Start with a direct answer
- Then explain in clear steps when appropriate
- Use an example when it genuinely improves understanding
- Then give key points or exam points depending on mode
- End with exam-ready notes, quick recall help, or advanced takeaways depending on level
- Add one short practice question only when useful

Presentation rules:
- Keep formatting neat and readable
- Avoid robotic phrases
- Avoid repeating the question unnecessarily
- Avoid excessive bullet points
- Keep headings clean
- Sound natural and teacher-like

Formatting rules for maths, physics and chemistry:
- Never use LaTeX
- Never use \\( \\), \\[ \\], \\frac, superscript syntax, or equation markup
- Write every formula in plain text
- Use simple readable notation like:
  - F = m × a
  - speed = distance / time
  - molarity = moles of solute / litres of solution
  - a^2 + b^2 = c^2
- Keep formulas short and mobile-friendly
- If a formula is needed, write it on its own line
- Prefer plain-text symbols over special formatting

Mode behavior:
- In STUDY mode: teach conceptually, clearly, and with examples
- In EXAM mode: be concise, pointwise, and marks-oriented
- For advanced academic levels, maintain academic depth but preserve clarity
`;

function getModeInstruction(mode) {
  if (String(mode).toLowerCase() === "exam") {
    return `
Answer in EXAM MODE:
- Be concise and pointwise
- Focus on definitions, core concepts, and scoring keywords
- Use short paragraphs or bullet-style points
- Give exam-ready notes
- Prefer answer-writing style over long teaching
- If relevant, mention likely keywords students should write in exams
`;
  }

  return `
Answer in STUDY MODE:
- Teach step by step
- Explain in clear language
- Use examples where useful
- Focus on understanding first, then memory
- Make the student feel guided by a caring teacher
`;
}

function getGradeInstruction(grade) {
  const g = String(grade || "").trim().toLowerCase();

  if (["1", "2", "3", "4", "5"].includes(g)) {
    return "Use very simple words, short sentences, and familiar daily-life examples.";
  }

  if (["6", "7", "8"].includes(g)) {
    return "Use simple school-level explanations with some subject terms, but keep it easy and clear.";
  }

  if (["9", "10"].includes(g)) {
    return "Use clear academic explanation with important terminology and exam-focused clarity.";
  }

  if (["11", "12"].includes(g)) {
    return "Use more precise subject terminology, deeper explanation, and exam-oriented structure.";
  }

  if (
    [
      "ug",
      "undergraduate",
      "under graduate",
      "college",
      "bachelor",
      "bachelors",
      "mbbs",
      "bds",
      "bams",
      "bhms",
      "bpt",
      "nursing",
      "engineering"
    ].includes(g)
  ) {
    return "Use undergraduate-level explanation with correct terminology, conceptual depth, and practical clarity.";
  }

  if (
    [
      "pg",
      "postgraduate",
      "post graduate",
      "masters",
      "master",
      "md",
      "ms",
      "mds",
      "residency",
      "resident"
    ].includes(g)
  ) {
    return "Use postgraduate-level explanation with higher precision, deeper conceptual detail, and stronger analytical framing.";
  }

  if (
    [
      "research",
      "researcher",
      "researchers",
      "phd",
      "doctorate",
      "doctoral",
      "scientist"
    ].includes(g)
  ) {
    return "Use researcher-level explanation with rigorous terminology, nuanced reasoning, and advanced conceptual framing.";
  }

  return "Adjust explanation to the student's likely level and keep it clear and easy to understand.";
}

function getOutputFormat(mode, grade) {
  const g = String(grade || "").trim().toLowerCase();

  const isAdvanced = [
    "ug",
    "undergraduate",
    "under graduate",
    "college",
    "bachelor",
    "bachelors",
    "mbbs",
    "bds",
    "bams",
    "bhms",
    "bpt",
    "nursing",
    "engineering",
    "pg",
    "postgraduate",
    "post graduate",
    "masters",
    "master",
    "md",
    "ms",
    "mds",
    "residency",
    "resident",
    "research",
    "researcher",
    "researchers",
    "phd",
    "doctorate",
    "doctoral",
    "scientist"
  ].includes(g);

  if (String(mode).toLowerCase() === "exam") {
    return `
Required output structure:
1. Direct Answer
2. Exam Points
3. Keywords
4. Exam Notes
`;
  }

  if (isAdvanced) {
    return `
Required output structure:
1. Direct Answer
2. Clear Explanation
3. Core Mechanism / Conceptual Framework
4. Key Points
5. Advanced Insight / Application
`;
  }

  return `
Required output structure:
1. Direct Answer
2. Simple Explanation
3. Example
4. Key Points
5. Practice Question (only if useful)
`;
}
function getRetrievalInstruction(retrievalStrength) {
  const strength = String(retrievalStrength || "none").toLowerCase();

  if (strength === "strong") {
    return "Use the syllabus context as the primary source. Do not introduce concepts from outside this context unless absolutely necessary.";
  }

  if (strength === "weak") {
    return "Use the syllabus context as a hint only. If it does not clearly fit the question, prioritize a safe, general explanation at the student's level.";
  }

  return "No reliable syllabus context was found. Answer helpfully, clearly, and at the student's level using general knowledge.";
}


function getSubjectFormattingRule(subject) {
  const s = String(subject || "").trim().toLowerCase();

  if (["maths", "mathematics", "science", "physics", "chemistry"].includes(s)) {
    return `
Formatting for formulas:
- Use plain text formulas only
- Never use LaTeX
- Write formulas like:
  speed = distance / time
  F = m × a
  molarity = moles of solute / litres of solution
  a^2 + b^2 = c^2
  sin A = opposite / hypotenuse
- Put formulas on separate lines when useful
- Keep formulas simple and readable on mobile
`;
  }

  return `
Formatting:
- Keep output simple, clean and readable
`;
}

function buildUserPrompt({
  question,
  grade,
  subject,
  mode = "study",
  syllabusContext = "No syllabus context found.",
  retrievalStrength = "none",
  weakContext = "",
  revisionMode = false
}) {
  return `
Student Question:
${question}

Student Grade / Academic Level:
${grade || "Not specified"}

Subject:
${subject || "Not specified"}

Mode:
${mode}

Student Level Instruction:
${getGradeInstruction(grade)}

Mode Instruction:
${getModeInstruction(mode)}

Subject Formatting Rule:
${getSubjectFormattingRule(subject)}

Retrieval Strength:
${retrievalStrength}

Retrieval Use Rule:
${getRetrievalInstruction(retrievalStrength)}

Relevant Syllabus Context:
${syllabusContext}

Weak Topic Context:
${weakContext || "No weak-topic history available."}

Revision Trigger:
${revisionMode ? "The student appears to be repeatedly struggling with this topic. Briefly acknowledge that and give a slightly more supportive explanation with one focused revision-style reinforcement." : "No revision trigger."}

${getOutputFormat(mode, grade)}

Extra rules:
- Keep the answer appropriate for the student's grade or academic level
- Prefer syllabus alignment when retrieval is strong
- Do not make the answer unnecessarily long
- Be clear, teacher-like, and easy to follow
- When a concept is abstract, use one simple example or analogy if helpful
- For undergraduate, postgraduate, and researcher levels, increase rigor and precision appropriately
- Do not mention syllabus retrieval, context blocks, memory system, or internal processing
- For maths, physics and chemistry, write formulas in plain text only
- Do not use LaTeX or mathematical markup
- Keep equations easy to read on a phone screen
- For formula-based subjects, give only essential formulas unless more are requested
`;
}

const getAnswer = async ({
  question,
  grade,
  subject,
  mode = "study",
  syllabusContext = "No syllabus context found.",
  retrievalStrength = "none",
  weakContext = "",
  revisionMode = false
}) => {
  try {
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key missing");
      return "AI service is currently unavailable";
    }

    if (!question || !String(question).trim()) {
      return "Please ask a valid question.";
    }

    const messagesArray = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: buildUserPrompt({
          question: String(question).trim(),
          grade,
          subject,
          mode,
          syllabusContext,
          retrievalStrength,
          weakContext,
          revisionMode
        })
      }
    ];

    const response = await axios.post(
      CHAT_URL,
      {
        model: OPENAI_MODEL,
        messages: messagesArray,
        temperature: 0.4,
        max_tokens: 900
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 60000
      }
    );

    const answer = response?.data?.choices?.[0]?.message?.content;

    if (answer) return answer.trim();

    return "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI Error:", error.response?.data || error.message);
    return "AI service is currently unavailable";
  }
};

const getEmbedding = async (text) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key missing");
    }

    const cleanText = String(text || "").trim();

    if (!cleanText) {
      throw new Error("Text is required for embedding");
    }

    const response = await axios.post(
      EMBEDDING_URL,
      {
        model: "text-embedding-3-small",
        input: cleanText
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 60000
      }
    );

    return response.data.data[0].embedding;
  } catch (error) {
    console.error("Embedding Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  getAnswer,
  getEmbedding
};