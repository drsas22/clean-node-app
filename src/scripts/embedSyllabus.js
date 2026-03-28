const path = require("path");

// ✅ Load .env correctly
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const SyllabusNode = require("../models/SyllabusNode");
const axios = require("axios");

// ✅ Debug key (only first few chars)
console.log("KEY USED:", process.env.OPENAI_API_KEY?.slice(0, 10));

// Build searchable text
function buildSearchableText(node) {
  return [
    node.board,
    node.grade,
    node.subject,
    node.chapterName,
    node.topicName,
    ...(node.keywords || []),
    ...(node.aliases || []),
  ]
    .filter(Boolean)
    .join(" | ");
}

// ✅ WORKING embedding function (NO SDK)
async function getEmbedding(text) {
  try {
    const res = await axios.post(
      "https://api.openai.com/v1/embeddings",
      {
        model: "text-embedding-3-small",
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.data[0].embedding;
  } catch (err) {
    console.error("❌ Embedding Error:", err.response?.data || err.message);
    throw err;
  }
}

async function run() {
  try {
    await connectDB();

    const nodes = await SyllabusNode.find({ active: true });

    if (!nodes.length) {
      console.log("❌ No syllabus data found");
      process.exit(0);
    }

    for (const node of nodes) {
      try {
        const text = buildSearchableText(node);
        const embedding = await getEmbedding(text);

        node.searchableText = text;
        node.embedding = embedding;

        await node.save();

        console.log(
          `✅ Embedded: ${node.grade} | ${node.subject} | ${node.chapterName}`
        );
      } catch (err) {
        console.log(`❌ Failed: ${node.chapterName}`);
      }
    }

    console.log("🔥 ALL EMBEDDINGS COMPLETED");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Script Error:", err.message);
    process.exit(1);
  }
}

run();