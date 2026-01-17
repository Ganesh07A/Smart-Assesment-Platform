import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function StudentResult() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get data passed from the ExamView page
  const resultData = location.state;

  if (!resultData) {
    return <div className="text-center mt-20">No result data found. Please take an exam first.</div>;
  }

  const { score, total, percentage } = resultData;
  const isPassed = parseFloat(percentage) >= 35; // 35% Passing Criteria

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="flex flex-col items-center justify-center p-6 mt-10">
        
        {/* RESULT CARD */}
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
          
          {/* Top Decorative Line */}
          <div className={`absolute top-0 left-0 w-full h-2 ${isPassed ? "bg-green-500" : "bg-red-500"}`}></div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Exam Result</h1>
          <p className="text-gray-500 mb-8">Here is how you performed</p>

          {/* CIRCLE GRAPH */}
          <div className="relative w-48 h-48 mx-auto mb-8">
            {/* Outer Ring */}
            <div className={`w-full h-full rounded-full flex items-center justify-center border-8 ${isPassed ? "border-green-100" : "border-red-100"}`}>
               {/* Inner Circle with Score */}
               <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center ${isPassed ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  <span className="text-4xl font-extrabold">{percentage}%</span>
                  <span className="text-sm font-medium uppercase tracking-wider mt-1">{isPassed ? "Passed" : "Failed"}</span>
               </div>
            </div>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold">Your Score</p>
                <p className="text-2xl font-bold text-gray-800">{score}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold">Total Marks</p>
                <p className="text-2xl font-bold text-gray-800">{total}</p>
            </div>
          </div>

          {/* BUTTON */}
          <button 
            onClick={() => navigate("/student-dashboard")}
            className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Back to Dashboard
          </button>

        </div>
      </div>
    </div>
  );
}