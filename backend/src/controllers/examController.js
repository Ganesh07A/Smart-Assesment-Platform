const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Create Exam
exports.createExam = async (req, res) => {
  try {
    // 1. Get questions array from the request
    const { title, description, duration, questions } = req.body;

    // 2. Security Check
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized: User not found." });
    }

    // 3. Auto-Calculate Total Marks (1 question = 1 mark)
    // If no questions are sent, default to 0
    const calculatedTotalMarks = questions ? questions.length : 0;

    // 4. Create Exam AND Questions in one go
    const newExam = await prisma.exam.create({
      data: {
        title,
        description,
        duration: parseInt(duration),
        totalMarks: calculatedTotalMarks, // <--- Auto-calculated
        teacher: { 
            connect: { id: req.user.userId } // <--- Your auth fix
        },
        // 👇 CRITICAL: This saves the questions!
        questions: {
          create: questions.map((q) => ({
            text: q.text,
            options: q.options,
            correctOption: parseInt(q.correctOption),
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
// 3. Get All Exams (Smart Version: Checks for Attempts)
exports.getAllExams = async (req, res) => {
  try {
    // 1. Get the current student's ID
    const studentId = req.user.userId;

    // 2. Fetch all exams
    const exams = await prisma.exam.findMany({
      orderBy: { id: "desc" },
      include: {
        teacher: { select: { name: true } },
      },
    });

    // 3. Fetch ONLY this student's submissions
    const submissions = await prisma.submission.findMany({
      where: { studentId: studentId },
    });

    // 4. Merge the data! Add "isAttempted" flag to each exam
    const examsWithStatus = exams.map((exam) => {
      const submission = submissions.find((sub) => sub.examId === exam.id);
      return {
        ...exam,
        isAttempted: !!submission, // true if found, false if not
        score: submission ? submission.score : null, // Send score if they did it
        totalScore: submission ? submission.totalScore : null
      };
    });

    res.json(examsWithStatus);
  } catch (err) {
    console.error("Fetch Exams Error:", err);
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
        tabSwitchCount: tabSwitchCount || 0 ,
        answers: answers
      }
    });

    res.json({ 
      message: "Exam submitted successfully",
      submissionId: submission.id,
      score: score, 
      total: totalScore, 
      percentage: ((score / totalScore) * 100).toFixed(2) 
    });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
};
// 5. Get Teacher Dashboard Stats (Live)
exports.getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user.userId;

    // A. Count Total Exams Created by this Teacher
    const totalExams = await prisma.exam.count({
      where: { teacherId: teacherId }
    });

    // B. Find Recent Submissions for this Teacher's Exams
    // We join tables to get Student Name and Exam Title
    const recentSubmissions = await prisma.submission.findMany({
      where: { 
        exam: { teacherId: teacherId } 
      },
      orderBy: { completedAt: 'desc' }, // Newest first
      take: 5, // Show last 5 activities
      include: {
        student: { select: { name: true, email: true } },
        exam: { select: { title: true } }
      }
    });

    // C. Calculate Total Students (Unique students who took exams)
    const uniqueStudents = await prisma.submission.groupBy({
      by: ['studentId'],
      where: { exam: { teacherId: teacherId } },
    });

    res.json({
      totalExams,
      totalStudents: uniqueStudents.length,
      recentActivity: recentSubmissions
    });

  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// 6. Get Detailed Exam Report (For Student Review)
// 6. Get Detailed Exam Report (For Student Review)
exports.getExamReview = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.userId;

    // 1. Find submission
    const submission = await prisma.submission.findFirst({
      where: {
        examId: parseInt(examId),
        studentId: studentId
      }
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found." });
    }

    // 2. Fetch questions
    const questions = await prisma.question.findMany({
      where: { examId: parseInt(examId) },
      select: {
        id: true,
        text: true,
        options: true,
        correctOption: true
      }
    });

    // 3. Attach selectedOption WITHOUT touching correctOption
    const reviewData = questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correctOption: q.correctOption,
      selectedOption: submission.answers
        ? submission.answers[q.id.toString()]
        : null
    }));

    res.json({
      examTitle: "Exam Review",
      score: submission.score,
      totalScore: submission.totalScore,
      reviewData
    });

  } catch (err) {
    console.error("Review Error:", err);
    res.status(500).json({ error: "Failed to load review" });
  }
};

// Delete Exam (Teacher Only)
exports.deleteExam = async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const teacherId = req.user.userId;

    // 1. Check if exam exists & belongs to this teacher
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { teacherId: true }
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    if (exam.teacherId !== teacherId) {
      return res.status(403).json({ error: "Unauthorized action" });
    }

    // 2. DELETE EXAM (cascade will handle questions & submissions)
    await prisma.exam.delete({
      where: { id: examId }
    });

    res.json({ message: "Exam deleted successfully" });

  } catch (err) {
    console.error("Delete Exam Error:", err);
    res.status(500).json({ error: "Failed to delete exam" });
  }
};
