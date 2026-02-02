import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Papa from "papaparse"; 
import * as XLSX from "xlsx"; 
import { Plus, Trash2, Code, List, FileSpreadsheet } from "lucide-react"; 

export default function CreateExam() {
  const navigate = useNavigate();
  
  const [examData, setExamData] = useState({
    title: "",
    description: "",
    duration: 30,
  });

  // 🏗️ UPDATED: Question Structure includes 'type' and 'testCases'
  const [questions, setQuestions] = useState([
    { 
      type: "MCQ", // Default
      text: "", 
      options: ["", "", "", ""], 
      correctOption: 0,
      marks: 1,
      testCases: [{ input: "", output: "" }] // For Coding Qs
    },
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

  // 🆕 Handle Test Case Changes (Input/Output)
  const handleTestCaseChange = (qIndex, tIndex, field, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].testCases[tIndex][field] = value;
    setQuestions(newQuestions);
  };

  const addTestCase = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].testCases.push({ input: "", output: "" });
    setQuestions(newQuestions);
  };

  const removeTestCase = (qIndex, tIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].testCases = newQuestions[qIndex].testCases.filter((_, i) => i !== tIndex);
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions, 
      { 
        type: "MCQ", 
        text: "", 
        options: ["", "", "", ""], 
        correctOption: 0, 
        marks: 1,
        testCases: [{ input: "", output: "" }] 
      }
    ]);
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  // --- 📂 FILE UPLOAD HANDLER (Kept existing logic for MCQs) ---
  const processImportedData = (jsonData) => {
    try {
      let validCount = 0;
      const importedQuestions = jsonData.map((row) => {
          const getVal = (key) => {
             const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
             return foundKey ? row[foundKey] : null;
          };

          const qText = getVal("question");
          const optA = getVal("option a");
          const optB = getVal("option b");
          const optC = getVal("option c");
          const optD = getVal("option d");
          const correctRaw = getVal("correct option");

          if (!qText || !optA) return null;

          const cleanCorrect = correctRaw ? correctRaw.toString().trim().toLowerCase() : "";
          let correctIndex = 0;
          
          if (cleanCorrect === "option a" || cleanCorrect === "a" || cleanCorrect === "1") correctIndex = 0;
          else if (cleanCorrect === "option b" || cleanCorrect === "b" || cleanCorrect === "2") correctIndex = 1;
          else if (cleanCorrect === "option c" || cleanCorrect === "c" || cleanCorrect === "3") correctIndex = 2;
          else if (cleanCorrect === "option d" || cleanCorrect === "d" || cleanCorrect === "4") correctIndex = 3;

          validCount++;

          return {
            type: "MCQ", // Excel import defaults to MCQ
            text: qText,
            options: [
              optA.toString(), 
              optB ? optB.toString() : "", 
              optC ? optC.toString() : "", 
              optD ? optD.toString() : ""
            ],
            correctOption: correctIndex,
            marks: 1,
            testCases: []
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processImportedData(results.data),
        error: () => toast.error("Failed to parse CSV"),
      });
    } 
    else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
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

      // Filter out empty options if needed, but basic validation is:
      const formattedQuestions = questions.map(q => ({
        ...q,
        marks: parseInt(q.marks) || 1
      }));

      await axios.post("http://localhost:5000/api/exams/create", {
        ...examData,
        questions: formattedQuestions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Exam Created Successfully!");
      navigate("/teacher-dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create exam");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      <div className="max-w-4xl mx-auto p-6">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Create New Exam</h1>
                <p className="text-gray-500 mt-2">Set up details and add questions.</p>
            </div>
            
            <div className="relative">
                <input 
                    type="file" 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-md flex items-center gap-2 transition active:scale-95">
                    <FileSpreadsheet size={18} /> Import CSV / Excel
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
                <div key={qIndex} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => removeQuestion(qIndex)} className="text-gray-300 hover:text-red-500 transition p-2">
                            <Trash2 size={20} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                        <span className="font-bold text-gray-400 text-sm uppercase">Q{qIndex + 1}</span>
                        
                        {/* 🆕 TYPE SELECTOR */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => handleQuestionChange(qIndex, "type", "MCQ")}
                                className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-2 transition ${q.type === "MCQ" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                            >
                                <List size={14} /> Multiple Choice
                            </button>
                            <button 
                                onClick={() => handleQuestionChange(qIndex, "type", "CODE")}
                                className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-2 transition ${q.type === "CODE" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500"}`}
                            >
                                <Code size={14} /> Coding Challenge
                            </button>
                        </div>

                        {/* Marks Input */}
                        <div className="flex items-center gap-2 ml-auto mr-12">
                           <label className="text-xs font-bold text-gray-500">Marks:</label>
                           <input 
                              type="number" 
                              value={q.marks} 
                              onChange={(e) => handleQuestionChange(qIndex, "marks", e.target.value)}
                              className="w-16 p-1 border rounded text-center text-sm"
                              min="1"
                           />
                        </div>
                    </div>
                    
                    <input 
                        value={q.text}
                        onChange={(e) => handleQuestionChange(qIndex, "text", e.target.value)}
                        className="w-full p-3 border rounded-lg mb-4 font-medium outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition" 
                        placeholder={q.type === "MCQ" ? "Enter question text..." : "Enter problem statement..."}
                    />

                    {/* --- CONDITIONAL UI: MCQ vs CODE --- */}
                    {q.type === "MCQ" ? (
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
                    ) : (
                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                            <div className="flex justify-between items-center mb-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                <span>Test Cases (Input / Expected Output)</span>
                                <button onClick={() => addTestCase(qIndex)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    <Plus size={14} /> Add Case
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {q.testCases.map((tc, tIndex) => (
                                    <div key={tIndex} className="flex gap-2">
                                        <input 
                                            value={tc.input}
                                            onChange={(e) => handleTestCaseChange(qIndex, tIndex, "input", e.target.value)}
                                            className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm font-mono placeholder-gray-600 outline-none focus:border-blue-500"
                                            placeholder="Input (e.g. 1 5)"
                                        />
                                        <input 
                                            value={tc.output}
                                            onChange={(e) => handleTestCaseChange(qIndex, tIndex, "output", e.target.value)}
                                            className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm font-mono placeholder-gray-600 outline-none focus:border-green-500"
                                            placeholder="Expected Output (e.g. 6)"
                                        />
                                        <button onClick={() => removeTestCase(qIndex, tIndex)} className="text-gray-500 hover:text-red-400 p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                * Students' code will be run against these inputs. If their output matches exactly, they get marks.
                            </p>
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 mt-8 pb-10">
            <button onClick={addQuestion} className="flex-1 py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                <Plus size={20} /> Add Question
            </button>
            <button onClick={handleSubmit} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition transform hover:-translate-y-1">
                🚀 Publish Exam
            </button>
        </div>

      </div>
    </div>
  );
}