const express = require("express");
const router = express.Router();
const multer = require("multer");
const questionController = require("../controllers/questionController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Setup Multer to store file in memory (RAM) temporarily
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /api/questions/upload
// 'file' is the key name we must use in Postman/Frontend
router.post("/upload", authenticateToken, upload.single("file"), questionController.uploadQuestions);
router.get("/:examId", authenticateToken, questionController.getAllQuestions)  // GET /api/questions/:examId
module.exports = router;