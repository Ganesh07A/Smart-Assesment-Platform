import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    Terminal,
    Code2,
    Database,
    Calendar,
    Timer,
    Play,
    FileText,
    Plus,
    Filter,
    Download,
    Palette,
    Calculator,
    ArrowRight
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

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
            } catch {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const upcomingExams = exams.filter(e => !e.isAttempted);
    const pastExams = exams.filter(e => e.isAttempted);

    // Helpers for styling
    const getExamIcon = (title) => {
        const t = title.toLowerCase();
        if (t.includes("data") || t.includes("structure")) return <Terminal size={24} />;
        if (t.includes("design") || t.includes("ui") || t.includes("ux")) return <Palette size={24} />;
        if (t.includes("math")) return <Calculator size={24} />;
        if (t.includes("database") || t.includes("sql")) return <Database size={24} />;
        return <Code2 size={24} />;
    };

    const getExamColor = (index) => {
        const colors = [
            "bg-blue-50 text-blue-600",
            "bg-purple-50 text-purple-600",
            "bg-orange-50 text-orange-600",
            "bg-emerald-50 text-emerald-600"
        ];
        return colors[index % colors.length];
    };

    return (
        <DashboardLayout userName={userName} role="student">
            <div className="max-w-7xl mx-auto space-y-8 pb-12">

                {/* Welcome Section */}
                <section>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back, {userName}! 👋</h2>
                    <p className="text-slate-500 mt-1 font-medium">
                        You have <span className="text-blue-600 font-bold">{upcomingExams.length} exams</span> scheduled for this week. Keep up the great work!
                    </p>
                </section>

                {/* Upcoming Exams Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Upcoming Exams
                            <span className="bg-blue-600/10 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Current</span>
                        </h3>
                        <button className="text-sm font-bold text-blue-600 hover:underline">View all</button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingExams.map((exam, index) => (
                                <div key={exam.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-lg ${getExamColor(index)}`}>
                                            {getExamIcon(exam.title)}
                                        </div>
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{String(exam.examId || "").substring(0, 6).toUpperCase()}</span>
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900 mb-2 line-clamp-1" title={exam.title}>{exam.title}</h4>

                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar size={14} />
                                            <span className="text-xs font-medium">Available Now</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Timer size={14} />
                                            <span className="text-xs font-medium">{exam.duration} minutes</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/take-exam/${exam.id}`)}
                                        className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play size={18} fill="currentColor" />
                                        Join Exam
                                    </button>
                                </div>
                            ))}

                            {/* "More Assessments" Placeholder Card */}
                            <div className="bg-slate-50/50 rounded-xl border border-dashed border-slate-300 p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                    <Plus size={24} />
                                </div>
                                <p className="text-sm font-bold text-slate-500">More assessments soon</p>
                                <p className="text-xs text-slate-400 mt-1 px-4">New tasks are added by your instructors weekly.</p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Past Results Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Past Results</h3>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-gray-50">
                                <Filter size={16} /> Filter
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-gray-50">
                                <Download size={16} /> Export
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Completed</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pastExams.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">
                                            No past exams found.
                                        </td>
                                    </tr>
                                ) : (
                                    pastExams.map((exam, index) => {
                                        const percentage = Math.round((exam.score / exam.totalScore) * 100) || 0;
                                        const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : "C";

                                        return (
                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${getExamColor(index)} bg-opacity-20`}>
                                                            {getExamIcon(exam.title)}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-900">{exam.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">Oct 20, 2023</td> {/* Placeholder Date */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900">{exam.score}/{exam.totalScore}</span>
                                                        <span className={`text-[10px] font-bold ${percentage >= 70 ? 'text-emerald-500' : 'text-orange-500'}`}>{grade}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                                                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                                            Completed
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => navigate(`/exam/review/${exam.id}`)}
                                                        className="text-blue-600 hover:text-blue-700 text-xs font-bold"
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 bg-slate-50/30 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {pastExams.length} records</p>
                            <div className="flex gap-2">
                                <button className="p-1 rounded bg-white border border-gray-200 text-slate-400 cursor-not-allowed">
                                    <span className="material-symbols-outlined text-sm">&lt;</span>
                                </button>
                                <button className="p-1 rounded bg-white border border-gray-200 text-slate-600 hover:bg-gray-50 transition-colors">
                                    <span className="material-symbols-outlined text-sm">&gt;</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Learning Path Banner */}
                <section className="bg-blue-600 rounded-2xl p-8 relative overflow-hidden group">
                    {/* Background Decoration */}
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl transition-all group-hover:bg-white/20"></div>
                    <div className="absolute right-20 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="max-w-xl">
                            <h3 className="text-2xl font-black text-white leading-tight mb-2">Ready to master Algorithms?</h3>
                            <p className="text-blue-100 font-medium">Your personalized learning path has been updated with 4 new practice modules based on your last results.</p>
                        </div>
                        <div className="flex-shrink-0">
                            <button className="bg-white text-blue-600 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2">
                                Resume Path
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </section>

            </div>
        </DashboardLayout>
    );
}