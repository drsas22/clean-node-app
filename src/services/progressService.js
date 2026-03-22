module.exports = async (student, subject) => {
  // Increment some learning stats (placeholder)
  if (!student.progress) student.progress = {};
  if (!student.progress[subject]) student.progress[subject] = 0;
  student.progress[subject] += 1;
};