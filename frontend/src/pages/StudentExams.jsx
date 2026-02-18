import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Search, FileText, Loader2, Calendar, User, CheckCircle, XCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const StudentExams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:5000/api/exams/student/history", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setExams(response.data);
        } catch (error) {
            console.error("Error fetching history:", error);
            toast.error("Failed to load exam history.");
        } finally {
            setLoading(false);
        }
    };

    const filteredExams = exams.filter((exam) =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <DashboardLayout role="student" userName={localStorage.getItem("userName")}>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">My Exam History</h1>
                    <p className="text-slate-500 mt-1">View your past attempts and performance reports.</p>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by exam name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">No exams taken yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                            {searchTerm
                                ? "No exams match your search criteria."
                                : "You haven't participated in any exams yet. Go to the dashboard to find available exams."}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => navigate("/student-dashboard")}
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Go to Dashboard
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Exam Name</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Instructor</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Date Taken</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Score</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Status</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600 text-right">Report</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredExams.map((exam) => (
                                        <tr key={exam.submissionId} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{exam.title}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-slate-400" />
                                                    {exam.teacherName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    <span className="text-sm">{formatDate(exam.completedAt)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-800">
                                                    {exam.score}
                                                </span>
                                                <span className="text-slate-400 text-sm"> / {exam.totalScore}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {exam.result === "PASS" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                        <CheckCircle size={12} /> Passed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                        <XCircle size={12} /> Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/exam/review/${exam.id}`)}
                                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Eye size={16} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default StudentExams;
