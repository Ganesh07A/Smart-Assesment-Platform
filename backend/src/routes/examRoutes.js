const express = require("express")
const router = express.Router()
const examcontroller = require("../controllers/examController")
const { authenticateToken } = require("../middleware/authMiddleware")

router.post("/create", authenticateToken, examcontroller.createExam)
router.get("/my-exams", authenticateToken, examcontroller.getTeacherExams)
router.get("/all", authenticateToken, examcontroller.getAllExams)
router.post("/submit", authenticateToken, examcontroller.submitExam)
router.get("/teacher/stats", authenticateToken, examcontroller.getTeacherStats)
router.get("/review/:examId", authenticateToken, examcontroller.getExamReview)
router.get("/:examId/results", authenticateToken, examcontroller.getExamResults)
router.delete("/:examId", authenticateToken, examcontroller.deleteExam);
router.get("/:examId/details", authenticateToken, examcontroller.getExamDetails)

// 🆕 NEW: Fetch Questions for Student (Fixes the 404 Error)
// 11. Get Student History
router.get("/student/history", authenticateToken, examcontroller.getStudentHistory);

router.get("/:id/questions", authenticateToken, examcontroller.getExamQuestions)

module.exports = router