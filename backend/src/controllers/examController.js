const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Create Exam
exports.createExam = async (req, res) => {
  try {
    const { title, description, duration, totalMarks } = req.body;

    // 👇 FIXED: Changed req.user.id to req.user.userId
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized: User not found." });
    }

    const newExam = await prisma.exam.create({
      data: {
        title,
        description,
        duration: parseInt(duration),
        totalMarks: parseInt(totalMarks),
        teacher: {
          // 👇 FIXED: Connect using userId from token
          connect: { id: req.user.userId },
        },
      },
    });

    res.status(201).json({ message: "Exam created successfully!", exam: newExam });
  } catch (err) {
    console.error("Create Exam Error:", err);
    res.status(500).json({ error: "Failed to create exam", details: err.message });
  }
};

// 2. Get All Exams for the Logged-in Teacher
exports.getTeacherExams = async (req, res) => {
  try {
    // 👇 FIXED: Use req.user.userId
    const exams = await prisma.exam.findMany({
      where: { teacherId: req.user.userId },
      orderBy: { id: "desc" },
    });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

// 3. Get All Exams (For Students)
exports.getAllExams = async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: { id: "desc" },
      include: {
        teacher: {
          select: { name: true },
        },
      },
    });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

// 4. Submit Exam & Save Result
exports.submitExam = async (req, res) => {
  try {
    console.log("📢 SUBMIT REQUEST RECEIVED");
    console.log("📦 Body:", req.body);
    console.log("👤 User:", req.user);

    const { examId, answers, tabSwitchCount } = req.body; 
    
    //  FIXED: Use req.user.userId
    const studentId = req.user.userId;

    // A. Check if student already took this exam
    const existingSubmission = await prisma.submission.findFirst({
      where: { 
        examId: parseInt(examId), 
        studentId: studentId 
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: "You have already taken this exam!" });
    }

    // B. Fetch correct answers from DB
    const questions = await prisma.question.findMany({
      where: { examId: parseInt(examId) },
    });

    let score = 0;
    let totalScore = 0;

    // C. Calculate Score
    questions.forEach((q) => {
      totalScore += q.marks;
      const userAnswer = answers[q.id];

      if (userAnswer !== undefined && userAnswer === q.correctOption) {
        score += q.marks;
      }
    });

    // D. SAVE to Database with Security Data
    const submission = await prisma.submission.create({
      data: {
        score: score,
        totalScore: totalScore,
        examId: parseInt(examId),
        studentId: studentId,
        tabSwitchCount: tabSwitchCount || 0 
      }
    });

    res.json({ 
      message: "Exam submitted successfully",
      score: score, 
      total: totalScore, 
      percentage: ((score / totalScore) * 100).toFixed(2) 
    });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
};