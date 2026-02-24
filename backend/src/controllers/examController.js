const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Create Exam
exports.createExam = async (req, res) => {
  try {
    const { title, description, duration, startTime, endTime, negativeMarking, questions } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized: User not found." });
    }

    const totalMarks = parseInt(req.body.totalMarks) || questions.length;
    const qCount = questions.length;

    // Fair Marks Distribution Calculation
    const marksPerQ = Math.floor(totalMarks / qCount);
    const remainder = totalMarks % qCount;

    const newExam = await prisma.exam.create({
      data: {
        title,
        description,
        duration: parseInt(duration),
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(Date.now() + duration * 60000),
        negativeMarking: !!negativeMarking,
        totalMarks: totalMarks, // Use the actual totalMarks from teacher
        teacher: {
          connect: { id: req.user.userId }
        },
        questions: {
          create: questions.map((q, index) => ({
            type: q.type || "MCQ",
            text: q.text,
            options: q.options || [],
            correctOption: q.type === "MCQ" ? parseInt(q.correctOption) : null,
            testCases: q.type === "CODE" ? q.testCases : [],
            // Assign calculated marks, adding remainder to the last question
            marks: index === qCount - 1 ? (marksPerQ + remainder) : marksPerQ
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
        totalMarks: true,
        startTime: true,
        endTime: true
      }
    });

    if (!exam) return res.status(404).json({ error: "Exam not found" });

    // 🆕 Enforce Single Attempt
    const studentId = req.user.userId;
    const existingSubmission = await prisma.submission.findFirst({
      where: { examId: examId, studentId: studentId }
    });

    if (existingSubmission) {
      return res.status(403).json({ error: "You have already taken this exam!" });
    }

    // Enforce Time Window
    const now = new Date();
    if (now < exam.startTime) {
      return res.status(403).json({ error: `Exam hasn't started yet. Starts at ${exam.startTime.toLocaleString()}` });
    }
    if (now > exam.endTime) {
      return res.status(403).json({ error: "Exam session has ended." });
    }

    // Dynamic Duration Calculation: min(duration, timeLeft)
    const timeLeftInSeconds = Math.floor((exam.endTime - now) / 1000);
    const durationInSeconds = exam.duration * 60;
    const adjustedDurationInSeconds = Math.min(durationInSeconds, timeLeftInSeconds);

    exam.durationInSeconds = adjustedDurationInSeconds; // Send to frontend

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

    const { examId, answers, tabSwitchCount, passedCases, timeSpent } = req.body;
    const studentId = req.user.userId;

    // A. Check duplicate
    const existingSubmission = await prisma.submission.findFirst({
      where: { examId: parseInt(examId), studentId: studentId }
    });

    if (existingSubmission) {
      console.log(`⚠️ User ${studentId} already attempted Exam ${examId}`);
      return res.status(400).json({ error: "You have already taken this exam!" });
    }

    console.log("📥 Raw passedCases from Frontend:", JSON.stringify(passedCases));
    console.log("📥 Raw answers from Frontend:", JSON.stringify(answers));

    const questions = await prisma.question.findMany({
      where: { examId: parseInt(examId) },
    });

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) },
      select: { negativeMarking: true }
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
        } else if (userAnswer !== undefined && exam.negativeMarking) {
          score -= 1; // Always subtract 1 if negative marking is ON
          console.log(`❌ Q${q.id} Wrong (Negative Marking)! -1`);
        } else {
          console.log(`❌ Q${q.id} Wrong.`);
        }
      }
      // CODE Logic
      else if (q.type === "CODE") {
        const isPassed = passedCases && (passedCases[q.id] === true || passedCases[String(q.id)] === true);

        console.log(`Q${q.id} (CODE) | isPassed: ${isPassed} | passedCases key types:`, Object.keys(passedCases || {}).map(k => typeof k));

        if (isPassed) {
          score += q.marks;
          console.log(`✅ Q${q.id} (CODE) Passed! +${q.marks}`);
        } else {
          console.log(`❌ Q${q.id} (CODE) Failed.`);
        }
      }
    });

    // Final score shouldn't be negative
    if (score < 0) score = 0;

    console.log(`🏁 Final Score: ${score}/${totalScore}`);

    // C. Save
    const submission = await prisma.submission.create({
      data: {
        score: score,
        totalScore: totalScore,
        examId: parseInt(examId),
        studentId: studentId,
        tabSwitchCount: tabSwitchCount || 0,
        timeSpent: parseInt(timeSpent) || 0,
        // Store passedCases inside answers object so we can retrieve it for reviews
        answers: {
          ...answers,
          _passedCases: passedCases || {}
        }
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

    const reviewData = questions.map((q) => {
      const selectedOption = submission.answers ? submission.answers[q.id.toString()] : null;
      const passedCases = submission.answers?._passedCases || {};

      let isCorrect = false;
      if (q.type === "MCQ") {
        isCorrect = selectedOption !== null && parseInt(selectedOption) === q.correctOption;
      } else if (q.type === "CODE") {
        isCorrect = passedCases[q.id] === true || passedCases[String(q.id)] === true;
      }

      return {
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        correctOption: q.correctOption,
        testCases: q.testCases,
        selectedOption,
        isCorrect // Send the calculated status!
      };
    });

    // Format result for frontend display
    const formattedResult = {
      score: submission.score,
      totalScore: submission.totalScore, // ADDED for frontend compatibility
      totalMarks: submission.totalScore,
      percentage: submission.totalScore > 0 ? ((submission.score / submission.totalScore) * 100).toFixed(1) : 0,
      timeSpent: `${Math.floor(submission.timeSpent / 60)} min ${submission.timeSpent % 60} sec`,
      accuracy: reviewData.filter(q => q.isCorrect).length,
      totalQuestions: reviewData.length,
      percentile: 85, // Mock value as before
      rank: 12,       // Mock value as before
      reviewData: reviewData
    };

    res.json(formattedResult);
  } catch (err) {
    console.error(err);
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
      select: {
        id: true,
        title: true,
        totalMarks: true,
        teacherId: true,
        duration: true,
        startTime: true,
        endTime: true
      },
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

    // 6. Final Response
    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        attempts,
        avgScore,
        passRate: `${passCount}/${attempts}`
      },
      submissions: formattedSubmissions,
    });
  } catch (err) {
    console.error("🔥 Get Details Error:", err.message);
    res.status(500).json({ error: "Failed to fetch exam details" });
  }
};

// 11. Get Student Exam History
exports.getStudentHistory = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const submissions = await prisma.submission.findMany({
      where: { studentId },
      include: {
        exam: {
          select: {
            title: true,
            totalMarks: true,
            duration: true,
            teacher: { select: { name: true } }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    const history = submissions.map(sub => ({
      id: sub.examId, // Use examId for navigation
      submissionId: sub.id,
      title: sub.exam.title,
      teacherName: sub.exam.teacher.name,
      score: sub.score,
      totalScore: sub.totalScore,
      percentage: sub.totalScore > 0 ? ((sub.score / sub.totalScore) * 100).toFixed(2) : 0,
      completedAt: sub.completedAt,
      result: (sub.totalScore > 0 && sub.score / sub.totalScore >= 0.35) ? "PASS" : "FAIL"
    }));

    res.json(history);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ error: "Failed to fetch exam history" });
  }
};
