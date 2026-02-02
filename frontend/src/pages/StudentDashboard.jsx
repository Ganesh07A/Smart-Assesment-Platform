import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { Search, Filter, BookOpen, CheckCircle, Clock, Trophy, ArrowRight, FileText } from "lucide-react";

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); 
  const [search, setSearch] = useState("");
  
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
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const stats = useMemo(() => {
    const total = exams.length;
    const completed = exams.filter(e => e.isAttempted).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [exams]);

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase()) || 
                          (exam.teacher?.name || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === "all" 
      ? true 
      : filter === "completed" 
        ? exam.isAttempted 
        : !exam.isAttempted;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      

      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Ready to challenge yourself today?
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                    <BookOpen size={24} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Assigned</p>
                    <h3 className="text-3xl font-extrabold text-gray-800">{stats.total}</h3>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Pending</p>
                    <h3 className="text-3xl font-extrabold text-gray-800">{stats.pending}</h3>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                <div className="p-4 bg-green-50 text-green-600 rounded-xl">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Completed</p>
                    <h3 className="text-3xl font-extrabold text-gray-800">{stats.completed}</h3>
                </div>
            </div>
        </div>

        {/* FILTER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 gap-4">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by exam or teacher..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400 transition"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                {['all', 'pending', 'completed'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                            filter === tab 
                            ? "bg-white text-gray-800 shadow-sm" 
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>

        {/* EXAMS */}
        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                    <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
                ))}
             </div>
        ) : filteredExams.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                    <Filter className="text-gray-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No exams found</h3>
                <p className="text-gray-500">Try adjusting your search or filters.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((exam) => (
                    <div
                        key={exam.id}
                        className={`group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between h-full`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${exam.isAttempted ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {exam.isAttempted ? <Trophy size={24} /> : <FileText size={24} />}
                                </div>
                                {exam.isAttempted ? (
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                                        Done
                                    </span>
                                ) : (
                                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                                        Due
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 line-clamp-1 mb-1" title={exam.title}>
                                {exam.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                by {exam.teacher?.name || "Instructor"}
                            </p>

                            <p className="text-gray-600 text-sm line-clamp-2 h-10 mb-4">
                                {exam.description || "No description provided for this exam."}
                            </p>

                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-wide mb-6">
                                <div className="flex items-center gap-1">
                                    <Clock size={14} /> {exam.duration} mins
                                </div>
                                <div className="flex items-center gap-1">
                                    <BookOpen size={14} /> {exam.totalMarks} Marks
                                </div>
                            </div>
                        </div>

                        <div>
                            {exam.isAttempted ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
                                        <span>Score</span>
                                        <span>{Math.round((exam.score / exam.totalScore) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${exam.score / exam.totalScore >= 0.35 ? 'bg-green-500' : 'bg-red-500'}`} 
                                            style={{ width: `${(exam.score / exam.totalScore) * 100}%` }}
                                        ></div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/exam/review/${exam.id}`)}
                                        className="w-full mt-4 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition flex justify-center gap-2 items-center border border-transparent"
                                    >
                                        View Report
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate(`/take-exam/${exam.id}`)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition active:scale-95 flex justify-center items-center gap-2"
                                >
                                    Start Exam <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}