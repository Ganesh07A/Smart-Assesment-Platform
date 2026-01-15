import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function CreateExam() {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState(1); // 1 = Details, 2 = Upload
  const [examId, setExamId] = useState(null);
  const [file, setFile] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    totalMarks: 100,
  });

  // --- HANDLERS ---
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Function 1: Create the Exam (Metadata)
  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You are not logged in!");
        navigate("/");
        return;
      }

      const res = await axios.post("http://localhost:5000/api/exams/create", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Success: Save ID and move to next step
      setExamId(res.data.exam.id);
      setStep(2);
      alert("Exam Details Saved! Now upload questions.");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  // Function 2: Upload the Excel File
  const handleUploadQuestions = async () => {
    if (!file) return alert("Please select a file first!");
    if (!examId) return alert("Error: No exam ID found. Please create exam first.");

    try {
      const token = localStorage.getItem("token");
      
      // Create the Form Data envelope
      const data = new FormData();
      data.append("file", file);
      data.append("examId", examId);

      await axios.post("http://localhost:5000/api/questions/upload", data, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Questions Uploaded Successfully!");
      navigate("/teacher-dashboard");
    } catch (err) {
      console.error(err);
      alert("Upload Failed: " + (err.response?.data?.error || err.message));
    }
  };

  // --- RENDER (JSX) ---
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Progress Steps */}
        <div className="flex items-center mb-8 text-sm font-medium text-gray-500">
          <span className={step === 1 ? "text-blue-600 font-bold" : ""}>1. Exam Details</span>
          <span className="mx-2">→</span>
          <span className={step === 2 ? "text-blue-600 font-bold" : ""}>2. Upload Questions</span>
        </div>

        {/* STEP 1: Exam Form */}
        {step === 1 && (
          <form onSubmit={handleCreateExam} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Create New Exam</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
              <input 
                type="text" 
                name="title" 
                required 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={handleChange} 
                placeholder="e.g., Final Semester Exam"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                name="description" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={handleChange} 
                placeholder="Instructions..."
              />
            </div>

             <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Mins)</label>
                   <input 
                     type="number" 
                     name="duration" 
                     defaultValue={60} 
                     className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                     onChange={handleChange} 
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                   <input 
                     type="number" 
                     name="totalMarks" 
                     defaultValue={100} 
                     className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                     onChange={handleChange} 
                   />
                </div>
             </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                Save & Next
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: File Upload */}
        {step === 2 && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800">Upload Question Bank</h2>
            <p className="text-gray-500">Upload the Excel (.xlsx) file containing your questions.</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="pointer-events-none">
                <p className="text-blue-600 font-medium">
                  {file ? file.name : "Click to select file"}
                </p>
                <p className="text-xs text-gray-400 mt-1">Supported formats: .xlsx, .xls</p>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button 
                onClick={handleUploadQuestions} 
                className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
              >
                Upload & Finish
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}