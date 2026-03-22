exports.detectSubject = async (question) => {
  // Placeholder: simple keyword-based
  if (/photosynthesis|plants/i.test(question)) return "Science";
  if (/addition|subtraction/i.test(question)) return "Math";
  if (/history|war/i.test(question)) return "History";
  return "General";
};