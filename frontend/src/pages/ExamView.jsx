import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
    Timer, AlertTriangle, Terminal, Play, Check,
    ChevronLeft, ChevronRight, Flag, Grid, Maximize, ShieldAlert,
    School, Lock, ShieldCheck, Shield, Eye, Headphones
} from "lucide-react";

export default function ExamView() {
    const { examId } = useParams();
    const navigate = useNavigate();

    // --- DATA STATE ---
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- EXAM LOGIC ---
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(0);
    const [testResults, setTestResults] = useState({});

    // --- SECURITY & UI STATE ---
    const [hasStarted, setHasStarted] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [warningCount, setWarningCount] = useState(0);
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    // Refs
    const timerRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const lastWarningTimeRef = useRef(0);

    const MAX_WARNINGS = 3;

    // --- 1. FETCH DATA ---
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const token = localStorage.getItem("token");
                const examRes = await axios.get(`http://localhost:5000/api/exams/${examId}/details`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const qRes = await axios.get(`http://localhost:5000/api/exams/${examId}/questions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setExam(examRes.data.exam);
                setQuestions(qRes.data.questions || qRes.data);
                // Ensure duration is a number
                const duration = Number(examRes.data.exam.duration) || 60;
                setTimeLeft(duration * 60);
                setLoading(false);
            } catch {
                toast.error("Failed to load exam.");
            }
        };
        if (examId) fetchExam();
    }, [examId, navigate]);

    // --- 2. TIMER ---
    useEffect(() => {
        if (hasStarted && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [hasStarted, timeLeft]);

    // --- 3. SUBMIT HANDLER ---
    const handleSubmit = useCallback(async (reason = "Normal Submission") => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        try {
            clearInterval(timerRef.current);
            const token = localStorage.getItem("token");

            const passedCases = {};
            Object.keys(testResults).forEach(qId => {
                if (testResults[qId].passed) passedCases[qId] = true;
            });

            await axios.post("http://localhost:5000/api/exams/submit", {
                examId, answers, tabSwitchCount: warningCount, passedCases
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });

            toast.success(reason === "Auto-Submit" ? "Exam Auto-Submitted (Violations)" : "Exam Submitted Successfully!");
            // Redirect to review page as requested
            navigate(`/exam/review/${examId}`);
        } catch (err) {
            console.error(err);
            toast.error("Submission failed or already submitted.");
            navigate(`/student-dashboard`);
        }
    }, [examId, answers, warningCount, testResults, navigate]);

    // --- 4. SECURITY SYSTEM ---
    const triggerWarning = useCallback((msg) => {
        if (isSubmittingRef.current) return;

        const now = Date.now();
        if (now - lastWarningTimeRef.current < 2000) return;
        lastWarningTimeRef.current = now;

        setWarningCount(prev => {
            const newCount = prev + 1;
            if (newCount >= MAX_WARNINGS) {
                handleSubmit("Auto-Submit");
                return newCount;
            }

            toast.custom(() => (
                <div className="bg-red-600/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce border border-red-400">
                    <ShieldAlert size={30} />
                    <div>
                        <h3 className="font-bold text-lg">Warning {newCount}/{MAX_WARNINGS}</h3>
                        <p className="text-sm opacity-90">{msg}</p>
                    </div>
                </div>
            ), { duration: 4000 });

            return newCount;
        });
    }, [handleSubmit]);

    // --- 2b. AUTO SUBMIT ON TIME UP ---
    useEffect(() => {
        if (timeLeft === 0 && hasStarted) {
            handleSubmit("Time Up");
        }
    }, [timeLeft, hasStarted, handleSubmit]);

    // --- 5. LISTENERS ---
    useEffect(() => {
        if (!hasStarted) return;

        const handleFullScreenChange = () => {
            if (isSubmittingRef.current) return;
            const isFull = !!document.fullscreenElement;
            setIsFullScreen(isFull);
            if (!isFull) triggerWarning("You exited full screen mode!");
        };

        const handleVisibilityChange = () => {
            if (isSubmittingRef.current) return;
            if (document.hidden) triggerWarning("You switched tabs!");
        };

        document.addEventListener("fullscreenchange", handleFullScreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullScreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [hasStarted, triggerWarning]);

    const startExam = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().then(() => {
                setHasStarted(true);
                setIsFullScreen(true);
            }).catch(() => toast.error("Full screen denied."));
        }
    };

    const preventCheating = (e) => {
        e.preventDefault();
        toast.error("Action Disabled", { id: "cheat", icon: "🚫" });
    };

    // --- UI HELPERS ---
    const handleOptionSelect = (qId, optionIndex) => setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    const handleCodeChange = (qId, code) => setAnswers(prev => ({ ...prev, [qId]: code }));
    const toggleReview = (qId) => {
        setMarkedForReview(prev => {
            const newSet = new Set(prev);
            if (newSet.has(qId)) newSet.delete(qId);
            else newSet.add(qId);
            return newSet;
        });
    };

    const runCode = (qId, code, testCases) => {
        try {
            let passedCount = 0;
            const logs = [];
            testCases.forEach((tc) => {
                const userCode = `${code}; return solution(${tc.input});`;
                const runUserFunc = new Function(userCode);
                try {
                    const result = runUserFunc();
                    const isPass = result == tc.output;
                    if (isPass) passedCount++;
                    logs.push({ input: tc.input, expected: tc.output, actual: result, status: isPass ? "PASS" : "FAIL" });
                } catch (execErr) {
                    logs.push({ input: tc.input, expected: tc.output, actual: execErr.message, status: "ERROR" });
                }
            });
            setTestResults({ ...testResults, [qId]: { passed: passedCount === testCases.length, logs: logs } });
            if (passedCount === testCases.length) toast.success("Tests Passed!", { icon: "🚀" });
        } catch { toast.error("Syntax Error"); }
    };

    const getPaletteClass = (i) => {
        const q = questions[i];
        const isAnswered = answers[q.id] !== undefined;
        const isReview = markedForReview.has(q.id);
        const isCurrent = currentQIndex === i;

        if (isCurrent) return "border-2 border-blue-600 bg-white text-blue-600 ring-2 ring-blue-50 z-10 scale-105";
        if (isReview) return "bg-yellow-400 text-white border-none";
        if (isAnswered) return "bg-blue-600 text-white border-none";
        return "bg-gray-100 text-gray-500 hover:bg-gray-200 border-none transition-colors";
    };

    if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center animate-pulse text-indigo-600 font-bold">Loading Environment...</div>;

    // 1️⃣ LOBBY VIEW (MODAL)
    if (!hasStarted) {
        return (
            <div className="fixed inset-0 z-[9999] bg-gray-900 flex items-center justify-center p-6 overflow-hidden">
                <div className="bg-white p-10 rounded-2xl max-w-lg w-full text-center shadow-2xl animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Maximize size={40} className="text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Technical Assessment</h1>
                    <p className="text-gray-500 mb-8">Full screen mode is required to start this exam. Please do not switch tabs or exit full screen.</p>
                    <button onClick={startExam} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition transform hover:scale-[1.02] shadow-lg shadow-blue-200">
                        Start Assessment
                    </button>
                    <p className="mt-4 text-xs text-gray-400">ID: {examId}</p>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQIndex];
    const isLastQuestion = currentQIndex === questions.length - 1;
    const isFirstQuestion = currentQIndex === 0;

    // 2️⃣ EXAM VIEW
    return (
        <div
            onContextMenu={preventCheating} onCopy={preventCheating}
            onPaste={preventCheating} onCut={preventCheating}
            className="h-screen w-screen flex flex-col bg-slate-50 font-sans overflow-hidden select-none relative text-slate-800"
        >
            {/* GLOBAL STYLES TO HIDE SCROLLBAR */}
            <style>{`
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            html, body { -ms-overflow-style: none; scrollbar-width: none; overflow: hidden; height: 100%; margin: 0; padding: 0; }
        `}</style>

            {/* CUSTOM SUBMIT MODAL (FIXED FULL SCREEN) */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 transition-all border border-gray-100">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Assessment?</h2>
                        <p className="text-gray-500 mb-6">Are you sure you want to finish? You won't be able to change your answers.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                className="flex-1 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSubmit("Manual")}
                                className="flex-1 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULLSCREEN ENFORCEMENT BANNER (LOCKDOWN MODE) */}
            {!isFullScreen && !showSubmitModal && (
                <div className="fixed inset-0 z-[9999] bg-gray-50 flex flex-col font-sans overflow-y-auto">
                    {/* Sticky Banner */}
                    <div className="sticky top-0 z-50 w-full bg-yellow-50 border-b border-yellow-200 px-4 py-3 shadow-sm">
                        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-yellow-700" size={24} />
                                <p className="text-gray-700 text-sm md:text-base font-medium leading-tight">
                                    This exam must be taken in full-screen mode. Please enable full-screen to continue.
                                </p>
                            </div>
                            <button
                                onClick={startExam}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors duration-200 shadow-sm whitespace-nowrap"
                            >
                                Enable Fullscreen
                            </button>
                        </div>
                    </div>

                    {/* Locked Content Container */}
                    <div className="relative min-h-screen flex flex-col">
                        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-10 w-full flex-1">

                            {/* Mock Header */}
                            <header className="flex items-center justify-between opacity-50 filter blur-[2px] select-none">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                                        <School size={20} />
                                    </div>
                                    <h1 className="text-xl font-bold tracking-tight text-gray-900">EduGuard Assessment</h1>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</p>
                                        <p className="text-sm font-semibold text-gray-900">Jonathan Doe</p>
                                    </div>
                                    <div className="size-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
                                        <div className="w-full h-full bg-gray-300"></div>
                                    </div>
                                </div>
                            </header>

                            {/* Mock Exam Details */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-200 pb-8 opacity-50 filter blur-[2px] select-none">
                                <div className="space-y-2">
                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wide">Midterm Examination</span>
                                    <h2 className="text-4xl font-black tracking-tight text-gray-900">Advanced Mathematics</h2>
                                    <p className="text-gray-500 font-medium">Fall Semester 2024</p>
                                </div>
                            </div>

                            {/* Locked Content Placeholder */}
                            <div className="relative group flex-1">
                                {/* Blurred Mockup Content */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 filter blur-md select-none pointer-events-none opacity-40 h-full">
                                    <div className="md:col-span-2 space-y-6">
                                        <div className="h-64 bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
                                            <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                                            <div className="h-8 w-3/4 bg-gray-300 rounded"></div>
                                            <div className="space-y-2 pt-4">
                                                <div className="h-12 w-full bg-gray-100 rounded-lg"></div>
                                                <div className="h-12 w-full bg-gray-100 rounded-lg"></div>
                                                <div className="h-12 w-full bg-gray-100 rounded-lg"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="h-48 bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                                            <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                                            <div className="h-10 w-full bg-gray-100 rounded"></div>
                                        </div>
                                        <div className="h-32 bg-white rounded-2xl border border-gray-200 p-6"></div>
                                    </div>
                                </div>

                                {/* Lockdown Overlay Card */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl p-10 max-w-md w-full shadow-2xl text-center space-y-6 transform scale-100 transition-transform">
                                        <div className="inline-flex items-center justify-center size-16 rounded-full bg-blue-100 text-blue-600 mb-2">
                                            <Lock size={32} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-bold text-gray-900">Exam Content Locked</h3>
                                            <p className="text-gray-600 leading-relaxed">
                                                To maintain academic integrity, this examination requires a secure fullscreen environment. Please enable fullscreen using the banner at the top to unlock the test content.
                                            </p>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-400">
                                                <ShieldCheck size={18} />
                                                Proctoring Active
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Compliance Info */}
                            <footer className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-gray-100 mt-auto">
                                <div className="flex items-start gap-3">
                                    <Shield className="text-gray-400" size={24} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Secure Browser</p>
                                        <p className="text-xs text-gray-500">Optimized for Chrome & Firefox</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Eye className="text-gray-400" size={24} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Active Monitoring</p>
                                        <p className="text-xs text-gray-500">Tab switching is prohibited</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Headphones className="text-gray-400" size={24} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Support ID</p>
                                        <p className="text-xs text-gray-500">ID: EXAM-{examId?.substring(0, 4).toUpperCase() || "DEMO"}</p>
                                    </div>
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                        <Terminal size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">{exam?.title || "Assessment"}</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Software Engineering</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                        <Timer size={18} />
                        <span className="font-mono font-bold text-lg">
                            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>

                    {/* User Info */}
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</p>
                            <p className="text-sm font-semibold text-gray-900">Alex Thompson</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                            AT
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSubmitModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm ml-2"
                    >
                        Submit Exam
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT WRAPPER */}
            <main className="flex-1 flex overflow-hidden">

                {/* LEFT SIDE: PROBLEM & EDITOR (70%) */}
                <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">

                    {/* QUESTION CONTENT AREA */}
                    <div className={`flex flex-col h-full overflow-hidden bg-white ${currentQ.type === 'CODE' ? 'w-full md:w-[70%] border-r border-gray-200' : 'w-full md:w-[75%] border-r border-gray-200'}`}>

                        {/* Coding Question Layout */}
                        {currentQ.type === 'CODE' ? (
                            <>
                                {/* Top: Problem Description */}
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fcfcfd]">
                                    <div className="max-w-4xl mx-auto">
                                        <div className="flex items-center gap-2 mb-6">
                                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase tracking-wide">Question {currentQIndex + 1} of {questions.length}</span>
                                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase tracking-wide">Coding</span>
                                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase tracking-wide">{currentQ.marks} Points</span>
                                        </div>

                                        <h2 className="text-3xl font-bold mb-6 text-gray-900">{currentQ.text}</h2>

                                        <div className="prose prose-slate max-w-none text-gray-700 leading-relaxed space-y-4 mb-8">
                                            <p>Write a function to solve the problem described above. Ensure your solution handles all edge cases.</p>

                                            {/* Example Mockup */}
                                            <div className="mt-6 space-y-6">
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight mb-2">Example:</h4>
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm">
                                                        <p><span className="text-gray-500">Input:</span> <span className="font-mono">...</span></p>
                                                        <p><span className="text-gray-500">Output:</span> <span className="font-mono">...</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom: Code Editor */}
                                <div className="h-[400px] border-t border-gray-200 flex flex-col bg-white shrink-0">
                                    {/* Editor Toolbar */}
                                    <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <select className="appearance-none bg-white border border-gray-200 rounded px-3 py-1 pr-8 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-600">
                                                    <option>JavaScript (Node.js)</option>
                                                    <option>Python 3</option>
                                                    <option>Java</option>
                                                </select>
                                                <div className="absolute right-2 top-1.5 pointer-events-none text-gray-400">
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => runCode(currentQ.id, answers[currentQ.id], currentQ.testCases)}
                                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 rounded transition-colors"
                                            >
                                                <Play size={14} className="fill-current" /> Run Code
                                            </button>
                                        </div>
                                    </div>

                                    {/* Code Area */}
                                    <div className="flex-1 flex overflow-hidden">
                                        <div className="w-10 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 text-gray-400 text-xs select-none font-mono">
                                            {[...Array(15)].map((_, i) => <span key={i} className="mb-1">{i + 1}</span>)}
                                        </div>
                                        <textarea
                                            className="flex-1 p-4 bg-white text-gray-800 font-mono text-sm resize-none focus:outline-none"
                                            placeholder="// Write your solution here..."
                                            value={answers[currentQ.id] || ""}
                                            onChange={(e) => handleCodeChange(currentQ.id, e.target.value)}
                                            spellCheck="false"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* MCQ Question Layout */
                            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar bg-slate-50/30">
                                <div className="max-w-3xl mx-auto">
                                    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm mb-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">Question {currentQIndex + 1} of {questions.length}</span>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <span className="text-xs font-medium uppercase tracking-wider">{currentQ.marks} Points</span>
                                            </div>
                                        </div>

                                        <h2 className="text-2xl font-semibold leading-snug mb-8 text-gray-900">
                                            {currentQ.text}
                                        </h2>

                                        <div className="space-y-4">
                                            {currentQ.options.map((opt, i) => (
                                                <label key={i} className="relative block cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name={`question-${currentQ.id}`}
                                                        className="peer hidden"
                                                        checked={answers[currentQ.id] === i}
                                                        onChange={() => handleOptionSelect(currentQ.id, i)}
                                                    />
                                                    <div className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 bg-gray-50/30 transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50/30 hover:border-gray-200 group-hover:bg-white">
                                                        <div className="size-8 flex shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white transition-all text-xs font-bold text-gray-500">
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                        <span className={`text-base font-medium ${answers[currentQ.id] === i ? 'text-gray-900' : 'text-gray-600'}`}>
                                                            {opt}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE: PALETTE (30%) */}
                    <aside className={`bg-white h-full overflow-y-auto border-l border-gray-200 flex flex-col z-10 ${currentQ.type === 'CODE' ? 'w-full md:w-[30%]' : 'w-full md:w-[25%]'}`}>
                        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                                <Grid size={18} /> Question Palette
                            </h3>

                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-8 text-xs font-medium text-gray-600">
                                <div className="flex items-center gap-2">
                                    <div className="size-4 bg-blue-600 rounded shadow-sm"></div>
                                    <span>Answered</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-4 bg-yellow-400 rounded shadow-sm"></div>
                                    <span>Marked</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-4 bg-white border-2 border-blue-600 rounded"></div>
                                    <span>Current</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-4 bg-gray-100 border border-gray-200 rounded"></div>
                                    <span>Not Visited</span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <span>Progress</span>
                                    <span>{Math.round((Object.keys(answers).length / questions.length) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 p-6">
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, i) => (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQIndex(i)}
                                        className={`aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all shadow-sm ${getPaletteClass(i)}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* BOTTOM NAV BAR */}
            <footer className="h-20 bg-white border-t border-gray-200 px-6 flex items-center justify-between shrink-0 z-50">
                <button
                    onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                    disabled={isFirstQuestion}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={20} /> Previous
                </button>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => toggleReview(currentQ.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border font-semibold transition-colors ${markedForReview.has(currentQ.id)
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        <Flag size={18} fill={markedForReview.has(currentQ.id) ? "currentColor" : "none"} />
                        {markedForReview.has(currentQ.id) ? "Marked" : "Mark for Review"}
                    </button>

                    <button
                        onClick={() => {
                            if (isLastQuestion) {
                                setShowSubmitModal(true);
                            } else {
                                setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1));
                            }
                        }}
                        className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        {isLastQuestion ? "Finish Assessment" : "Save & Next"}
                        {!isLastQuestion && <ChevronRight size={20} />}
                    </button>
                </div>
            </footer>
        </div>
    );
}