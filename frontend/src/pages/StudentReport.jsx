import axios from "axios";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

export default function StudentReport() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`http://localhost:5000/api/exams/review/${examId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setReport(res.data);
                setLoading(false);
            } catch {
                toast.error("Failed to load report.");
                navigate("/student-dashboard");
            }
        };
        fetchReport();
    }, [examId, navigate]);

    if (loading) return <div className="text-center mt-20 font-bold text-gray-500">Loading Report...</div>;

    const percentage = Math.round((report.score / report.totalScore) * 100);
    const isPassed = percentage >= 35;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">

            <div className="max-w-4xl mx-auto p-6">

                {/* 🏆 Score Card */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 text-center relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-3 ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <h1 className="text-3xl font-extrabold text-gray-800">Exam Report</h1>
                    <div className="flex justify-center items-center gap-4 mt-4">
                        <span className="text-5xl font-black text-gray-800">{report.score}</span>
                        <span className="text-xl text-gray-400 font-medium">/ {report.totalScore}</span>
                    </div>
                    <p className={`mt-2 font-bold ${isPassed ? "text-green-600" : "text-red-600"}`}>
                        {isPassed ? "Pass 🎉" : "Fail 🛑"} ({percentage}%)
                    </p>
                </div>

                {/* 📝 Questions */}
                <div className="space-y-6">
                    {report.reviewData.map((q, index) => (
                        <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

                            {/* Question Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3">
                                    <span className="bg-gray-100 text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm shrink-0">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 pt-0.5 whitespace-pre-wrap">{q.text}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${q.type === 'CODE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {q.type === 'CODE' ? 'Code' : 'MCQ'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* --- CONTENT BASED ON TYPE --- */}

                            {q.type === "MCQ" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.options.map((opt, optIndex) => {
                                        const correctIndex = Number(q.correctOption);
                                        const selectedIndex = (q.selectedOption !== null && q.selectedOption !== undefined)
                                            ? Number(q.selectedOption)
                                            : null;

                                        const isCorrect = optIndex === correctIndex;
                                        const isSelected = optIndex === selectedIndex;

                                        let style = "border-gray-200 bg-white text-gray-500";
                                        let icon = null;

                                        if (isCorrect) {
                                            style = "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-200 font-bold";
                                            icon = "✅";
                                        } else if (isSelected) {
                                            style = "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-200 font-bold";
                                            icon = "❌";
                                        }

                                        return (
                                            <div key={optIndex} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${style}`}>
                                                <span>{opt}</span>
                                                <span>{icon}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // --- CODING ANSWER DISPLAY ---
                                <div className="bg-gray-900 rounded-xl p-4 overflow-hidden border border-gray-800">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-2">Your Code Submission:</p>
                                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap overflow-x-auto p-2">
                                        {q.selectedOption || "// No code submitted"}
                                    </pre>
                                </div>
                            )}

                        </div>
                    ))}
                </div>

                <div className="mt-10 mb-10 text-center">
                    <button onClick={() => navigate("/student-dashboard")} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition">
                        Back to Dashboard
                    </button>
                </div>

            </div>
        </div>
    );
}