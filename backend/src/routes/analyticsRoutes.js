const express  = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/authMiddleware")
const analyticsController = require("../controllers/analyticsController")

// Teacher exam analytics
router.get("/teacher/exams", authenticateToken, analyticsController.getTeacherExamAnalytics )

module.exports = router