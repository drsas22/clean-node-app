// src/services/gradeService.js
function adjustPromptForGrade(originalPrompt, grade, mood) {
  let difficulty = "medium"; // default

  // Adjust based on grade
  if (grade === "1st" || grade === "2nd") difficulty = "very simple";
  else if (grade === "3rd" || grade === "4th" || grade === "5th") difficulty = "simple";
  else if (grade === "6th" || grade === "7th") difficulty = "medium";
  else if (grade === "8th" || grade === "9th") difficulty = "medium-hard";
  else difficulty = "hard"; // high school / college

  // Adjust based on mood
  if (mood === "confused" || mood === "sad") difficulty = "simpler";
  if (mood === "happy") difficulty += " + engaging";

  return Explain in a ${difficulty} way: ${originalPrompt};
}

module.exports = { adjustPromptForGrade };