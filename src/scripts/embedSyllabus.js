const path = require("path");
const mongoose = require("mongoose");
const axios = require("axios");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const connectDB = require("../config/db");
const SyllabusNode = require("../models/SyllabusNode");

function buildSearchableText(node) {
  return `
Subject: ${node.subject || ""}
Grade: ${node.grade || ""}
Board: ${node.board || ""}
Chapter: ${node.chapterName || ""}
Topic: ${node.topicName || ""}
Subtopic: ${node.subtopicName || ""}

Keywords: ${(node.keywords || []).join(", ")}
Aliases: ${(node.aliases || []).join(", ")}

Concept:
${node.searchableText || ""}

Explanation:
${node.content || ""}

Meaning:
${node.topicName || ""} means ${node.searchableText || node.content || ""}

Related:
${node.chapterName || ""} includes ${node.topicName || ""}
`.trim();
}

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
        timeout: 60000,
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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing in .env");
    }

    await connectDB();

    const nodes = await SyllabusNode.find({ active: true });

    if (!nodes.length) {
      console.log("❌ No active syllabus data found");
      process.exit(0);
    }

    console.log(`🚀 Found ${nodes.length} active syllabus nodes`);

    for (const node of nodes) {
      try {
        const text = buildSearchableText(node);

        if (!text || !text.trim()) {
          console.log(
            `⚠️ Skipped empty node: ${node.grade || "Unknown"} | ${node.subject || "Unknown"} | ${node.chapterName || "Unknown"} | ${node.topicName || "Unknown"}`
          );
          continue;
        }

        const embedding = await getEmbedding(text);

        node.searchableText = text;
        node.embedding = embedding;

        await node.save();

        console.log(
          `✅ Embedded: ${node.grade || "Unknown"} | ${node.subject || "Unknown"} | ${node.chapterName || "Unknown"} | ${node.topicName || "Unknown"}`
        );
      } catch (err) {
        console.log(
          `❌ Failed: ${node.grade || "Unknown"} | ${node.subject || "Unknown"} | ${node.chapterName || "Unknown"} | ${node.topicName || "Unknown"}`
        );
        console.error(err.response?.data || err.message);
      }
    }

    console.log("🔥 ALL EMBEDDINGS COMPLETED");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Script Error:", err.message);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

run();