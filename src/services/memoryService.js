const StudentMemory = require("../models/StudentMemory");

async function getWeakTopics(userId) {
  try {
    const memory = await StudentMemory.findOne({ userId });

    if (!memory || !memory.weakTopics.length) return [];

    return [...memory.weakTopics]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  } catch (err) {
    console.error("Error fetching weak topics:", err);
    return [];
  }
}

async function shouldTriggerRevision(userId, currentTopic) {
  try {
    if (!userId || !currentTopic) return false;

    const memory = await StudentMemory.findOne({ userId });
    if (!memory || !memory.weakTopics.length) return false;

    const topicEntry = memory.weakTopics.find(
      (t) => t.topic === currentTopic
    );

    if (!topicEntry) return false;

    return topicEntry.count >= 3;
  } catch (err) {
    console.error("Error checking revision trigger:", err);
    return false;
  }
}

module.exports = {
  getWeakTopics,
  shouldTriggerRevision
};