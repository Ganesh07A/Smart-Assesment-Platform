import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Skeleton from "../components/Skeleton.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Users,
  Activity,
  BarChart2,
  Trash2,
  FileSpreadsheet,
  Eye,
  Plus
} from "lucide-react";

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
  const [liveTracking, setLiveTracking] = useState(false)
  const prevActivityRef = useRef([]);

  /* ============================
      API CALLs
  ============================ */

  const fetchStats = useCallback(async () => {
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
  }, [liveTracking]);

  const fetchExamAnalytics = useCallback(async () => {
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
  }, []);

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
    } catch {
      toast.error("Failed to export results");
    }
  };

  useEffect(() => {
    fetchStats();
    fetchExamAnalytics();
  }, [fetchStats, fetchExamAnalytics]);

  useEffect(() => {
    if (!liveTracking) return;
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [liveTracking, fetchStats]);

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

    const hardestExam = [...examAnalytics].sort((a, b) => a.passRate - b.passRate)[0];
    const easiestExam = [...examAnalytics].sort((a, b) => b.passRate - a.passRate)[0];

    const avgScore = examAnalytics.length > 0
      ? Math.round(examAnalytics.reduce((acc, curr) => acc + parseFloat(curr.avgScore || 0), 0) / examAnalytics.length)
      : 0;

    return { totalAttempts, totalPassed, totalFailed, hardestExam, easiestExam, avgScore };
  }, [examAnalytics]);

  const chartData = sortedAnalytics.map((exam) => ({
    name: exam.title,
    avgScore: exam.avgScore,
  }));

  /* ============================
      UI RENDER
  ============================ */

  return (
    <DashboardLayout userName={userName}>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back, here's what's happening with your classes.
          </p>
        </div>
        <button
          onClick={() => navigate("/create-exam")}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm"
        >
          <Plus size={20} />
          Create New Exam
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Exams"
          value={stats.totalExams}
          icon={BookOpen}
          trend="+4%"
          trendUp={true}
          color="blue"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          trend="+12%"
          trendUp={true}
          color="purple"
        />
        <StatCard
          title="Active Exams"
          value={insights?.totalAttempts || 0} // Using total attempts as proxy for activity
          icon={Activity}
          customIndicator={<div className="w-2 h-2 bg-blue-500 rounded-full mt-2 animate-pulse"></div>}
          color="amber"
          subtitle="Attempts"
        />
        <StatCard
          title="Average Score"
          value={`${insights?.avgScore || 0}%`}
          icon={BarChart2}
          trend="+5.2%"
          trendUp={true}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Exams Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white">
            <h3 className="font-bold text-slate-900">Recent Exams</h3>
            <div className="flex gap-2">
              <select
                className="bg-gray-50 border border-gray-300 text-gray-700 py-1 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="attempts">Sort by Attempts</option>
                <option value="passRate">Sort by Pass Rate</option>
              </select>
              <button onClick={fetchExamAnalytics} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition">
                <Activity size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingAnalytics ? (
              <div className="p-6"><Skeleton /></div>
            ) : sortedAnalytics.length === 0 ? (
              <div className="p-10 text-center text-gray-400 italic">No exams created yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attempts</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedAnalytics.slice(0, 5).map((exam) => (
                    <tr key={exam.examId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">{exam.title}</p>
                        <p className="text-xs text-slate-500">ID: {String(exam.examId || "").substring(0, 8)}...</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {exam.attempts}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${exam.passRate >= 60 ? "bg-green-100 text-green-800" :
                          exam.passRate >= 35 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                          {exam.passRate}% Pass Rate
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/teacher/exams/${exam.examId}`)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => exportResults(exam.examId)}
                            className="text-slate-400 hover:text-green-600 transition-colors"
                            title="Export Results"
                          >
                            <FileSpreadsheet size={18} />
                          </button>
                          <button
                            onClick={() => deleteExam(exam.examId)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Exam"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Assessment Trends</h3>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2463eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2463eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="avgScore" stroke="#2463eb" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-slate-500 mb-2">Insight</p>
              <p className="text-xs text-slate-700 leading-relaxed">
                Average score across all exams is <span className="text-blue-600 font-bold">{insights?.avgScore || 0}%</span>.
                {insights?.hardestExam && (
                  <> Hardest exam: <span className="font-bold text-red-500">{insights.hardestExam.title}</span>.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const StatCard = ({ title, value, icon, trend, trendUp, color, customIndicator, subtitle }) => {
  const Icon = icon;
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${trendUp ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        )}
        {customIndicator}
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
    </div>
  );
};