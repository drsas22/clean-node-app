const axios = require("axios");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const getAnswer = async (messagesArray) => {
  try {
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key missing. Add OPENAI_API_KEY to your environment.");
      return "AI service is currently unavailable";
    }

    if (!Array.isArray(messagesArray) || messagesArray.length === 0) {
      console.error("Invalid messagesArray passed to getAnswer");
      return "AI service is currently unavailable";
    }

    const response = await axios.post(
      OPENAI_URL,
      {
        model: OPENAI_MODEL,
        messages: messagesArray,
        temperature: 0.7
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

    if (typeof answer === "string" && answer.trim().length > 0) {
      return answer.trim();
    }

    console.error("OpenAI returned no usable answer:", response?.data);
    return "Sorry, I couldn't generate a response right now.";
  } catch (error) {
    if (error.response) {
      console.error("OpenAI API Error:", {
        status: error.response.status,
        data: error.response.data
      });

      if (error.response.status === 401) {
        return "AI service authentication failed";
      }

      if (error.response.status === 429) {
        return "AI service is busy right now. Please try again.";
      }

      return "AI service is currently unavailable";
    }

    if (error.code === "ECONNABORTED") {
      console.error("OpenAI request timed out");
      return "AI service took too long to respond";
    }

    console.error("OpenAI API Error:", error.message);
    return "AI service is currently unavailable";
  }
};

module.exports = {
  getAnswer
};