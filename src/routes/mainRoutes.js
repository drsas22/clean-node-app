// src/routes/mainRoutes.js
const express = require("express");
const router = express.Router();
const mainController = require("../controllers/mainController");
const { body } = require("express-validator");

// Basic routes
router.get("/", mainController.home);
router.get("/api/status", mainController.status);

// User routes with validation
router.post(
  "/api/users",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required")
  ],
  mainController.createUser
);

router.put(
  "/api/users/:id",
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().withMessage("Provide a valid email")
  ],
  mainController.updateUser
);

router.get("/api/users", mainController.getUsers);

router.delete("/api/users/:id", mainController.deleteUser);

module.exports = router;