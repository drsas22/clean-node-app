// scripts/embedMissingG8Science.js
require("dotenv").config();
const mongoose = require("mongoose");
const SyllabusNode = require("../src/models/SyllabusNode");
const { getEmbedding } = require("../src/services/aiService");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const cursor = SyllabusNode.find({
    grade: "Grade 8",
    subject: "Science",
    active: true,
    embedding: { $exists: false }
  }).cursor();

  for await (const node of cursor) {
    const text = node.content || node.searchableText || "";
    if (!text.trim()) continue;

    console.log("Embedding:", node.topicName || node._id.toString());
    const emb = await getEmbedding(text);
    node.embedding = emb;
    await node.save();
  }

  await mongoose.disconnect();
  console.log("Done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
