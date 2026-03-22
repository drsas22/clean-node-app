const Student = require("../models/Student");

exports.createStudent = async (req, res) => {
  try {

    const { name, email, grade } = req.body;

    if (!name || !email || !grade) {
      return res.status(400).json({
        success: false,
        error: "name, email and grade are required"
      });
    }

    const student = await Student.create({
      name,
      email,
      grade
    });

    res.json({
      success: true,
      student
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: "Failed to create student"
    });
  }
};