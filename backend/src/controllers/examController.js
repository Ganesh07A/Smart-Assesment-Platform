const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Create Exam
exports.createExam = async (req, res) => {
  try {
    const { title, description, duration, questions } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized: User not found." });
    }

    const calculatedTotalMarks = questions ? questions.length : 0;

    const newExam = await prisma.exam.create({
      data: {
        title,
        description,
        duration: parseInt(duration),
        totalMarks: calculatedTotalMarks,
        teacher: {
          connect: { id: req.user.userId }
        },
        questions: {
          create: questions.map((q) => ({
            type: q.type || "MCQ",
            text: q.text,
            options: q.options || [],
            correctOption: q.type === "MCQ" ? parseInt(q.correctOption) : null,
            testCases: q.type === "CODE" ? q.testCases : [],
            marks: parseInt(q.marks) || 1
          })),
        },
      },
    });

    res.status(201).json({ message: "Exam created successfully!", exam: newExam });
  } catch (err) {
    console.error("Create Exam Error:", err);
    res.status(500).json({ error: "Failed to create exam", details: err.message });
  }
};

// 2. Get Teacher Exams
exports.getTeacherExams = async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      where: { teacherId: req.user.userId },
      orderBy: { id: "desc" },
    });
    res.json(exams);
  } catch {
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

// 3. Get All Exams (Smart Version)
exports.getAllExams = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const exams = await prisma.exam.findMany({
      orderBy: { id: "desc" },
      include: {
        teacher: { select: { name: true } },
      },
    });

    const submissions = await prisma.submission.findMany({
      where: { studentId: studentId },
    });

    const examsWithStatus = exams.map((exam) => {
      const submission = submissions.find((sub) => sub.examId === exam.id);
      return {
        ...exam,
        isAttempted: !!submission,
        score: submission ? submission.score : null,
        totalScore: submission ? submission.totalScore : null
      };
    });

    res.json(examsWithStatus);
  } catch (err) {
    console.error("Fetch Exams Error:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

// 4. Get Exam Questions for Student
exports.getExamQuestions = async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        totalMarks: true
      }
    });

    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const questions = await prisma.question.findMany({
      where: { examId: examId },
      select: {
        id: true,
        type: true,
        text: true,
        options: true,
        marks: true,
        testCases: true,
      }
    });

    res.json({ exam, questions });
  } catch (err) {
    console.error("Get Questions Error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

// 5. Submit Exam & Save Result (ROBUST VERSION)
// 6. Submit Exam (Fixed: Prevents Duplicates)
// 5. Submit Exam & Save Result (FIXED & DEBUGGED)
exports.submitExam = async (req, res) => {
  try {
    console.log("📨 SUBMIT REQUEST RECEIVED");

    const { examId, answers, tabSwitchCount, passedCases } = req.body;
    const studentId = req.user.userId;

    // A. Check duplicate
    const existingSubmission = await prisma.submission.findFirst({
      where: { examId: parseInt(examId), studentId: studentId }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: "You have already taken this exam!" });
    }

    const questions = await prisma.question.findMany({
      where: { examId: parseInt(examId) },
    });

    let score = 0;
    let totalScore = 0;

    console.log("--- GRADING START ---");

    // B. Calculate Score
    questions.forEach((q) => {
      totalScore += q.marks;

      // MCQ Logic
      if (q.type === "MCQ") {
        // Handle both string and number keys (safe access)
        const userAnswer = answers[q.id] !== undefined ? answers[q.id] : answers[String(q.id)];

        console.log(`Q${q.id} (MCQ) | User Ans: ${userAnswer} | Correct: ${q.correctOption}`);

        // Compare loosely (==) to handle "0" == 0 or parseInt
        if (userAnswer !== undefined && parseInt(userAnswer) === q.correctOption) {
          score += q.marks;
          console.log(`✅ Q${q.id} Correct! +${q.marks}`);
        } else {
          console.log(`❌ Q${q.id} Wrong.`);
        }
      }
      // CODE Logic
      else if (q.type === "CODE") {
        const isPassed = passedCases && (passedCases[q.id] === true || passedCases[String(q.id)] === true);

        if (isPassed) {
          score += q.marks;
          console.log(`✅ Q${q.id} (CODE) Passed! +${q.marks}`);
        } else {
          console.log(`❌ Q${q.id} (CODE) Failed.`);
        }
      }
    });

    console.log(`🏁 Final Score: ${score}/${totalScore}`);

    // C. Save
    const submission = await prisma.submission.create({
      data: {
        score: score,
        totalScore: totalScore,
        examId: parseInt(examId),
        studentId: studentId,
        tabSwitchCount: tabSwitchCount || 0,
        answers: answers
      }
    });

    res.json({
      message: "Exam submitted successfully",
      submissionId: submission.id,
      score: score,
      total: totalScore,
      percentage: totalScore > 0 ? ((score / totalScore) * 100).toFixed(2) : 0
    });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
};
// 6. Get Teacher Stats
exports.getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user.userId;

    const totalExams = await prisma.exam.count({ where: { teacherId } });

    const recentSubmissions = await prisma.submission.findMany({
      where: { exam: { teacherId } },
      orderBy: { completedAt: 'desc' },
      take: 5,
      include: {
        student: { select: { name: true, email: true } },
        exam: { select: { title: true } }
      }
    });

    const uniqueStudents = await prisma.submission.groupBy({
      by: ['studentId'],
      where: { exam: { teacherId } },
    });

    res.json({
      totalExams,
      totalStudents: uniqueStudents.length,
      recentActivity: recentSubmissions
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// 7. Get Exam Review (Detailed)
exports.getExamReview = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.userId;

    const submission = await prisma.submission.findFirst({
      where: { examId: parseInt(examId), studentId: studentId }
    });

    if (!submission) return res.status(404).json({ error: "Submission not found." });

    const questions = await prisma.question.findMany({
      where: { examId: parseInt(examId) },
      select: {
        id: true,
        type: true,
        text: true,
        options: true,
        correctOption: true,
        testCases: true
      }
    });

    const reviewData = questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      options: q.options,
      correctOption: q.correctOption,
      testCases: q.testCases,
      // Retrieve answer safely (works for int or string)
      selectedOption: submission.answers ? submission.answers[q.id.toString()] : null
    }));

    res.json({
      examTitle: "Exam Review",
      score: submission.score,
      totalScore: submission.totalScore,
      reviewData
    });
  } catch {
    res.status(500).json({ error: "Failed to load review" });
  }
};

