import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Timer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Grid,
  Maximize,
  ShieldAlert,
} from "lucide-react";

export default function ExamView() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // ---------------- STATE ----------------
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());

  const [timeLeft, setTimeLeft] = useState(0);

  // Security
  const [hasStarted, setHasStarted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const MAX_WARNINGS = 3;

  // ---------------- FETCH EXAM ----------------
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const token = localStorage.getItem("token");

        const examRes = await axios.get(
          `http://localhost:5000/api/exams/${examId}/details`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const qRes = await axios.get(
          `http://localhost:5000/api/exams/${examId}/questions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setExam(examRes.data.exam);
        setQuestions(qRes.data.questions || qRes.data);
        setTimeLeft(examRes.data.exam.duration * 60);
        setLoading(false);
      } catch {
        toast.error("Failed to load exam");
        navigate("/student-dashboard");
      }
    };

    fetchExam();
  }, [examId, navigate]);

  // ---------------- TIMER ----------------
  useEffect(() => {
    if (hasStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            handleSubmit("Time Up");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [hasStarted, timeLeft]);

  // ---------------- SUBMIT ----------------
  const handleSubmit = useCallback(
    async (reason = "Normal") => {
      try {
        clearInterval(timerRef.current);
        const token = localStorage.getItem("token");

        await axios.post(
          "http://localhost:5000/api/exams/submit",
          { examId, answers, tabSwitchCount: warningCount },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        toast.success(
          reason === "Auto"
            ? "Exam auto-submitted due to violations"
            : "Exam submitted successfully"
        );

        navigate("/student/result");
      } catch {
        toast.error("Submission failed");
      }
    },
    [examId, answers, warningCount, navigate]
  );

  // ---------------- WARNINGS ----------------
  const triggerWarning = useCallback(
    (msg) => {
      setWarningCount((c) => {
        const next = c + 1;
        toast.error(`⚠ Warning ${next}/${MAX_WARNINGS} — ${msg}`, {
          style: { background: "#111", color: "#fff" },
        });

        if (next >= MAX_WARNINGS) {
          handleSubmit("Auto");
        }
        return next;
      });
    },
    [handleSubmit]
  );

  // ---------------- FULLSCREEN & TAB ----------------
  useEffect(() => {
    if (!hasStarted) return;

    const onFullscreen = () => {
      const active = !!document.fullscreenElement;
      setIsFullScreen(active);

      if (!active) {
        clearInterval(timerRef.current);
        triggerWarning("Full screen exited");
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        triggerWarning("Tab switched");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hasStarted, triggerWarning]);

  // ---------------- START EXAM ----------------
  const startExam = () => {
    document.documentElement
      .requestFullscreen()
      .then(() => {
        setHasStarted(true);
        setIsFullScreen(true);
      })
      .catch(() => toast.error("Fullscreen permission denied"));
  };

  // ---------------- HELPERS ----------------
  const currentQ = questions[currentQIndex];

  const getStatusClass = (index) => {
    const q = questions[index];
    if (index === currentQIndex) return "bg-blue-600 text-white";
    if (markedForReview.has(q.id)) return "bg-purple-500 text-white";
    if (answers[q.id] !== undefined) return "bg-green-500 text-white";
    return "bg-gray-200 text-gray-700";
  };

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading exam…
      </div>
    );
  }

  // ---------------- LOBBY ----------------
  if (!hasStarted) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 w-[420px] text-center space-y-6">
          <Maximize className="mx-auto text-blue-600" size={48} />
          <h1 className="text-xl font-semibold">
            Full Screen Required to Take Exam
          </h1>
          <p className="text-sm text-gray-500">
            Exiting full screen or switching tabs will generate warnings.
          </p>
          <button
            onClick={startExam}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
          >
            Enter Full Screen & Start
          </button>
        </div>
      </div>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <div
      className="h-screen flex flex-col bg-gray-50 overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* HEADER */}
      <header className="h-14 bg-gray-900 text-white px-6 flex justify-between items-center">
        <h1 className="text-sm font-semibold truncate">{exam.title}</h1>

        <div className="flex items-center gap-4">
          <div className="bg-gray-800 px-4 py-1 rounded-md font-mono text-sm">
            ⏱ {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, "0")}
          </div>

          <button
            onClick={() => window.confirm("Submit exam?") && handleSubmit()}
            className="border border-red-500 text-red-400 px-4 py-1 rounded-md text-sm"
          >
            Submit
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex flex-1">
        {/* QUESTION */}
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-white w-[700px] rounded-2xl p-8 border">
            <p className="text-xs text-gray-500 mb-2">
              Question {currentQIndex + 1} of {questions.length}
            </p>

            <h2 className="text-xl font-medium text-gray-900 mb-6">
              {currentQ.text}
            </h2>

            {currentQ.type === "MCQ" && (
              <div className="space-y-3">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [currentQ.id]: i }))
                    }
                    className={`flex gap-4 p-4 rounded-lg border w-full text-left
                    ${
                      answers[currentQ.id] === i
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full border flex items-center justify-center">
                      {String.fromCharCode(65 + i)}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* PALETTE */}
        <aside className="w-64 bg-gray-50 border-l p-6">
          <div className="flex items-center gap-2 mb-4 font-medium">
            <Grid size={16} /> Question Palette
          </div>

          <div className="grid grid-cols-5 gap-3">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQIndex(i)}
                className={`w-10 h-10 rounded-md text-sm ${getStatusClass(i)}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="h-16 bg-white border-t px-6 flex justify-between items-center">
        <button
          onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
          disabled={currentQIndex === 0}
          className="flex items-center gap-2 text-gray-600 disabled:opacity-50"
        >
          <ChevronLeft /> Previous
        </button>

        <button
          onClick={() =>
            setCurrentQIndex((i) => Math.min(questions.length - 1, i + 1))
          }
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-md"
        >
          Next <ChevronRight />
        </button>
      </footer>
    </div>
  );
}
