const express = require("express")
const router = express.Router()
const examcontroller = require("../controllers/examController")
const { authenticateToken } = require("../middleware/authMiddleware")

router.post("/create", authenticateToken, examcontroller.createExam)
router.get("/my-exams",authenticateToken ,examcontroller.getTeacherExams)
router.get("/all",authenticateToken, examcontroller.getAllExams  )
router.post("/submit",authenticateToken, examcontroller.submitExam  )
router.get("/teacher/stats", authenticateToken, examcontroller.getTeacherStats)
router.get("/review/:examId", authenticateToken, examcontroller.getExamReview)


module.exports = router