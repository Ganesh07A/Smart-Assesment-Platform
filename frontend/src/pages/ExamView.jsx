import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast"; // <--- 1. Import Toast
import Navbar from "../components/Navbar";

export default function ExamView() {
  const { examId } = useParams();
  const navigate = useNavigate();

  // --- STATE ---
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Custom Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Refs
  const tabSwitchesRef = useRef(0);
  const answersRef = useRef({});
  
  const [tabSwitches, setTabSwitches] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isFullScreen, setIsFullScreen] = useState(false);

  // --- 1. FETCH EXAM DATA ---
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const token = localStorage.getItem("token");
        const qRes = await axios.get(`http://localhost:5000/api/questions/${examId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuestions(qRes.data);

        const eRes = await axios.get("http://localhost:5000/api/exams/all", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const currentExam = eRes.data.find(e => e.id === parseInt(examId));
        
        if (currentExam) setTimeLeft(currentExam.duration * 60); 
        setLoading(false);
      } catch (err) {
        toast.error("Failed to load exam!");
        navigate("/student-dashboard");
      }
    };
    fetchExamData();
  }, [examId, navigate]);

  // --- CORE SUBMIT LOGIC ---
  const submitExam = async () => {
    try {
      const token = localStorage.getItem("token");
      const finalAnswers = answersRef.current;
      const finalCheatCount = tabSwitchesRef.current;

      const res = await axios.post("http://localhost:5000/api/exams/submit", {
        examId: examId,
        answers: finalAnswers,
        tabSwitchCount: finalCheatCount 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 🎨 Success Toast instead of Alert
      toast.success(`Exam Submitted! Score: ${res.data.score}/${res.data.total}`);
      
      if (document.fullscreenElement) {
         document.exitFullscreen().catch(err => console.log(err));
      }
      navigate("/student/result", {
        state: { 
        score: res.data.score, 
        total: res.data.total, 
        percentage: res.data.percentage 
      }
      });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Submission failed!";
      toast.error(msg); // 🎨 Error Toast
      setShowConfirmModal(false); // Close modal if open
    }
  };

  // --- TRIGGER HANDLER ---
  const handleSubmitTrigger = useCallback((autoSubmit = false) => {
    if (autoSubmit) {
       submitExam(); // Skip modal if time runs out or cheating
    } else {
       setShowConfirmModal(true); // Show custom modal
    }
  }, []);

  // --- TIMER ---
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTrigger(true); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, handleSubmitTrigger]);

  // --- SECURITY ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchesRef.current += 1;
        setTabSwitches(tabSwitchesRef.current);
        if (tabSwitchesRef.current >= 3) {
             toast.error("CHEAT DETECTED: Auto-submitting..."); // 🎨 Error Toast
             handleSubmitTrigger(true); 
        } else {
             toast("Warning: Tab switching is monitored!", { icon: '⚠️' });
        }
      }
    };

    const handleFullScreenChange = () => {
        setIsFullScreen(!!document.fullscreenElement);
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && ["c","v","u"].includes(e.key)) || e.key === "F12") {
        e.preventDefault();
        toast.error("Action Blocked!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSubmitTrigger]);

  // --- HANDLERS ---
  const handleSelectOption = (optionIndex) => {
    const currentQuestion = questions[currentQIndex];
    setAnswers(prev => {
        const newAnswers = { ...prev, [currentQuestion.id]: optionIndex };
        answersRef.current = newAnswers; 
        return newAnswers;
    });
  };

  const enterFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log(err));
      setIsFullScreen(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) return <div className="text-center mt-20">Loading Exam...</div>;

  if (!isFullScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <h1 className="text-3xl font-bold mb-4 text-red-500">⚠️ Security Lockdown</h1>
        <p className="mb-8 text-center max-w-md">Full Screen is required to take this exam.</p>
        <button onClick={enterFullScreen} className="px-8 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-700 transition">Enter Full Screen</button>
      </div>
    );
  }

  if (!questions || questions.length === 0) return <div className="text-center mt-20">No questions found.</div>;

  const currentQuestion = questions[currentQIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col select-none font-sans relative">
      <Navbar />
      
      {/* --- CONFIRMATION MODAL --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all scale-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Submit Exam?</h3>
                <p className="text-gray-500 mb-6">Are you sure you want to finish? You cannot change your answers after submitting.</p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-3 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={submitExam}
                        className="flex-1 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition"
                    >
                        Yes, Submit
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`grow flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto w-full transition-all ${showConfirmModal ? 'blur-sm' : ''}`}>
        
        {/* Left: Question Card */}
        <div className="flex-1">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden h-full flex flex-col">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Question {currentQIndex + 1} of {questions.length}
              </h2>
              <div className={`text-lg font-mono px-4 py-2 rounded-lg font-bold border ${timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-gray-700 border-gray-200"}`}>
                ⏱️ {formatTime(timeLeft)}
              </div>
            </div>

            <p className="text-lg text-gray-800 mb-8 font-medium leading-relaxed">{currentQuestion.text}</p>

            <div className="space-y-4 grow">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === index;
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(index)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center group ${
                      isSelected 
                        ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold shadow-sm" 
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <span className={`mr-4 inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                      isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <button 
                disabled={currentQIndex === 0} 
                onClick={() => setCurrentQIndex((prev) => prev - 1)} 
                className="px-6 py-2 text-gray-500 font-medium disabled:opacity-30 hover:text-gray-800 transition-colors"
              >
                ← Previous
              </button>

              {currentQIndex === questions.length - 1 ? (
                <button 
                  onClick={() => handleSubmitTrigger(false)} 
                  className="px-8 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md transition-transform active:scale-95"
                >
                  Submit Exam
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentQIndex((prev) => prev + 1)} 
                  className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-transform active:scale-95"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Palette */}
        <div className="w-full md:w-80 shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 sticky top-6">
                <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase tracking-wide">Question Palette</h3>
                
                <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                        const isAnswered = answers[q.id] !== undefined;
                        const isCurrent = idx === currentQIndex;
                        return (
                            <button
                                key={idx}
                                onClick={() => setCurrentQIndex(idx)}
                                className={`h-10 w-10 rounded-lg text-sm font-bold transition-all ${
                                    isCurrent ? "bg-blue-600 text-white shadow-md scale-110 ring-2 ring-blue-200" : isAnswered ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
                    <div className="flex items-center text-xs text-gray-500">
                        <span className="w-3 h-3 bg-blue-600 rounded mr-2"></span> Current
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        <span className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></span> Answered
                    </div>
                     <div className="flex items-center text-xs text-gray-500">
                        <span className="w-3 h-3 bg-gray-100 rounded mr-2"></span> Not Visited
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                   🔒 Tabs: {tabSwitches}
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}