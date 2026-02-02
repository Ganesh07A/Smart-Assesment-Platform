import { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; 
import toast from "react-hot-toast";
import Skeleton from "../components/Skeleton.jsx"; 
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#10B981", "#EF4444", "#3B82F6", "#F59E0B"]; 

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Teacher";

  /* ============================
      STATE
  ============================ */

  const [stats, setStats] = useState({
    totalExams: 0,
    totalStudents: 0,
    recentActivity: [],
  });

  const [examAnalytics, setExamAnalytics] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [sortBy, setSortBy] = useState("attempts");
  const [liveTracking, setLiveTracking ] = useState(false)
  const prevActivityRef = useRef([]);

  /* ============================
      API CALLs
  ============================ */

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:5000/api/exams/teacher/stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const newActivity = res.data.recentActivity || [];

      if (!liveTracking && newActivity.length > 0) {
        setLiveTracking(true);
      }

      if (prevActivityRef.current.length > 0 && newActivity.length > 0) {
        const prevLatest = prevActivityRef.current[0]?.id;
        const newLatest = newActivity[0]?.id;

        if (prevLatest !== newLatest) {
          const sub = newActivity[0];
          toast.success(
            `🎉 ${sub.student.name} submitted "${sub.exam.title}" — ${sub.score}/${sub.totalScore}`,
          );
        }
      }

      prevActivityRef.current = newActivity;
      setStats(res.data);
    } catch {
      toast.error("Failed to load dashboard stats");
    }
  };

  const fetchExamAnalytics = async () => {
    try {
      setLoadingAnalytics(true); 
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:5000/api/analytics/teacher/exams",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setExamAnalytics(res.data);
    } catch {
      toast.error("Failed to load exam analytics");
    } finally {
      setLoadingAnalytics(false); 
    }
  };

  /* ============================
      ACTIONS
  ============================ */

  const deleteExam = async (examId) => {
    if (!window.confirm("This will delete the exam and all results. Continue?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Exam deleted");
      fetchStats();
      fetchExamAnalytics();
    } catch {
      toast.error("Failed to delete exam");
    }
  };

  const exportResults = async (examId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/exams/${examId}/results`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { examTitle, results } = res.data;
      const worksheet = XLSX.utils.json_to_sheet(results);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(file, `${examTitle}_Results.xlsx`);
      toast.success("Excel exported successfully");
    } catch (err) {
      toast.error("Failed to export results");
    }
  };

  useEffect(() => {
    fetchStats();
    fetchExamAnalytics();
  }, []);

  useEffect(() => {
    if (!liveTracking) return;
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [liveTracking]);

  /* ============================
      COMPUTED DATA
  ============================ */

  const sortedAnalytics = useMemo(() => {
    return [...examAnalytics].sort((a, b) => {
      if (sortBy === "attempts") return b.attempts - a.attempts;
      if (sortBy === "passRate") return b.passRate - a.passRate;
      return 0;
    });
  }, [examAnalytics, sortBy]);

  const insights = useMemo(() => {
    if (examAnalytics.length === 0) return null;
    
    const totalAttempts = examAnalytics.reduce((acc, curr) => acc + curr.attempts, 0);
    const totalPassed = examAnalytics.reduce((acc, curr) => acc + (curr.passCount || 0), 0);
    const totalFailed = examAnalytics.reduce((acc, curr) => acc + (curr.failCount || 0), 0);

    const hardestExam = [...examAnalytics].sort((a,b) => a.passRate - b.passRate)[0];
    const easiestExam = [...examAnalytics].sort((a,b) => b.passRate - a.passRate)[0];

    return { totalAttempts, totalPassed, totalFailed, hardestExam, easiestExam };
  }, [examAnalytics]);

  const barChartData = sortedAnalytics.map((exam) => ({
    name: exam.title,
    avgScore: exam.avgScore,
  }));

  const pieChartData = insights ? [
    { name: "Passed", value: insights.totalPassed },
    { name: "Failed", value: insights.totalFailed },
  ] : [];

  /* ============================
      UI RENDER
  ============================ */

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      

      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Hello, {userName} 👋
            </h1>
            <p className="text-gray-500 mt-1">
              Live dashboard overview.
            </p>
          </div>
          <button
            onClick={() => navigate("/create-exam")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span>+</span> Create New Exam
          </button>
        </div>

        {/* 📊 MAIN STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total Exams" value={stats.totalExams} icon="📚" color="blue" />
          <StatCard title="Active Students" value={stats.totalStudents} icon="👥" color="purple" />
          <StatCard title="Total Attempts" value={insights?.totalAttempts || 0} icon="📝" color="orange" />
          <StatCard title="System Status" value="Live 🟢" icon="⚡" color="green" />
        </div>

        {/* 🧠 INSIGHTS ALERTS */}
        {insights && insights.totalAttempts > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="bg-red-100 p-2 rounded-lg text-2xl">🔥</div>
                    <div>
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Needs Attention (Hardest Exam)</p>
                        <p className="text-red-900 font-bold">{insights.hardestExam.title}</p>
                        <p className="text-red-700 text-xs">Pass Rate: {insights.hardestExam.passRate}%</p>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-lg text-2xl">🏆</div>
                    <div>
                        <p className="text-xs font-bold text-green-500 uppercase tracking-wide">Top Performer (Easiest Exam)</p>
                        <p className="text-green-900 font-bold">{insights.easiestExam.title}</p>
                        <p className="text-green-700 text-xs">Avg Score: {insights.easiestExam.avgScore}</p>
                    </div>
                </div>
            </div>
        )}

        {/* ANALYTICS TABLE & CHARTS */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800">Exam Analytics</h3>

            <div className="flex gap-4 items-center text-sm">
              <button onClick={fetchExamAnalytics} className="font-bold text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg transition">
                🔄 Refresh
              </button>
              <select 
                className="bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="attempts">Sort by Attempts</option>
                <option value="passRate">Sort by Pass Rate</option>
              </select>
            </div>
          </div>

          {loadingAnalytics ? (
            <Skeleton />
          ) : sortedAnalytics.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No exams created yet.
            </div>
          ) : (
            <>
              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="p-4 text-left">Exam Title</th>
                      <th className="p-4 text-center">Attempts</th>
                      <th className="p-4 text-center">Avg Score</th>
                      <th className="p-4 text-center">Pass Rate</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedAnalytics.map((exam) => (
                      <tr key={exam.examId} className="hover:bg-gray-50 transition">
                        <td className="p-4 font-bold text-gray-700">{exam.title}</td>
                        <td className="p-4 text-center text-gray-600">{exam.attempts}</td>
                        <td className="p-4 text-center font-mono font-medium">{exam.attempts === 0 ? "—" : exam.avgScore}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full ${exam.passRate >= 60 ? 'bg-green-500' : exam.passRate >= 35 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${exam.passRate}%`}}></div>
                             </div>
                             <span className="text-xs font-bold">{exam.passRate}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                              onClick={() => navigate(`/teacher/exams/${exam.examId}`)}
                            >
                              View
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                              onClick={() => exportResults(exam.examId)}
                            >
                              XLSX
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                              onClick={() => deleteExam(exam.examId)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHARTS SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-t bg-gray-50/30">
                
                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h4 className="text-gray-800 font-bold mb-6 flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded text-blue-600">📊</span> Average Scores
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                      <YAxis />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="avgScore" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h4 className="text-gray-800 font-bold mb-6 flex items-center gap-2">
                    <span className="bg-purple-100 p-1 rounded text-purple-600">🍰</span> Overall Pass/Fail Ratio
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === "Passed" ? "#10B981" : "#EF4444"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RECENT ACTIVITY */}
        <RecentActivity activity={stats.recentActivity} />
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600",
        green: "bg-green-50 text-green-600",
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
            <div className={`p-4 rounded-xl text-2xl ${colorClasses[color] || "bg-gray-100"}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-extrabold text-gray-800">{value}</h3>
            </div>
        </div>
    );
};

const RecentActivity = ({ activity }) => (
  <div className="bg-white rounded-2xl shadow-sm border mt-10 overflow-hidden">
    <div className="p-6 border-b bg-gray-50/50">
      <h3 className="text-lg font-bold text-gray-800">Recent Submissions</h3>
    </div>
    <div className="max-h-[320px] overflow-y-auto">
      {activity.length === 0 ? (
        <div className="p-10 text-center text-gray-400 italic">
          No recent activity... yet.
        </div>
      ) : (
        activity.map((sub) => (
          <div key={sub.id} className="p-5 flex justify-between items-center border-b last:border-b-0 hover:bg-gray-50 transition">
            <div>
                <p className="font-medium text-gray-800">{sub.student.name}</p>
                <p className="text-sm text-gray-500">Submitted <span className="font-bold text-blue-600">{sub.exam.title}</span></p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-sm ${sub.score / sub.totalScore >= 0.35 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {sub.score} / {sub.totalScore}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);