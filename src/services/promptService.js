exports.buildTeachingPrompt = (grade, mood, subject, context, question) => {
  return `You are an animated AI tutor for a ${grade} student. 
Student mood: ${mood}. 
Subject: ${subject}. 
Context: ${context}. 
Question: ${question}. 
Answer in a clear, simple, and friendly way suitable for this grade.`;
};