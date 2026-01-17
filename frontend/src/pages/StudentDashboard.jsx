import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Student";

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/exams/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExams(res.data);
        setLoading(false);
      } catch (err) {
        alert("Failed to fetch exams");
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  if (loading) return <div className="text-center mt-20 text-gray-500">Loading your dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-800">Welcome back, {userName}! 👋</h1>
            <p className="text-gray-500 mt-2">Here are your assigned exams. Good luck!</p>
        </div>

        {/* Exam Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.length === 0 ? (
            <p className="text-gray-500">No exams available at the moment.</p>
          ) : (
            exams.map((exam) => (
              <div 
                key={exam.id} 
                className={`relative bg-white p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md ${exam.isAttempted ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}
              >
                
                {/* 🏷️ STATUS BADGE */}
                <div className="absolute top-4 right-4">
                    {exam.isAttempted ? (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            ✅ Completed
                        </span>
                    ) : (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            ⏳ Pending
                        </span>
                    )}
                </div>

                {/* Exam Content */}
                <div className="mb-4 pr-10"> {/* Padding right for badge */}
                    <h3 className="text-xl font-bold text-gray-800 truncate" title={exam.title}>{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">By: {exam.teacher?.name || "Unknown"}</p>
                </div>
                
                <p className="text-gray-600 text-sm mb-6 line-clamp-2 h-10">
                    {exam.description || "No description provided."}
                </p>

                {/* Stats Row */}
                <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                        ⏱️ <span className="font-semibold">{exam.duration} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                        🏆 <span className="font-semibold">{exam.totalMarks} Marks</span>
                    </div>
                </div>

                {/* Action Button */}
                {exam.isAttempted ? (
                    <button 
                        disabled 
                        className="w-full py-3 bg-gray-200 text-gray-500 font-bold rounded-xl cursor-not-allowed"
                    >
                        Score: {exam.score}/{exam.totalScore}
                    </button>
                ) : (
                    <button
                        onClick={() => navigate(`/take-exam/${exam.id}`)}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
                    >
                        Start Exam →
                    </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}