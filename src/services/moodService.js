exports.detectMood = (question) => {
  // Placeholder: simple keyword-based
  if (/why|how|explain/i.test(question)) return "curious";
  if (/angry|hate|frustrate/i.test(question)) return "frustrated";
  return "neutral";
};