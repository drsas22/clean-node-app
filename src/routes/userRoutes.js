const express = require("express");
const router = express.Router();

const mainController = require("../controllers/mainController");
const { body } = require("express-validator");

// Create user
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required")
  ],
  mainController.createUser
);

// Get all users
router.get("/", mainController.getUsers);

// Update user
router.put(
  "/:id",
  [
    body("name").optional().notEmpty(),
    body("email").optional().isEmail()
  ],
  mainController.updateUser
);

// Delete user
router.delete("/:id", mainController.deleteUser);

module.exports = router;