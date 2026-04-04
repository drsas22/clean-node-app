function detectIntent(question = "") {
  const q = String(question || "").toLowerCase().trim();

  const casualPatterns = [
    /\bhi\b/, /\bhello\b/, /\bhey\b/, /\bhii\b/,
    /\bwhat('?s)? up\b/, /\bwhats up\b/, /\bsup\b/,
    /\bhow are you\b/, /\bhow r u\b/, /\bhow are u\b/,
    /\bgood morning\b/, /\bgood evening\b/, /\bgood night\b/,
    /\bi am sad\b/, /\bi'm sad\b/, /\bi feel sad\b/,
    /\bupset\b/, /\bunhappy\b/, /\bdepressed\b/,
    /\btell me a joke\b/, /\bwho are you\b/, /\bthank you\b/, /\bthanks\b/
  ];

  for (const pattern of casualPatterns) {
    if (pattern.test(q)) {
      return { intent: "chitchat", confidence: 0.9 };
    }
  }

  const academicSignals = [
    "explain", "define", "what is", "why", "how does", "difference between",
    "equation", "formula", "photosynthesis", "gravity", "fraction",
    "history", "science", "math", "chemistry", "physics", "biology",
    "geography", "grammar", "solve", "answer this", "homework", "chapter"
  ];

  for (const word of academicSignals) {
    if (q.includes(word)) {
      return { intent: "academic", confidence: 0.8 };
    }
  }

  return { intent: "general", confidence: 0.5 };
}

module.exports = { detectIntent };