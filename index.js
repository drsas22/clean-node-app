require("dotenv").config();

const express = require("express");
const connectDB = require("./src/config/db");

const aiRoutes = require("./src/routes/aiRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const homeworkRoutes = require("./src/routes/homeworkRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Healthy" });
});

app.use("/api/ai", aiRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/uploads", express.static("uploads"));

connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });