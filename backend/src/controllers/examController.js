const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Create Exam
exports.createExam = async (req, res) => {
  try {
    const { title, description, duration, totalMarks } = req.body;

    // Security Check: Ensure we have the user ID from the middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: User not found." });
    }

    const newExam = await prisma.exam.create({
      data: {
        title,
        description,
        // Ensure these are numbers (parseInt) to prevent database type errors
        duration: parseInt(duration),
        totalMarks: parseInt(totalMarks),
        // 👇 THIS WAS MISSING: Connect the exam to the teacher
        teacher: {
          connect: { id: req.user.id },
        },
      },
    });

    res.status(201).json({ message: "Exam created successfully!", exam: newExam });
  } catch (err) {
    console.error("Create Exam Error:", err); // Log error to terminal for debugging
    res.status(500).json({ error: "Failed to create exam", details: err.message });
  }
};

// 2. Get All Exams for the Logged-in Teacher
exports.getTeacherExams = async (req, res) => {
  try {
    // Security Check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const teacherId = req.user.id;

    const exams = await prisma.exam.findMany({
      where: { teacherId: teacherId },
      orderBy: { id: "desc" }, // Newest first
    }); 

    res.json(exams);
  } catch (err) {
    console.error("Fetch Exams Error:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

// get all exms for students 
exports.getAllExams = async (req,res)=> {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: { id : "desc"},
      include: {
        teacher : {
          select: { name : true}  // Show the teacher's name too
        }
      }
    })

    res.json(exams)
  }catch (err) {
    res.status(500).json({error: "Failed to fetch Exams"})
  } 
}

 // submit and calculate score 
 // 4. Submit Exam & Calculate Score
exports.submitExam = async (req, res) => {
  try {
    const { examId, answers } = req.body; // answers: { "55": 2, "56": 0 }
    
    // 1. Fetch all correct answers for this exam from DB
    const questions = await prisma.question.findMany({
      where: { examId: parseInt(examId) },
    });

    let score = 0;
    let totalMarks = 0;

    // 2. Loop through questions and compare
    questions.forEach((q) => {
      totalMarks += q.marks; // Track total possible marks

      const userAnswer = answers[q.id]; // Get what user selected for this question ID

      // If user answered AND it matches the correct option
      if (userAnswer !== undefined && userAnswer === q.correctOption) {
        score += q.marks;
      }
    });

    // 3. Send result back
    res.json({ 
      score, 
      totalMarks, 
      percentage: ((score / totalMarks) * 100).toFixed(2) 
    });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
};