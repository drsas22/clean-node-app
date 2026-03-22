const Conversation = require("../models/conversation");

async function getConversation(studentId) {

  let convo = await Conversation.findOne({ studentId });

  if (!convo) {
    convo = new Conversation({
      studentId,
      messages: []
    });

    await convo.save();
  }

  return convo;
}

async function addMessage(studentId, role, content) {

  const convo = await getConversation(studentId);

  convo.messages.push({
    role,
    content
  });

  // keep last 10 messages only
  if (convo.messages.length > 10) {
    convo.messages = convo.messages.slice(-10);
  }

  await convo.save();

  return convo.messages;
}

module.exports = {
  getConversation,
  addMessage
};