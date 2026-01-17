import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    totalStudents: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Teacher";

  // Function to fetch data
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/exams/teacher/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load dashboard stats");
    }
  };

  useEffect(() => {
    // 1. Initial Fetch
    fetchStats();

    // 2. Set up "Live" Polling (Refresh every 5 seconds)
    const interval = setInterval(fetchStats, 5000);

    // Cleanup when leaving page
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Hello, {userName} 👋</h1>
                <p className="text-gray-500 mt-1">Here is what's happening in your classes.</p>
            </div>
            <button 
                onClick={() => navigate("/create-exam")}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition transform hover:-translate-y-1"
            >
                + Create New Exam
            </button>
        </div>

        {/* 📊 STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-xl text-2xl">📚</div>
                <div>
                    <p className="text-gray-500 text-sm font-bold uppercase">Total Exams</p>
                    <h3 className="text-3xl font-bold text-gray-800">{stats.totalExams}</h3>
                </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-4 bg-green-50 text-green-600 rounded-xl text-2xl">👥</div>
                <div>
                    <p className="text-gray-500 text-sm font-bold uppercase">Students Active</p>
                    <h3 className="text-3xl font-bold text-gray-800">{stats.totalStudents}</h3>
                </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-4 bg-purple-50 text-purple-600 rounded-xl text-2xl">⚡</div>
                <div>
                    <p className="text-gray-500 text-sm font-bold uppercase">System Status</p>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        <h3 className="text-lg font-bold text-gray-800">Live</h3>
                    </div>
                </div>
            </div>
        </div>

        {/* 🔴 LIVE ACTIVITY FEED */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Recent Activity</h3>
                <span className="text-xs font-mono text-gray-400">Auto-refreshing...</span>
            </div>
            
            <div className="divide-y divide-gray-50">
                {stats.recentActivity.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No activity yet. Share an exam link!</div>
                ) : (
                    stats.recentActivity.map((sub, idx) => (
                        <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {sub.student.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-gray-800 font-medium">
                                        <span className="font-bold">{sub.student.name}</span> submitted <span className="text-blue-600">{sub.exam.title}</span>
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(sub.completedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <div className={`text-lg font-bold ${sub.score / sub.totalScore >= 0.35 ? 'text-green-600' : 'text-red-500'}`}>
                                    {sub.score}/{sub.totalScore}
                                </div>
                                <span className="text-xs text-gray-400 uppercase font-bold">Score</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
}