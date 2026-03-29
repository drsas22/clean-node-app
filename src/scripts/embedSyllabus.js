const path = require("path");
const mongoose = require("mongoose");
const axios = require("axios");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const connectDB = require("../config/db");
const SyllabusNode = require("../models/SyllabusNode");

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimToSafeLength(text, maxChars = 6000) {
  const clean = cleanText(text);
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars);
}

function buildEmbeddingInput(node) {
  const parts = [
    `Board: ${cleanText(node.board)}`,
    `Grade: ${cleanText(node.grade)}`,
    `Subject: ${cleanText(node.subject)}`,
    `Chapter: ${cleanText(node.chapterName)}`,
    `Topic: ${cleanText(node.topicName)}`,
    `Subtopic: ${cleanText(node.subtopicName)}`,
    `Keywords: ${(node.keywords || []).map(cleanText).join(", ")}`,
    `Aliases: ${(node.aliases || []).map(cleanText).join(", ")}`,
    `Content: ${cleanText(node.content)}`
  ];

  return trimToSafeLength(parts.filter(Boolean).join("\n"));
}

function buildSearchableText(node) {
  const parts = [
    cleanText(node.board),
    cleanText(node.grade),
    cleanText(node.subject),
    cleanText(node.chapterName),
    cleanText(node.topicName),
    cleanText(node.subtopicName),
    ...(node.keywords || []).map(cleanText),
    ...(node.aliases || []).map(cleanText),
    cleanText(node.content)
  ];

  return trimToSafeLength(parts.filter(Boolean).join(" | "), 3000);
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
        const embeddingInput = buildEmbeddingInput(node);
        const searchableText = buildSearchableText(node);

        if (!embeddingInput) {
          console.log(
            `⚠️ Skipped empty node: ${node.grade || "Unknown"} | ${node.subject || "Unknown"} | ${node.chapterName || "Unknown"} | ${node.topicName || "Unknown"}`
          );
          continue;
        }

        const embedding = await getEmbedding(embeddingInput);

        node.searchableText = searchableText;
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