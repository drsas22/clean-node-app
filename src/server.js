require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const aiRoutes = require("./routes/aiRoutes");
const homeworkRoutes = require("./routes/homeworkRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(express.json());

// AI Routes
app.use("/api/ai", aiRoutes);

// Homework OCR Routes
app.use("/api/homework", homeworkRoutes);

// Static uploads folder
app.use("/uploads", express.static("uploads"));

// Connect DB & start server
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });