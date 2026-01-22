import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";
import { TableSkeleton } from "../components/Skeleton";
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
} from "recharts";

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

      // Activate live tracking on first submission
      if (!liveTracking && newActivity.length > 0) {
        setLiveTracking(true);
      }

      // Prevent toast on first load
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
      setLoadingAnalytics(true); // ✅ add this
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
      setLoadingAnalytics(false); // ✅ safer
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

      // Convert JSON to worksheet (DECLARE ONCE)
      const worksheet = XLSX.utils.json_to_sheet(results);

      const headerStyle = {
        font: { bold: true },
        alignment: { horizontal: "center" },
        fill: {
          fgColor: { rgb: "E3F2FD" }, // light blue
        },
      };

      // Apply header style
      const headers = Object.keys(results[0] || {});
      headers.forEach((_, index) => {
        const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: index })];
        if (cell) cell.s = headerStyle;
      });

      results.forEach((_, rowIndex) => {
        [2, 3, 4, 6].forEach((colIndex) => {
          const cell =
            worksheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex })];
          if (cell) {
            cell.s = { alignment: { horizontal: "center" } };
          }
        });
      });

      // Auto column width
      const cols = Object.keys(results[0] || {}).map(() => ({ wch: 20 }));
      worksheet["!cols"] = cols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

      // Export file
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(file, `${examTitle}_Results.xlsx`);
      toast.success("Excel exported successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export results");
    }
  };

  const exportResultsPDF = async (examId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/exams/${examId}/results`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { examTitle, results } = res.data;

      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text(`Exam Results: ${examTitle}`, 14, 15);

      // Table
      const tableColumn = [
        "Name",
        "Email",
        "Score",
        "Total",
        "Percentage",
        "Result",
        "Tab Switches",
      ];

      const tableRows = results.map((r) => [
        r.name,
        r.email,
        r.score,
        r.totalScore,
        `${r.percentage}%`,
        r.result,
        r.tabSwitchCount,
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      doc.save(`${examTitle}_Results.pdf`);
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF");
    }
  };

  
  /* ============================
      EFFECTS
  ============================ */

  useEffect(() => {
    fetchStats();
    fetchExamAnalytics();
  }, []);

  //Conditional live polling
  useEffect(() => {
  if (!liveTracking) return;

  const interval = setInterval(fetchStats, 10000);
  return () => clearInterval(interval);
}, [liveTracking]);

  /* ============================
      SORTING & CHART DATA
  ============================ */

  const sortedAnalytics = [...examAnalytics].sort((a, b) => {
    if (sortBy === "attempts") return b.attempts - a.attempts;
    if (sortBy === "passRate") return b.passRate - a.passRate;
    return 0;
  });

  const barChartData = sortedAnalytics.map((exam) => ({
    name: exam.title,
    avgScore: exam.avgScore,
  }));

  const pieChartData = [
    {
      name: "Pass",
      value: sortedAnalytics.filter((e) => e.passRate >= 35).length,
    },
    {
      name: "Fail",
      value: sortedAnalytics.filter((e) => e.passRate < 35).length,
    },
  ];

  /* ============================
      UI
  ============================ */

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Hello, {userName} 👋
            </h1>
            <p className="text-gray-500 mt-1">
              Here is what's happening in your classes.
            </p>
          </div>
          <button
            onClick={() => navigate("/create-exam")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition"
          >
            + Create New Exam
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard title="Total Exams" value={stats.totalExams} icon="📚" />
          <StatCard
            title="Students Active"
            value={stats.totalStudents}
            icon="👥"
          />
          <StatCard title="System Status" value="Live" icon="⚡" />
        </div>

        {/* ANALYTICS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold">Exam Analytics</h3>

            <div className="flex gap-4 items-center text-sm">
              <button
                onClick={fetchExamAnalytics}
                className="font-medium text-blue-600 hover:text-blue-800 underline"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setSortBy("attempts")}
                className="underline"
              >
                Sort by Attempts
              </button>
              <button
                onClick={() => setSortBy("passRate")}
                className="underline"
              >
                Sort by Pass %
              </button>
            </div>
          </div>

          {loadingAnalytics ? (
            <TableSkeleton />
          ) : sortedAnalytics.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No exams created yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="p-4 text-left">Exam</th>
                      <th className="p-4 text-center">Attempts</th>
                      <th className="p-4 text-center">Avg</th>
                      <th className="p-4 text-center">Pass %</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAnalytics.map((exam) => (
                      <tr
                        key={exam.examId}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="p-4 font-medium">{exam.title}</td>
                        <td className="p-4 text-center">{exam.attempts}</td>
                        <td className="p-4 text-center">
                          {exam.attempts === 0 ? "—" : exam.avgScore}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              exam.passRate >= 60
                                ? "bg-green-100 text-green-700"
                                : exam.passRate >= 35
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {exam.passRate}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg"
                              onClick={() =>
                                navigate(`/teacher/exams/${exam.examId}`)
                              }
                            >
                              View
                            </button>
                            <button
                              className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-lg"
                              onClick={() => exportResults(exam.examId)}
                            >
                              Excel
                            </button>
                            <button
                              className="px-3 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg"
                              onClick={() => exportResultsPDF(exam.examId)}
                            >
                              PDF
                            </button>
                            <button
                              className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded-lg"
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

              {/* CHARTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 p-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                  <h4 className="text-lg font-bold mb-4">
                    Average Score per Exam
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgScore" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                  <h4 className="text-lg font-bold mb-4">
                    Overall Pass vs Fail
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label
                      >
                        <Cell />
                        <Cell />
                      </Pie>
                      <Tooltip />
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

/* ============================
   SMALL COMPONENTS
============================ */

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
    <div className="p-4 bg-gray-100 rounded-xl text-2xl">{icon}</div>
    <div>
      <p className="text-gray-500 text-sm font-bold uppercase">{title}</p>
      <h3 className="text-3xl font-bold">{value}</h3>
    </div>
  </div>
);

const RecentActivity = ({ activity }) => (
  <div className="bg-white rounded-2xl shadow-sm border mt-10 overflow-hidden">
    
    {/* Header */}
    <div className="p-6 border-b">
      <h3 className="text-xl font-bold">Recent Activity</h3>
    </div>

    {/* Scrollable body */}
    <div className="max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-10">
      {activity.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          🕒 Waiting for students to submit exams…
        </div>
      ) : (
        activity.map((sub) => (
          <div
            key={sub.id}
            className="p-6 flex justify-between items-center border-b last:border-b-0 hover:bg-gray-50"
          >
            <p>
              <b>{sub.student.name}</b> submitted{" "}
              <span className="text-blue-600">{sub.exam.title}</span>
            </p>

            <span
              className={`font-bold ${
                sub.score / sub.totalScore >= 0.35
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {sub.score}/{sub.totalScore}
            </span>
          </div>
        ))
      )}
    </div>
  </div>
);