// 8. Delete Exam
exports.deleteExam = async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const teacherId = req.user.userId;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { teacherId: true }
    });

    if (!exam || exam.teacherId !== teacherId) return res.status(403).json({ error: "Unauthorized" });

    await prisma.exam.delete({ where: { id: examId } });
    res.json({ message: "Exam deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete exam" });
  }
};

// 9. Export Results
exports.getExamResults = async (req, res) => {
  try {
    const teacherId = req.user.userId
    const examId = parseInt(req.params.examId)

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { teacherId: true, title: true, totalMarks: true }
    })

    if (!exam || exam.teacherId !== teacherId) return res.status(403).json({ error: "Unauthorised !" })

    const submissions = await prisma.submission.findMany({
      where: { examId },
      include: { student: { select: { name: true, email: true } } }
    })

    const results = submissions.map((sub) => {
      const percentage = sub.totalScore > 0 ? Math.round((sub.score / sub.totalScore) * 100) : 0;
      return {
        name: sub.student.name,
        email: sub.student.email,
        score: sub.score,
        totalScore: sub.totalScore,
        percentage,
        result: percentage >= 35 ? "PASS" : "FAIL",
        tabSwitchCount: sub.tabSwitchCount,
      }
    })
    res.json({ examTitle: exam.title, results })
  } catch {
    res.status(500).json({ error: "Failed to export results" });
  }
}

// 10. Exam Details
// 3. Get All Exams (Smart Version)
exports.getAllExams = async (req, res) => {
  try {
    // 📢 LOG 1: Check if user exists
    console.log("---- GET ALL EXAMS ----");
    console.log("👤 User from Token:", req.user);

    if (!req.user || !req.user.userId) {
      console.log("❌ Error: User ID missing in token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const studentId = req.user.userId;

    // 📢 LOG 2: Fetching Exams
    const exams = await prisma.exam.findMany({
      orderBy: { id: "desc" },
      include: {
        teacher: { select: { name: true } },
      },
    });

    // 📢 LOG 3: Fetching Submissions
    const submissions = await prisma.submission.findMany({
      where: { studentId: studentId },
    });

    const examsWithStatus = exams.map((exam) => {
      const submission = submissions.find((sub) => sub.examId === exam.id);
      return {
        ...exam,
        isAttempted: !!submission,
        score: submission ? submission.score : null,
        totalScore: submission ? submission.totalScore : null
      };
    });

    console.log(`✅ Found ${exams.length} exams`);
    res.json(examsWithStatus);
  } catch (err) {
    console.error("🔥 CRITICAL ERROR in getAllExams:", err);
    res.status(500).json({ error: "Failed to fetch exams", details: err.message });
  }
};

// 10. Exam Details
// 10. Exam Details (Updated & Safer)
exports.getExamDetails = async (req, res) => {
  try {
    console.log("---- GET EXAM DETAILS ----");
    console.log("📥 Requested Exam ID:", req.params.examId);
    console.log("👤 User:", req.user);

    // 1. Validate Exam ID
    const examId = parseInt(req.params.examId);
    if (isNaN(examId)) {
      console.log("❌ Error: Invalid Exam ID (NaN)");
      return res.status(400).json({ error: "Invalid Exam ID provided" });
    }

    const teacherId = req.user.userId;

    // 2. Check if the exam belongs to this teacher
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true, totalMarks: true, teacherId: true },
    });

    // 3. Security Check
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Allow students to view details OR enforce teacher-only? 
    // Usually 'details' with stats is for teachers.
    if (req.user.role === "TEACHER" && exam.teacherId !== teacherId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // 4. Fetch submissions
    const submissions = await prisma.submission.findMany({
      where: { examId },
      include: { student: { select: { name: true, email: true } } },
      orderBy: { completedAt: "desc" },
    });

    // 5. Calculate Stats
    const attempts = submissions.length;
    const totalScoreSum = submissions.reduce((sum, s) => sum + s.score, 0);
    const avgScore = attempts > 0 ? Number((totalScoreSum / attempts).toFixed(2)) : 0;
    const passCount = submissions.filter((s) => s.totalScore > 0 && s.score / s.totalScore >= 0.35).length;
    const passRate = attempts > 0 ? Math.round((passCount / attempts) * 100) : 0;

    const formattedSubmissions = submissions.map((s) => ({
      studentName: s.student.name,
      email: s.student.email,
      score: s.score,
      totalScore: s.totalScore,
      percentage: s.totalScore > 0 ? Math.round((s.score / s.totalScore) * 100) : 0,
      result: (s.totalScore > 0 && s.score / s.totalScore >= 0.35) ? "PASS" : "FAIL",
      tabSwitchCount: s.tabSwitchCount,
      submittedAt: s.completedAt,
    }));

    res.json({
      exam: { title: exam.title, attempts, avgScore, passRate },
      submissions: formattedSubmissions,
    });
  } catch (err) {
    console.error("🔥 Get Details Error:", err.message);
    res.status(500).json({ error: "Failed to fetch exam details" });
  }
};