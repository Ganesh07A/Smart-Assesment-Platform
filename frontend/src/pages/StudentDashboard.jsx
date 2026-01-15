import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/exams/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExams(res.data);
      } catch (err) {
        console.error("Error fetching exams:", err);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-6xl mx-auto mt-10 p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Dashboard</h1>
        <p className="text-gray-500 mb-8">Available exams for you to take.</p>

        {exams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-400 text-lg">No active exams found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">By {exam.teacher?.name || "Instructor"}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                    {exam.duration} Mins
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                  {exam.description || "No description provided."}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-sm font-medium text-gray-500">
                    Marks: {exam.totalMarks}
                  </span>
                  <button 
                    onClick={() => navigate(`/take-exam/${exam.id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                  >
                    Start Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}