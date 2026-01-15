import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function ExamView() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // Stores { questionId: selectedOptionIndex }
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // 1. Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/questions/${examId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setQuestions(res.data);
        setLoading(false);
      } catch (err) {
        alert("Failed to load Exam");
        navigate("/student-dashboard");
      }
    };
    fetchQuestions();
  }, [examId, navigate]);

  // 2. Handle Option Selection (Renamed to match onClick)
  const handleSelectOption = (optionIndex) => {
    const currentQuestion = questions[currentQIndex];

    // Use functional update for reliability
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  // 3. Submit Exam
  const handleSubmit = async () => {
    const confirmSubmit = window.confirm("Are you sure you want to submit?");
    if (!confirmSubmit) return;

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/exams/submit",
        {
          examId: examId,
          answers: answers,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show the result!
      alert(
        `Exam Submitted!\n\nYour Score: ${res.data.score} / ${res.data.totalMarks}\nPercentage: ${res.data.percentage}%`
      );

      navigate("/student-dashboard");
    } catch (err) {
      console.error(err);
      alert("Submission failed! Check console.");
    }
  };

  if (loading) return <div className="text-center mt-20">Loading Exam...</div>;

  // Safety check in case exam has no questions
  if (!questions || questions.length === 0) {
    return (
      <div className="text-center mt-20">No questions found for this exam.</div>
    );
  }

  const currentQuestion = questions[currentQIndex];
  const isLastQuestion = currentQIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="grow flex flex-col items-center justify-center p-6">
        {/* Question Card */}
        <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Question {currentQIndex + 1} of {questions.length}
            </h2>
            <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
              Time Left: --:--
            </span>
          </div>

          {/* Question Text */}
          <p className="text-lg text-gray-700 mb-8 font-medium">
            {currentQuestion.text}
          </p>

          {/* Options Grid */}
          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => {
              // Check if selected
              const isSelected = answers[currentQuestion.id] === index;

              return (
                <button
                  key={index}
                  // FIX: This now matches the function name above
                  onClick={() => handleSelectOption(index)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-md"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`mr-3 inline-block w-8 h-8 text-center leading-8 rounded-full ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Footer Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => prev - 1)}
              className="px-6 py-2 text-gray-600 font-medium disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Previous
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                className="px-8 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md transition-colors"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
