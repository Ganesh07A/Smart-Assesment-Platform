const express = require("express")
const router = express.Router()
const examcontroller = require("../controllers/examController")
const { authenticateToken } = require("../middleware/authMiddleware")

router.post("/create", authenticateToken, examcontroller.createExam)
router.get("/my-exams",authenticateToken ,examcontroller.getTeacherExams)

module.exports = router