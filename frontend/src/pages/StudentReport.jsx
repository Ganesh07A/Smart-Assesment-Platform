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

    const totalScore = report.totalScore || report.totalMarks || 0;
    const percentage = report.percentage !== undefined ? Math.round(report.percentage) : (totalScore > 0 ? Math.round((report.score / totalScore) * 100) : 0);
    const isPassed = percentage >= 35;

    // Calculate accuracy (correct answers / total questions)
    const totalQuestions = report.reviewData.length;
    const correctAnswers = report.reviewData.filter(q => q.isCorrect).length;
    const accuracy = report.accuracy !== undefined ? report.accuracy : (totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0);

    return (
        <div className="bg-background-light text-slate-900 min-h-screen font-sans">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">school</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800">Smart Assessment</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-800">Student</span>
                            <span className="text-xs text-slate-500">ID: N/A</span>
                        </div>
                        <div
                            className="size-10 rounded-full border-2 border-primary/20 bg-cover bg-center"
                            style={{ backgroundImage: "url('/assets/student-profile.jpg')" }}>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                {/* Hero Section / Title */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                            <span className="cursor-pointer hover:text-primary" onClick={() => navigate("/student-dashboard")}>Dashboard</span>
                            <span className="material-symbols-outlined text-xs">chevron_right</span>
                            <span>My Results</span>
                            <span className="material-symbols-outlined text-xs">chevron_right</span>
                            <span className="text-primary font-medium">Exam Report</span>
                        </nav>
                        <h2 className="text-3xl font-black text-slate-900">Exam Result</h2>
                        <p className="text-slate-500 mt-1">Completed recently</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-colors">
                            <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                            <span>Download PDF</span>
                        </button>
                    </div>
                </div>

                {/* Score Summary Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-10 overflow-hidden relative">
                    <div className={`absolute top-0 left-0 w-2 h-full ${isPassed ? 'bg-success' : 'bg-error'}`}></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative size-40">
                                {/* Progress Circle */}
                                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                    <circle className="stroke-slate-100" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                                    <circle className={`${isPassed ? 'stroke-success' : 'stroke-error'}`} cx="18" cy="18" fill="none" r="16" strokeDasharray={`${percentage} 100`} strokeLinecap="round" strokeWidth="3"></circle>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black text-slate-900">{percentage}%</span>
                                    <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Overall</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Score</p>
                                <p className="text-5xl font-black text-slate-900">{report.score}<span className="text-2xl text-slate-400 font-medium">/{report.totalScore || report.totalMarks}</span></p>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${isPassed ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'}`}>
                                <span className="material-symbols-outlined text-lg">{isPassed ? 'check_circle' : 'cancel'}</span>
                                <span className="font-bold tracking-tight">Status: {isPassed ? 'Passed' : 'Failed'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-background-light">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Time Spent</p>
                                <p className="text-xl font-bold text-slate-800">{report.timeSpent || "--"}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-background-light">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Accuracy</p>
                                <p className="text-xl font-bold text-slate-800">{accuracy}%</p>
                            </div>
                            <div className="p-4 rounded-xl bg-background-light">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Percentile</p>
                                <p className="text-xl font-bold text-slate-800">{report.percentile ? `${report.percentile}th` : "--"}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-background-light">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Rank</p>
                                <p className="text-xl font-bold text-slate-800">{report.rank ? `#${report.rank}` : "--"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Breakdown Section */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Detailed Question Breakdown</h3>
                    <div className="overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest">
                                        <th className="px-6 py-4">#</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Question Details</th>
                                        <th className="px-6 py-4">Your Answer</th>
                                        <th className="px-6 py-4">Correct Answer</th>
                                        <th className="px-6 py-4 text-right">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {report.reviewData.map((q, index) => {
                                        const isCorrect = q.isCorrect;
                                        let yourAnswerDisplay = "";
                                        let correctAnswerDisplay = "";

                                        if (q.type === "MCQ") {
                                            const correctIndex = Number(q.correctOption);
                                            const selectedIndex = (q.selectedOption !== null && q.selectedOption !== undefined)
                                                ? Number(q.selectedOption)
                                                : null;
                                            yourAnswerDisplay = (selectedIndex !== null && q.options[selectedIndex]) ? q.options[selectedIndex] : "Not Answered";
                                            correctAnswerDisplay = q.options[correctIndex];
                                        } else {
                                            yourAnswerDisplay = "Code Submitted";
                                            correctAnswerDisplay = "View Solution";
                                        }

                                        return (
                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`material-symbols-outlined ${isCorrect ? 'text-success' : 'text-error'} fill-current`}>
                                                        {isCorrect ? 'check_circle' : 'cancel'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-slate-800 line-clamp-1" title={q.text}>{q.text}</p>
                                                </td>
                                                <td className={`px-6 py-4 text-sm font-medium ${isCorrect ? 'text-success' : 'text-error'}`}>
                                                    {q.type === "CODE" ? (
                                                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">Code</span>
                                                    ) : yourAnswerDisplay}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                                    {q.type === "CODE" ? (
                                                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">--</span>
                                                    ) : correctAnswerDisplay}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-right text-slate-900">
                                                    {q.type}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <button onClick={() => navigate("/student-dashboard")} className="text-sm font-bold text-primary hover:underline">Back to Dashboard</button>
                    </div>
                </div>
            </main>
            <footer className="mt-auto py-10 border-t border-slate-200 bg-white">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/20 p-1 rounded">
                            <span className="material-symbols-outlined text-primary text-sm">college</span>
                        </div>
                        <span className="text-sm font-bold text-slate-600">© 2026 Smart Assessment Platform</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a className="text-sm text-slate-500 hover:text-primary transition-colors" href="#">Privacy Policy</a>
                        <a className="text-sm text-slate-500 hover:text-primary transition-colors" href="#">Terms of Service</a>
                        <a className="text-sm text-slate-500 hover:text-primary transition-colors" href="#">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}