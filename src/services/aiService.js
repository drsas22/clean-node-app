const axios = require("axios");

const getAnswer = async (messagesArray) => {
  try {
    const modelId = "gpt-4o-mini"; 
    const url = "https://api.openai.com/v1/chat/completions";
    
    const response = await axios.post(
      url,
      {
        model: modelId,
        messages: messagesArray, 
        temperature: 0.7, 
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` 
        },
      }
    );

    if (response.data?.choices?.length > 0) {
      let ans = response.data.choices[0].message.content;
      return ans.trim(); 
    } else {
      return "Sorry, I couldn't generate a response right now.";
    }
  } catch (error) {
    console.error("OpenAI API Error:", error?.response?.data || error.message);
    return "AI service is currently unavailable";
  }
};

module.exports = {
  getAnswer
};
