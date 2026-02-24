import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Plus,
  Trash2,
  Code,
  List,
  FileSpreadsheet,
  Clock,
  Award,
  Percent,
  UploadCloud,
  Download,
  Info,
  Send,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Sigma
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

export default function CreateExam() {
  const navigate = useNavigate();

  const [examData, setExamData] = useState({
    title: "",
    description: "",
    duration: 30,
    totalMarks: 100,
    passingScore: 40,
    startTime: "",
    endTime: "",
    negativeMarking: false
  });

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

  // Calculate dynamic stats
  const mcqCount = questions.filter(q => q.type === "MCQ").length;
  const codingCount = questions.filter(q => q.type === "CODE").length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        {/* Header & Basic Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-2 bg-blue-600 w-full"></div>
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">Create New Exam</h2>
              <p className="text-slate-500 text-sm">Fill in the core details of the assessment below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Exam Name</label>
                <input
                  name="title"
                  value={examData.title}
                  onChange={handleExamChange}
                  className="w-full h-12 px-4 rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none border"
                  placeholder="e.g. Advanced Data Structures Midterm"
                  type="text"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <input
                  name="description"
                  value={examData.description}
                  onChange={handleExamChange}
                  className="w-full h-12 px-4 rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none border"
                  placeholder="Brief description of the exam content"
                  type="text"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (minutes)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                  <input
                    name="duration"
                    value={examData.duration}
                    onChange={handleExamChange}
                    className="w-full h-12 pl-10 pr-4 rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none border"
                    placeholder="60"
                    type="number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Total Marks</label>
                <div className="relative">
                  <Award className="absolute left-3 top-3.5 text-slate-400" size={20} />
                  <input
                    name="totalMarks"
                    value={examData.totalMarks}
                    onChange={handleExamChange}
                    className="w-full h-12 pl-10 pr-4 rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none border"
                    placeholder="100"
                    type="number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Passing Score (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-3.5 text-slate-400" size={20} />
                  <input
                    name="passingScore"
                    value={examData.passingScore}
                    onChange={handleExamChange}
                    className="w-full h-12 pl-10 pr-4 rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none border"
                    placeholder="40"
                    type="number"
                  />
                </div>
              </div>

              {/* 🆕 Scheduled Window & Negative Marking */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 text-blue-600">Start Time</label>
                  <input
                    name="startTime"
                    type="datetime-local"
                    value={examData.startTime}
                    onChange={handleExamChange}
                    className="w-full h-12 px-4 rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 text-red-600">End Time</label>
                  <input
                    name="endTime"
                    type="datetime-local"
                    value={examData.endTime}
                    onChange={handleExamChange}
                    className="w-full h-12 px-4 rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none border"
                  />
                </div>
              </div>

              <div className="md:col-span-3 flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-6">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">Negative Marking</h4>
                  <p className="text-xs text-slate-500">Enable to deduct 1 mark for each incorrect MCQ answer.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExamData({ ...examData, negativeMarking: !examData.negativeMarking })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${examData.negativeMarking ? 'bg-red-500' : 'bg-slate-300'}`}
                >
                  <span
                    className={`${examData.negativeMarking ? 'translate-x-6' : 'translate-x-1'} inline-block h-5 w-5 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Upload Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="text-blue-600" size={24} />
            <h3 className="text-lg font-bold text-s
            late-900">Bulk Upload Questions</h3>
          </div>

          <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="text-blue-600" size={28} />
            </div>
            <p className="text-slate-900 font-semibold mb-1">Drag & Drop your CSV/XLSX here</p>
            <p className="text-slate-500 text-xs mb-4 text-center max-w-xs">Supports up to 500 questions per upload. Make sure to follow the platform template.</p>
            <span className="text-sm text-blue-600 font-bold hover:underline">or Browse Files</span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <Info className="text-blue-600" size={20} />
              <p className="text-sm text-slate-600 leading-tight">Need help with the format? Download our sample template.</p>
            </div>
            <button className="whitespace-nowrap flex items-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors">
              <Download size={18} />
              Download Template
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-6 relative border-l-4 border-l-blue-600">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  Question {qIndex + 1}
                </span>
                <div className="flex items-center">
                  {/* Type Toggle per Question */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl mr-4">
                    <button
                      onClick={() => handleQuestionChange(qIndex, "type", "MCQ")}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${q.type === "MCQ" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <List size={18} /> MCQ
                    </button>
                    <button
                      onClick={() => handleQuestionChange(qIndex, "type", "CODE")}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${q.type === "CODE" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <Code size={18} /> Coding
                    </button>
                  </div>
                  <button onClick={() => removeQuestion(qIndex)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Question Text</label>
                  <textarea
                    value={q.text}
                    onChange={(e) => handleQuestionChange(qIndex, "text", e.target.value)}
                    className="w-full rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all p-4 min-h-[100px] outline-none border"
                    placeholder={q.type === "MCQ" ? "Enter your question here..." : "Enter problem statement..."}
                  />
                </div>

                {/* MCQ Options */}
                {q.type === "MCQ" ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">Options (Select the correct answer)</label>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-3 group">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctOption === oIndex}
                          onChange={() => handleQuestionChange(qIndex, "correctOption", oIndex)}
                          className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className={`flex-1 relative ${q.correctOption === oIndex ? "z-10" : ""}`}>
                          <span className={`absolute left-3 top-2.5 text-xs font-bold ${q.correctOption === oIndex ? "text-blue-600" : "text-slate-400"}`}>
                            {String.fromCharCode(65 + oIndex)}
                          </span>
                          <input
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            className={`w-full pl-8 pr-4 py-2 rounded-lg border focus:ring-2 transition-all outline-none ${q.correctOption === oIndex
                              ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20"
                              : "border-gray-200 bg-white focus:border-blue-600 focus:ring-blue-500/20"
                              }`}
                            placeholder={`Enter option text`}
                            type="text"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Coding Test Cases */
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-4 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <span>Test Cases (Input / Expected Output)</span>
                      <button onClick={() => addTestCase(qIndex)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                        <Plus size={14} /> Add Case
                      </button>
                    </div>

                    <div className="space-y-3">
                      {q.testCases.map((tc, tIndex) => (
                        <div key={tIndex} className="flex gap-3">
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] text-slate-500 font-mono">Input</span>
                            <input
                              value={tc.input}
                              onChange={(e) => handleTestCaseChange(qIndex, tIndex, "input", e.target.value)}
                              className="w-full p-2.5 rounded bg-slate-800 border border-slate-700 text-white text-sm font-mono placeholder-slate-600 outline-none focus:border-blue-500 transition-colors"
                              placeholder="e.g. 1 5"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] text-slate-500 font-mono">Expected Output</span>
                            <input
                              value={tc.output}
                              onChange={(e) => handleTestCaseChange(qIndex, tIndex, "output", e.target.value)}
                              className="w-full p-2.5 rounded bg-slate-800 border border-slate-700 text-white text-sm font-mono placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                              placeholder="e.g. 6"
                            />
                          </div>
                          <button onClick={() => removeTestCase(qIndex, tIndex)} className="text-slate-500 hover:text-red-400 self-end p-2.5 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-4 flex items-center gap-2">
                      <Info size={14} />
                      Students' code will be validated against these test cases.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex gap-3">
                    <button className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                      <ImageIcon size={16} /> Add Image
                    </button>
                    <button className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                      <Sigma size={16} /> Add Formula
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500">Points:</label>
                    <input
                      type="number"
                      value={q.marks}
                      onChange={(e) => handleQuestionChange(qIndex, "marks", e.target.value)}
                      className="w-16 h-8 text-xs rounded border border-gray-200 text-center focus:border-blue-600 outline-none transition-colors"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <div className="flex justify-center py-4">
          <button
            onClick={addQuestion}
            className="group flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-gray-300 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-all font-semibold"
          >
            <Plus className="group-hover:rotate-90 transition-transform" size={20} />
            Add Another Question
          </button>
        </div>

        {/* Bottom Action Bar (Fixed) */}
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4 md:px-0 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Draft
                  </div>
                  <span className="text-slate-400 text-[10px]">Unsaved changes</span>
                </div>
                <div className="h-8 w-[1px] bg-slate-100 hidden sm:block"></div>
                <div className="hidden md:flex flex-col">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Summary</span>
                  <span className="text-sm font-bold">{mcqCount} MCQ • {codingCount} Coding</span>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-gray-100 transition-colors">
                  Save Draft
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Publish Exam
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}