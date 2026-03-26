require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const aiRoutes = require("./routes/aiRoutes");
const homeworkRoutes = require("./routes/homeworkRoutes");
const studentRoutes = require("./routes/studentRoutes");
const syllabusRoutes = require("./routes/syllabusRoutes");
 // ✅ ADD THIS

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ HEALTH + ROOT ROUTES
app.get("/", (req, res) => {
  res.send("Server is working 🚀");
});

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Healthy" });
});

// ✅ Routes
app.use("/api/ai", aiRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/student", studentRoutes); // ✅ ADD THIS
app.use("/api/syllabus", syllabusRoutes);

// ✅ Static uploads
app.use("/uploads", express.static("uploads"));

// ✅ Start server
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });