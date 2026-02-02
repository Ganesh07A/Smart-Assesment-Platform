const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const xlsx = require("xlsx");

// Helper to normalize keys (e.g., " Type " -> "Type")
const normalizeRow = (row) => {
  const newRow = {};
  Object.keys(row).forEach((key) => {
    newRow[key.trim()] = row[key];
  });
  return newRow;
};

exports.uploadQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { examId } = req.body;
    if (!examId) {
      return res.status(400).json({ error: "Exam ID is required" });
    }

    // 1. Read File
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // raw: false ensures all fields are strings initially to prevent type errors
    let data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (data.length === 0) {
      return res.status(400).json({ error: "Sheet is empty" });
    }

    console.log(`📂 Processing ${data.length} rows...`);
    
    // Debug: Print first row headers
    console.log("🔍 Headers found:", Object.keys(normalizeRow(data[0])));

    // 2. Map & Validate
    const questionsToInsert = data.map((rawRow, index) => {
      const row = normalizeRow(rawRow); // Fix header spaces
      const rowNum = index + 2; // Excel row number (1-based + header)

      // Get Type (Default to MCQ if empty)
      const rawType = row["Type"] ? String(row["Type"]).trim().toUpperCase() : "MCQ";
      const marks = row["Marks"] ? parseInt(row["Marks"]) : 1;
      
      const commonData = {
        examId: parseInt(examId),
        marks: marks,
      };

      // === LOGIC FOR CODE QUESTIONS ===
      if (rawType === "CODE") {
        const problemDesc = row["Problem Description"];
        const inputFmt = row["Input Format"];
        
        // Strict Check
        if (!problemDesc) {
          console.warn(`❌ Skipping Row ${rowNum} [CODE]: Missing 'Problem Description'`);
          return null;
        }

        // Parse Test Cases safely
        let parsedTestCases = [];
        try {
          if (row["Test Cases"] && row["Test Cases"] !== "") {
            // If Excel encoded quotes weirdly, fix them
            let jsonStr = String(row["Test Cases"]).replace(/""/g, '"');
            if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
              jsonStr = jsonStr.slice(1, -1);
            }
            parsedTestCases = JSON.parse(jsonStr);
          }
        } catch (e) {
          console.warn(`⚠️ Row ${rowNum}: Invalid JSON in 'Test Cases' - saving empty array.`);
        }

        return {
          ...commonData,
          questionType: "CODE",
          problemDescription: problemDesc,
          inputFormat: row["Input Format"] || "None",
          outputFormat: row["Output Format"] || "None",
          sampleInput: row["Sample Input"] ? String(row["Sample Input"]) : "",
          sampleOutput: row["Sample Output"] ? String(row["Sample Output"]) : "",
          testCases: parsedTestCases,
          maxMarks: marks
        };
      } 
      
      // === LOGIC FOR MCQ QUESTIONS ===
      else {
        const qText = row["Question"];
        const optA = row["Option 1"];
        
        if (!qText || !optA) {
          console.warn(`❌ Skipping Row ${rowNum} [MCQ]: Missing 'Question' or 'Option 1'`);
          return null;
        }

        // Handle Correct Option (allows "Option B", "2", or 2)
        let correctVal = row["Correct Option Number"];
        let correctIndex = 0;
        
        if (correctVal) {
           const valStr = String(correctVal).trim().toLowerCase();
           if (valStr.includes("option a") || valStr === "1") correctIndex = 0;
           else if (valStr.includes("option b") || valStr === "2") correctIndex = 1;
           else if (valStr.includes("option c") || valStr === "3") correctIndex = 2;
           else if (valStr.includes("option d") || valStr === "4") correctIndex = 3;
           else correctIndex = parseInt(correctVal) - 1 || 0;
        }

        return {
          ...commonData,
          questionType: "MCQ",
          text: qText,
          options: [
            String(row["Option 1"] || ""),
            String(row["Option 2"] || ""),
            String(row["Option 3"] || ""),
            String(row["Option 4"] || "")
          ].filter(o => o !== ""),
          correctOption: correctIndex,
        };
      }
    }).filter(q => q !== null);

    // 3. Final Check before DB Insert
    if (questionsToInsert.length === 0) {
      console.error("❌ No valid questions passed validation.");
      return res.status(400).json({ 
        error: "No valid questions found in file.", 
        details: "Check server console for row-by-row validation errors." 
      });
    }

    console.log(`✅ Ready to insert ${questionsToInsert.length} questions.`);

    // 4. Save to Database
    const result = await prisma.question.createMany({
      data: questionsToInsert,
    });

    res.status(201).json({ 
      message: "Questions uploaded successfully!", 
      count: result.count,
    });

  } catch (error) {
    console.error("🔥 Upload Error:", error);
    res.status(500).json({ error: "Failed to upload questions", details: error.message });
  }
};

// ==========================================
// 2. GET ALL QUESTIONS (Used by ExamView)
// ==========================================
exports.getAllQuestions = async (req, res) => {
  try {
    const { examId } = req.params;

    const questions = await prisma.question.findMany({
      where: { examId: parseInt(examId) },
      select: {
        id: true,
        questionType: true,
        text: true, options: true, marks: true, // MCQ
        problemDescription: true, inputFormat: true, outputFormat: true, // CODE
        sampleInput: true, sampleOutput: true, maxMarks: true
      },
    });

    if (!questions.length) {
      return res.status(404).json({ error: "No questions found" });
    }

    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};