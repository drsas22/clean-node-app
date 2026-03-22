function cleanAIText(text) {

  if (!text) return text;

  return text
    .replace(/\\/g, "")      // remove bold **
    .replace(/\*/g, "")       // remove *
    .replace(/\\n/g, " ")     // remove escaped newline
    .replace(/\n/g, " ")      // remove real newline
    .replace(/\s+/g, " ")     // normalize spaces
    .trim();

}

module.exports = { cleanAIText };