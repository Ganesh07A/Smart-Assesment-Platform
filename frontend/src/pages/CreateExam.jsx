import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Papa from "papaparse"; 
import * as XLSX from "xlsx"; // <--- 1. Import Excel Library
import Navbar from "../components/Navbar";

export default function CreateExam() {
  const navigate = useNavigate();
  
  const [examData, setExamData] = useState({
    title: "",
    description: "",
    duration: 30,
  });

  const [questions, setQuestions] = useState([
    { text: "", options: ["", "", "", ""], correctOption: 0 },
  ]);

  // --- HANDLERS ---
  const handleExamChange = (e) => {
    setExamData({ ...examData, [e.target.name]: e.target.value });
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctOption: 0 }]);
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  // --- 🧠 SHARED IMPORT LOGIC (Works for CSV & Excel) ---
  // inside CreateExam.jsx

  // --- 🧠 FIXED IMPORT LOGIC (Trims spaces & handles case sensitivity) ---
  const processImportedData = (jsonData) => {
    try {
      let validCount = 0;
      const importedQuestions = jsonData.map((row) => {
          // 1. Normalize Keys (Handle "question", "Question", "QUESTION")
          const getVal = (key) => {
             const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
             return foundKey ? row[foundKey] : null;
          };

          const qText = getVal("question");
          const optA = getVal("option a");
          const optB = getVal("option b");
          const optC = getVal("option c");
          const optD = getVal("option d");
          const correctRaw = getVal("correct option"); // e.g., "Option B "

          if (!qText || !optA) return null;

          // 2. Clean the "Correct Option" string
          // Removes spaces and makes it lowercase: " Option B " -> "option b"
          const cleanCorrect = correctRaw ? correctRaw.toString().trim().toLowerCase() : "";

          // 3. Precise Mapping
          let correctIndex = 0; // Default
          
          if (cleanCorrect === "option a" || cleanCorrect === "a" || cleanCorrect === "1") correctIndex = 0;
          else if (cleanCorrect === "option b" || cleanCorrect === "b" || cleanCorrect === "2") correctIndex = 1;
          else if (cleanCorrect === "option c" || cleanCorrect === "c" || cleanCorrect === "3") correctIndex = 2;
          else if (cleanCorrect === "option d" || cleanCorrect === "d" || cleanCorrect === "4") correctIndex = 3;
          else {
             // 🚨 Alert if the correct option is weird
             console.warn(`Could not match correct option for: ${qText}. Defaulting to A.`);
          }

          validCount++;

          return {
            text: qText,
            options: [
              optA.toString(), 
              optB ? optB.toString() : "", 
              optC ? optC.toString() : "", 
              optD ? optD.toString() : ""
            ],
            correctOption: correctIndex
          };
      }).filter(q => q !== null);

      if (importedQuestions.length === 0) {
        toast.error("No valid questions found.");
        return;
      }

      setQuestions((prev) => [...prev, ...importedQuestions]);
      toast.success(`Loaded ${validCount} questions successfully!`);
      
    } catch (err) {
      console.error(err);
      toast.error("Error processing file data");
    }
  };

  // --- 📂 FILE UPLOAD HANDLER ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    // A. Handle CSV Files
    if (fileExtension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processImportedData(results.data),
        error: () => toast.error("Failed to parse CSV"),
      });
    } 
    // B. Handle Excel Files (.xlsx, .xls)
    else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        
        // Grab first sheet
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(ws);
        processImportedData(data);
      };
      reader.readAsBinaryString(file);
    } 
    else {
      toast.error("Invalid file type. Please upload CSV or Excel.");
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!examData.title || !examData.description) {
         return toast.error("Please fill in exam details");
      }

      await axios.post("http://localhost:5000/api/exams/create", {
        ...examData,
        questions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Exam Created Successfully!");
      navigate("/teacher-dashboard");
    } catch (err) {
      toast.error("Failed to create exam");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Create New Exam</h1>
                <p className="text-gray-500 mt-2">Set up details and add questions.</p>
            </div>
            
            {/* 📤 UNIVERSAL UPLOAD BUTTON */}
            <div className="relative">
                <input 
                    type="file" 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-md flex items-center gap-2 transition active:scale-95">
                    📊 Import CSV / Excel
                </button>
            </div>
        </div>

        {/* Exam Details Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Exam Title</label>
                <input name="title" onChange={handleExamChange} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Mid-Term Physics" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <input name="description" onChange={handleExamChange} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Chapters 1-3" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Duration (Mins)</label>
                    <input type="number" name="duration" value={examData.duration} onChange={handleExamChange} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
            {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group">
                    <div className="absolute top-4 right-4">
                        <button onClick={() => removeQuestion(qIndex)} className="text-gray-300 hover:text-red-500 transition">🗑️</button>
                    </div>
                    
                    <h3 className="font-bold text-gray-400 text-sm mb-3 uppercase">Question {qIndex + 1}</h3>
                    
                    <input 
                        value={q.text}
                        onChange={(e) => handleQuestionChange(qIndex, "text", e.target.value)}
                        className="w-full p-3 border rounded-lg mb-4 font-medium outline-none focus:border-blue-500" 
                        placeholder="Enter question text here..."
                    />

                    <div className="grid grid-cols-2 gap-4">
                        {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className={`flex items-center gap-2 p-2 rounded-lg border ${q.correctOption === oIndex ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
                                <input 
                                    type="radio" 
                                    name={`correct-${qIndex}`} 
                                    checked={q.correctOption === oIndex}
                                    onChange={() => handleQuestionChange(qIndex, "correctOption", oIndex)}
                                    className="accent-green-600 w-5 h-5 cursor-pointer"
                                />
                                <input 
                                    value={opt}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                    className="w-full bg-transparent outline-none text-sm" 
                                    placeholder={`Option ${oIndex + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 mt-8 pb-10">
            <button onClick={addQuestion} className="flex-1 py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition">
                + Add Manually
            </button>
            <button onClick={handleSubmit} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition transform hover:-translate-y-1">
                🚀 Publish Exam
            </button>
        </div>

      </div>
    </div>
  );
}