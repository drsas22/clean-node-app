require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const SyllabusNode = require("./src/models/SyllabusNode");

async function main() {
  await connectDB();

  console.log("MONGO_URI:", process.env.MONGO_URI);
  console.log("Connected DB name:", mongoose.connection.name);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(
    "Collections:",
    collections.map(c => c.name)
  );

  const total = await SyllabusNode.countDocuments();
  console.log("SyllabusNode count:", total);

  const one = await SyllabusNode.findOne();
  console.log("Sample doc:", one);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
});