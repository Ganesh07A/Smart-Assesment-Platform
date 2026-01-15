const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const xlsx = require("xlsx");

exports.uploadQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { examId } = req.body;
    if (!examId) {
      return res.status(400).json({ error: "Exam ID is required" });
    }

    // 1. Read the Excel File
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ error: "Sheet is empty" });
    }

    // 2. Map the data based on your specific Excel columns
    const questionsToInsert = data.map((row, index) => {
      // Map 'Option 1' -> optA, 'Option 2' -> optB, etc.
      const qText = row["Question"];
      const optA = row["Option 1"];
      const optB = row["Option 2"];
      const optC = row["Option 3"];
      const optD = row["Option 4"];
      
      // Handle Correct Option: Excel has 1-4, DB needs 0-3
      let correctVal = row["Correct Option Number"];
      // If correctVal is "2", we want index 1.
      const correctIndex = correctVal ? parseInt(correctVal) - 1 : 0; 
      
      const marks = row["Marks"] || 1;

      // Validation: If main fields are missing, skip this row
      if (!qText || optA === undefined || optB === undefined) {
        console.warn(`⚠️ Skipping Row ${index + 1}: Missing data`, row);
        return null;
      }

      return {
        examId: parseInt(examId),
        text: qText,
        options: [optA, optB, optC, optD].filter((opt) => opt !== undefined),
        correctOption: correctIndex, 
        marks: parseInt(marks),
      };
    }).filter(q => q !== null); // Remove null rows

    // 3. Save to Database
    const result = await prisma.question.createMany({
      data: questionsToInsert,
    });

    res.status(201).json({ 
      message: "Questions uploaded successfully!", 
      count: result.count,
      skipped: data.length - result.count 
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Failed to upload questions", details: error.message });
  }
};

// get exam Questions for students without correct ands 

exports.getAllQuestions = async (req,res) => {
    try {
        const { examId }  =req.params;
        const questions = await prisma.question.findMany({
        where:{examId: parseInt(examId)},
        select: {
            id:true,
            text: true,
            options: true,
            marks: true,
        }})

        if(!questions || questions.length == 0) {
            return res.status(201).json({ error: "No questions found for this exam"})
        }
        res.json(questions)
    }catch (err) {
        res.status(500).json({error:"failed to fetch questions !", })
    }
}