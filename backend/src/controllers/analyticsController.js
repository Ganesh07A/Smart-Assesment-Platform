const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getTeacherExamAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.userId;

    // 1. Fetch all exams created by this teacher
    const exams = await prisma.exam.findMany({
      where: { teacherId },
      select: {
        id: true,
        title: true,
        totalMarks: true,
        submissions: {
          select: {
            score: true,
            totalScore: true,
          }
        }
      }
    });

    // 2. Build analytics per exam
    const analytics = exams.map((exam) => {
      const attempts = exam.submissions.length;

      if (attempts === 0) {
        return {
          examId: exam.id,
          title: exam.title,
          attempts: 0,
          avgScore: 0,
          passRate: 0,
          passCount: 0, // <--- Added
          failCount: 0, // <--- Added
          highest: 0,
          lowest: 0
        };
      }

      const scores = exam.submissions.map(s => s.score);
      
      const avgScore = scores.reduce((a, b) => a + b, 0) / attempts;

      const passCount = exam.submissions.filter(
        s => s.score / s.totalScore >= 0.35
      ).length;

      const failCount = attempts - passCount; // <--- Calculated

      return {
        examId: exam.id,
        title: exam.title,
        attempts,
        avgScore: Number(avgScore.toFixed(2)),
        passRate: Math.round((passCount / attempts) * 100),
        passCount, // <--- Return explicit count
        failCount, // <--- Return explicit count
        highest: Math.max(...scores),
        lowest: Math.min(...scores)
      };
    });

    res.json(analytics);

  } catch (err) {
    console.error("Teacher Exam Analytics Error:", err);
    res.status(500).json({ error: "Failed to fetch exam analytics" });
  }
};