import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Editor from "@monaco-editor/react";
import {
    Timer, AlertTriangle, Terminal, Play, Check,
    ChevronLeft, ChevronRight, Flag, Grid, Maximize, ShieldAlert,
    School, Lock, ShieldCheck, Shield, Eye, Headphones,
    Code2, Box, Info, CheckCircle2, XCircle, AlertCircle
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

    // --- PYODIDE STATE ---
    const pyodideRef = useRef(null);
    const [isPyodideLoading, setIsPyodideLoading] = useState(true);

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

                // Use the duration from the API, fallback to 60 only if missing
                const fetchedDuration = examRes.data.exam.duration;
                const finalDuration = (fetchedDuration && fetchedDuration > 0) ? fetchedDuration : 60;

                setTimeLeft(finalDuration * 60);
                setLoading(false);
            } catch {
                toast.error("Failed to load exam.");
            }
        };
        if (examId) fetchExam();
    }, [examId, navigate]);

    // --- 2. LOAD PYODIDE ---
    useEffect(() => {
        async function loadPyodide() {
            try {
                if (window.loadPyodide) {
                    const pyodide = await window.loadPyodide();
                    pyodideRef.current = pyodide;
                    setIsPyodideLoading(false);
                    console.log("Pyodide Loaded");
                }
            } catch (err) {
                console.error("Pyodide Load Error:", err);
                toast.error("Failed to load Python environment.");
            }
        }
        loadPyodide();
    }, []);

    // --- 3. TIMER ---
    useEffect(() => {
        if (hasStarted && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [hasStarted, timeLeft]);

    // --- 4. SUBMIT HANDLER ---
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

            const totalDurationSeconds = (exam?.duration || 60) * 60;
            const timeSpentSec = totalDurationSeconds - timeLeft;

            await axios.post("http://localhost:5000/api/exams/submit", {
                examId,
                answers,
                tabSwitchCount: warningCount,
                passedCases,
                timeSpent: timeSpentSec
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });

            toast.success(reason === "Auto-Submit" ? "Exam Auto-Submitted (Violations)" : "Exam Submitted Successfully!");
            navigate(`/exam/review/${examId}`);
        } catch (err) {
            console.error(err);
            toast.error("Submission failed or already submitted.");
            navigate(`/student-dashboard`);
        }
    }, [examId, answers, warningCount, testResults, navigate, exam, timeLeft]);

    // --- 5. SECURITY SYSTEM ---
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

    // --- AUTO SUBMIT ON TIME UP ---
    useEffect(() => {
        if (timeLeft === 0 && hasStarted) {
            handleSubmit("Time Up");
        }
    }, [timeLeft, hasStarted, handleSubmit]);

    // --- 6. LISTENERS ---
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

    const runCode = async (qId, code, testCases) => {
        if (!pyodideRef.current) {
            toast.error("Python environment is still loading...");
            return;
        }

        const runToastId = toast.loading("Executing Python code...");
        try {
            let passedCount = 0;
            const logs = [];

            for (const tc of testCases) {
                // Prepare Python code to run the solution function with inputs
                // Wrap code in a try-except to catch execution errors within Python
                const wrapper = `
import json
def run_test():
    try:
        ${code.replace(/\n/g, '\n        ')}
        result = solution(${tc.input})
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

json.dumps(run_test())
                `;

                try {
                    const outputStr = await pyodideRef.current.runPythonAsync(wrapper);
                    const output = JSON.parse(outputStr);

                    if (output.status === "success") {
                        const actual = output.result;
                        const isPass = String(actual) === String(tc.output);
                        if (isPass) passedCount++;
                        logs.push({ input: tc.input, expected: tc.output, actual: actual, status: isPass ? "PASS" : "FAIL" });
                    } else {
                        logs.push({ input: tc.input, expected: tc.output, actual: output.message, status: "ERROR" });
                    }
                } catch (execErr) {
                    logs.push({ input: tc.input, expected: tc.output, actual: execErr.message, status: "ERROR" });
                }
            }

            setTestResults(prev => ({
                ...prev,
                [qId]: { passed: passedCount === testCases.length, logs: logs }
            }));
            toast.dismiss(runToastId);
            if (passedCount === testCases.length) {
                toast.success("All Test Cases Passed!", { icon: "🚀" });
            } else {
                toast.error(`${testCases.length - passedCount} Test Cases Failed`);
            }
        } catch (err) {
            toast.dismiss(runToastId);
            console.error(err);
            toast.error("Runtime Error");
        }
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

    if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center animate-pulse text-indigo-600 font-bold uppercase tracking-widest">Initialising Secure Environment...</div>;

    // 1️⃣ LOBBY VIEW (MODAL)
    if (!hasStarted) {
        return (
            <div className="fixed inset-0 z-[9999] bg-gray-900 flex items-center justify-center p-6 overflow-hidden">
                <div className="bg-white p-10 rounded-2xl max-w-lg w-full text-center shadow-2xl animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                        <Lock size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2 uppercase tracking-wide">Secure Assessment Lab</h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">System proctoring is active. This session will be strictly monitored. Full screen mode is mandatory for the duration of the exam.</p>
                    <button onClick={startExam} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition transform hover:scale-[1.01] active:translate-y-0.5 shadow-lg shadow-blue-100 uppercase tracking-widest text-sm">
                        Unlock Assessment
                    </button>
                    <p className="mt-4 text-[10px] text-gray-400 font-medium uppercase tracking-widest">Environment ID: {examId?.substring(0, 8)}</p>
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
            {/* INJECTED HIDE SCROLLBAR CSS (REDUNDANT BUT SAFE) */}
            <style>{`
                ::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* CUSTOM SUBMIT MODAL (FIXED FULL SCREEN) */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center transform animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                            <Box size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Final Submission</h2>
                        <p className="text-slate-500 mb-8 leading-relaxed text-sm">Review your flagged items before submitting. Once confirmed, your answers are final.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleSubmit("Manual")}
                                className="w-full py-4 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition active:scale-95"
                            >
                                Confirm Submission
                            </button>
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                className="w-full py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                            >
                                Return to Exam
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULLSCREEN ENFORCEMENT BANNER (LOCKDOWN MODE) */}
            {!isFullScreen && !showSubmitModal && (
                <div className="fixed inset-0 z-[9999] bg-white flex flex-col font-sans overflow-hidden">
                    <div className="sticky top-0 z-50 w-full bg-red-600 text-white px-6 py-4 shadow-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <AlertTriangle size={32} className="animate-pulse" />
                            <div>
                                <h2 className="font-black text-lg uppercase tracking-tighter">Security Alert: Fullscreen Required</h2>
                                <p className="text-xs font-medium opacity-90">Access to content is restricted until secure environment is restored.</p>
                            </div>
                        </div>
                        <button
                            onClick={startExam}
                            className="bg-white text-red-600 px-8 py-2.5 rounded-lg font-black text-sm transition-all hover:bg-red-50 active:scale-95 shadow-lg shadow-red-900/20 uppercase"
                        >
                            Restore Access
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-12 opacity-20 filter blur-sm grayscale select-none pointer-events-none">
                        {/* Blurred Content Placeholder */}
                        <div className="max-w-5xl w-full grid grid-cols-3 gap-12">
                            <div className="col-span-2 space-y-8">
                                <div className="h-10 w-48 bg-slate-200 rounded-full"></div>
                                <div className="h-32 w-full bg-slate-200 rounded-3xl"></div>
                                <div className="space-y-4">
                                    <div className="h-16 w-full bg-slate-100 rounded-2xl"></div>
                                    <div className="h-16 w-full bg-slate-100 rounded-2xl"></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="h-64 bg-slate-100 rounded-3xl"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-50 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary text-white p-2 rounded-xl shadow-sm">
                        <Terminal size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">{exam?.title || "Assessment"}</h1>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">{hasStarted ? "Session Active" : "Waiting"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-100 transition-colors ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-600'}`}>
                        <Timer size={18} className={timeLeft < 300 ? 'animate-spin-slow' : ''} />
                        <span className="font-mono font-black text-xl tabular-nums tracking-tight">
                            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>

                    <button
                        onClick={() => setShowSubmitModal(true)}
                        className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg shadow-slate-200 uppercase tracking-widest"
                    >
                        End Session
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT WRAPPER */}
            <main className="flex-1 flex overflow-hidden">
                {/* LEFT SIDE: PROBLEM & EDITOR (80% for code) */}
                <div className="flex-1 flex overflow-hidden">
                    <div className={`flex flex-col h-full bg-white transition-all duration-500 overflow-hidden ${currentQ.type === 'CODE' ? 'w-[75%]' : 'w-full'}`}>
                        {currentQ.type === 'CODE' ? (
                            <>
                                {/* DESCRIPTION AREA */}
                                <div className="h-[40%] overflow-y-auto p-10 border-b border-gray-100 bg-slate-50/30">
                                    <div className="max-w-4xl">
                                        <div className="flex items-center gap-4 mb-6">
                                            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">Question {currentQIndex + 1}</span>
                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5 border border-slate-200">
                                                <Code2 size={12} /> Python 3
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter mb-6">{currentQ.text}</h2>
                                        <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed mb-10">
                                            <p>Implement the <code>solution()</code> function that accepts the logic described. Ensure edge cases are handled.</p>
                                        </div>

                                        {/* TEST CASE PREVIEW */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Info size={14} />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Example Specification</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Input</p>
                                                    <code className="text-sm font-bold text-blue-600">{currentQ.testCases?.[0]?.input || "N/A"}</code>
                                                </div>
                                                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Expected Output</p>
                                                    <code className="text-sm font-bold text-green-600">{currentQ.testCases?.[0]?.output || "N/A"}</code>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* EDITOR AREA */}
                                <div className="h-[60%] flex flex-col overflow-hidden relative">
                                    {/* Editor Header */}
                                    <div className="h-14 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="size-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                                            <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Live Python Editor</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isPyodideLoading && (
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20 animate-pulse">
                                                    Initialising Runtime...
                                                </div>
                                            )}
                                            <button
                                                onClick={() => runCode(currentQ.id, answers[currentQ.id], currentQ.testCases)}
                                                disabled={isPyodideLoading}
                                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-blue-900/40"
                                            >
                                                <Play size={14} fill="white" /> Execute
                                            </button>
                                        </div>
                                    </div>

                                    {/* Monaco Editor Integration */}
                                    <div className="flex-1 bg-[#1e1e1e]">
                                        <Editor
                                            height="100%"
                                            defaultLanguage="python"
                                            theme="vs-dark"
                                            value={answers[currentQ.id] || `def solution(n):\n    # Your logic here\n    pass`}
                                            onChange={(val) => handleCodeChange(currentQ.id, val)}
                                            options={{
                                                fontSize: 14,
                                                fontFamily: "'Fira Code', 'Monaco', monospace",
                                                fontLigatures: true,
                                                minimap: { enabled: false },
                                                scrollBeyondLastLine: false,
                                                lineNumbers: "on",
                                                automaticLayout: true,
                                                tabSize: 4,
                                                cursorStyle: "block",
                                                padding: { top: 20 },
                                                autoClosingBrackets: "always",
                                                autoClosingQuotes: "always",
                                                suggestOnTriggerCharacters: true,
                                                acceptSuggestionOnEnter: "on",
                                                formatOnType: true,
                                                quickSuggestions: {
                                                    other: true,
                                                    comments: true,
                                                    strings: true
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Test Result Feedback UI */}
                                    {testResults[currentQ.id] && (
                                        <div className="absolute right-6 bottom-6 w-80 max-h-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300 z-20">
                                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                                                    <Box size={14} /> Execution Summary
                                                </h3>
                                                <button onClick={() => setTestResults(prev => {
                                                    const next = { ...prev };
                                                    delete next[currentQ.id];
                                                    return next;
                                                })} className="text-white/30 hover:text-white">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                {testResults[currentQ.id].logs.map((log, idx) => (
                                                    <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-1 ${log.status === 'PASS' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">Test Case {idx + 1}</span>
                                                            {log.status === 'PASS' ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div>
                                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Input</p>
                                                                <code className="text-xs text-white/80">{log.input}</code>
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Got</p>
                                                                <code className={`text-xs ${log.status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>{log.actual}</code>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* MCQ UI */
                            <div className="flex-1 overflow-y-auto p-12 lg:p-20 bg-slate-50/50">
                                <div className="max-w-3xl mx-auto">
                                    <div className="flex items-center gap-3 mb-10 animate-in slide-in-from-bottom-2 duration-500">
                                        <span className="bg-slate-900 text-white px-4 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-lg shadow-slate-200">Question {currentQIndex + 1}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-3">{currentQ.marks} pts</span>
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight mb-12 animate-in slide-in-from-bottom-3 duration-700">
                                        {currentQ.text}
                                    </h2>
                                    <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-1000">
                                        {currentQ.options.map((opt, i) => (
                                            <label key={i} className="group cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`q-${currentQ.id}`}
                                                    className="peer hidden"
                                                    checked={answers[currentQ.id] === i}
                                                    onChange={() => handleOptionSelect(currentQ.id, i)}
                                                />
                                                <div className="p-6 rounded-3xl border-2 border-slate-100 bg-white transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50/50 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50 flex items-center gap-6 active:scale-[0.99]">
                                                    <div className="size-12 shrink-0 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:text-white">
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                    <span className="text-xl font-bold text-slate-700 peer-checked:text-slate-900">
                                                        {opt}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PALETTE (Fixed sidebar logic) */}
                    <aside className={`bg-white h-full border-l border-slate-200 flex flex-col shrink-0 overflow-hidden ${currentQ.type === 'CODE' ? 'w-[25%]' : 'w-80'}`}>
                        <div className="p-8 border-b border-slate-100 shrink-0">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
                                <Grid size={16} /> Navigation Console
                            </h3>

                            {/* Progress Status */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Answered</p>
                                    <p className="text-xl font-black text-blue-600 leading-none">{Object.keys(answers).length}<span className="text-xs text-slate-300 ml-1">/{questions.length}</span></p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Marked</p>
                                    <p className="text-xl font-black text-yellow-500 leading-none">{markedForReview.size}</p>
                                </div>
                            </div>

                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-4 gap-3">
                                {questions.map((q, i) => (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQIndex(i)}
                                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${getPaletteClass(i)} shadow-sm`}
                                    >
                                        {(i + 1).toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 space-y-6">
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-4">
                                <AlertCircle size={20} className="text-orange-600 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black text-orange-900 uppercase tracking-widest mb-1">Proctoring Log</p>
                                    <p className="text-[9px] font-medium text-orange-800/80 leading-relaxed">System monitoring is active. {MAX_WARNINGS - warningCount} violations remaining before auto-close.</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
                                <School size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Academic Integrity v2.4</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* BOTTOM FOOTER NAVIGATION */}
            <footer className="h-24 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 z-50 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
                <button
                    onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                    disabled={isFirstQuestion}
                    className="flex items-center gap-3 px-8 py-3 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all disabled:opacity-20 flex-1 sm:flex-none max-w-[160px] justify-center"
                >
                    <ChevronLeft size={18} /> Prev
                </button>

                <div className="flex items-center gap-4 flex-1 justify-center sm:justify-end">
                    <button
                        onClick={() => toggleReview(currentQ.id)}
                        className={`flex items-center gap-3 px-8 py-3 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest ${markedForReview.has(currentQ.id)
                            ? "bg-yellow-50 text-yellow-700 border-yellow-400 shadow-lg shadow-yellow-100"
                            : "border-slate-100 text-slate-400 hover:bg-slate-50"
                            }`}
                    >
                        <Flag size={18} fill={markedForReview.has(currentQ.id) ? "currentColor" : "none"} />
                        {markedForReview.has(currentQ.id) ? "Bookmarked" : "Review"}
                    </button>

                    <button
                        onClick={() => {
                            if (isLastQuestion) {
                                setShowSubmitModal(true);
                            } else {
                                setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1));
                            }
                        }}
                        className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-blue-100 active:scale-95"
                    >
                        {isLastQuestion ? "Complete Exam" : "Save & Proceed"}
                        {!isLastQuestion && <ChevronRight size={18} />}
                    </button>
                </div>
            </footer>
        </div>
    );
}