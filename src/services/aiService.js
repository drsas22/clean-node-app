const axios = require("axios");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const EMBEDDING_URL = "https://api.openai.com/v1/embeddings";


// ✅ CHAT FUNCTION
const getAnswer = async (messagesArray) => {
  try {
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key missing");
      return "AI service is currently unavailable";
    }

    const response = await axios.post(
      CHAT_URL,
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

    if (answer) return answer.trim();

    return "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI Error:", error.response?.data || error.message);
    return "AI service is currently unavailable";
  }
};


// ✅ EMBEDDING FUNCTION (NEW — VERY IMPORTANT)
const getEmbedding = async (text) => {
  try {
    const response = await axios.post(
      EMBEDDING_URL,
      {
        model: "text-embedding-3-small",
        input: text
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
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