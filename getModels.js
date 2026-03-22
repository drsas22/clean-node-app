const axios = require("axios");

async function getAvailableModels() {
  try {
    const response = await axios.get("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Available models:");
    response.data.forEach((model) => {
      console.log(- ${model.id} (${model.description || "No description"}));
    });
  } catch (error) {
    console.error("Error fetching models:", error.response?.data || error.message);
  }
}

getAvailableModels();