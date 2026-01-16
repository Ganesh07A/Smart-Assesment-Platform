import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function ExamView() {
  const { examId } = useParams();
  const navigate = useNavigate();

  // --- STATE ---
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0); 
  
  // 1. We use Refs for values needed inside Event Listeners (Fixes Stale Closure bug)
  const tabSwitchesRef = useRef(0);
  const answersRef = useRef({});
  
  // We still use State for rendering the UI
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
        
        if (currentExam) {
            setTimeLeft(currentExam.duration * 60); 
        }
        setLoading(false);
      } catch (err) {
        alert("Failed to load exam!");
        navigate("/student-dashboard");
      }
    };
    fetchExamData();
  }, [examId, navigate]);

  // --- SUBMIT FUNCTION (Now reads from Refs) ---
  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (!autoSubmit) {
       const confirmSubmit = window.confirm("Are you sure you want to submit?");
       if (!confirmSubmit) return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // 👇 KEY FIX: Read from the Refs to get the LATEST values
      const finalAnswers = answersRef.current;
      const finalCheatCount = tabSwitchesRef.current;

      console.log("Submitting with Cheat Count:", finalCheatCount); // Debug Log

      const res = await axios.post("http://localhost:5000/api/exams/submit", {
        examId: examId,
        answers: finalAnswers,
        tabSwitchCount: finalCheatCount 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Exam Submitted!\nScore: ${res.data.score}/${res.data.total}\nPercentage: ${res.data.percentage}%`);
      
      if (document.fullscreenElement) {
         document.exitFullscreen().catch(err => console.log(err));
      }
      navigate("/student-dashboard");
    } catch (err) {
      console.error(err);
      // alert("Submission failed!");
    }
  }, [examId, navigate]);

  // --- 2. TIMER LOGIC ---
  useEffect(() => {
    if (loading || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, timeLeft, handleSubmit]);

  // --- 3. SECURITY LOGIC ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Update Ref immediately
        tabSwitchesRef.current += 1;
        
        // Update State for UI (optional, but good for showing the user)
        setTabSwitches(tabSwitchesRef.current);

        const count = tabSwitchesRef.current;

        if (count >= 3) {
             alert("CHEAT DETECTED: Too many tab switches. Auto-submitting.");
             handleSubmit(true); 
        } else {
             alert(`WARNING: Tab switching is monitored! (${count}/3 warnings)`);
        }
      }
    };

    const handleFullScreenChange = () => {
        if (!document.fullscreenElement) {
          setIsFullScreen(false);
        } else {
          setIsFullScreen(true);
        }
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && ["c","v","u"].includes(e.key)) || e.key === "F12") {
        e.preventDefault();
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
  }, [handleSubmit]); // handleSubmit is now stable

  // --- HANDLER ---
  const handleSelectOption = (optionIndex) => {
    const currentQuestion = questions[currentQIndex];
    
    // Update State (for UI highlight)
    setAnswers(prev => {
        const newAnswers = { ...prev, [currentQuestion.id]: optionIndex };
        // Update Ref (for Submission logic)
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

  if (loading) return <div className="text-center mt-20">Loading Security...</div>;

  if (!isFullScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <h1 className="text-3xl font-bold mb-4 text-red-500">⚠️ Security Lockdown</h1>
        <p className="mb-8 text-center max-w-md">Full Screen is required.</p>
        <button onClick={enterFullScreen} className="px-8 py-3 bg-blue-600 rounded-lg font-bold">Enter Full Screen</button>
      </div>
    );
  }

  // Check for empty questions AFTER full screen check
  if (!questions || questions.length === 0) {
    return <div className="text-center mt-20">No questions found for this exam.</div>;
  }

  const currentQuestion = questions[currentQIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col select-none">
      <Navbar />
      <main className="grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Question {currentQIndex + 1} of {questions.length}</h2>
            <div className={`text-lg font-mono px-4 py-2 rounded-lg font-bold border ${timeLeft < 60 ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-100"}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>

          <p className="text-lg text-gray-700 mb-8 font-medium">{currentQuestion.text}</p>

          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestion.id] === index;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(index)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <span className={`mr-3 inline-block w-8 h-8 text-center leading-8 rounded-full ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>{String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button disabled={currentQIndex === 0} onClick={() => setCurrentQIndex((prev) => prev - 1)} className="px-6 py-2 text-gray-600 disabled:opacity-50">← Previous</button>
            {currentQIndex === questions.length - 1 ? (
              <button onClick={() => handleSubmit(false)} className="px-8 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Submit Exam</button>
            ) : (
              <button onClick={() => setCurrentQIndex((prev) => prev + 1)} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Next →</button>
            )}
          </div>
        </div>
        
        <p className="mt-6 text-xs text-gray-400">🔒 Secured by Smart Assessment Defense Grid • Tab Switches: {tabSwitches}</p>
      </main>
    </div>
  );
}