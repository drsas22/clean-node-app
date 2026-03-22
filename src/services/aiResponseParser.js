function parseAIResponse(text) {

  try {

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    }

  } catch (error) {
    console.log("AI response parsing failed");
  }

  return {
    explanation: text,
    question: "",
    emotion: "neutral"
  };

}

module.exports = { parseAIResponse };