import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import toast from "react-hot-toast";
import Skeleton from "../components/Skeleton.jsx";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react"; 

export default function DetailsView() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/exams/${examId}/details`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setExam(res.data.exam);
        setSubmissions(res.data.submissions);
        setLoading(false);
      } catch (err) {
        console.log(err);
        toast.error("Failed to load exam details");
        setLoading(false);
      }
    };
    fetchExamDetails();
  }, [examId]);

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportExcel = () => {
    if (!exam || filteredSubmissions.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(
      filteredSubmissions.map((s) => ({
        "Student Name": s.studentName,
        Email: s.email,
        Score: s.score,
        Total: s.totalScore,
        Percentage: `${s.percentage}%`,
        Result: s.result,
        "Tab Switches": s.tabSwitchCount,
        "Submitted At": new Date(s.submittedAt).toLocaleString(),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    
    const wscols = [
        { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 25 }
    ];
    worksheet['!cols'] = wscols;

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(data, `${exam.title}_Detailed_Report.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const handleExportPDF = () => {
    if (!exam || filteredSubmissions.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Exam Details: ${exam.title}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = [
      "Name",
      "Email",
      "Score",
      "Total",
      "%",
      "Result",
      "Tabs",
      "Time",
    ];
    
    const tableRows = filteredSubmissions.map((s) => [
      s.studentName,
      s.email,
      s.score,
      s.totalScore,
      `${s.percentage}%`,
      s.result,
      s.tabSwitchCount,
      new Date(s.submittedAt).toLocaleTimeString(),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`${exam.title}_Detailed_Report.pdf`);
    toast.success("PDF exported successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="p-10">
          <Skeleton />
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="p-10 text-center text-red-500">
          Exam not found or access denied.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      

      <div className="max-w-7xl mx-auto px-6 py-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-gray-200 transition text-gray-500"
              >
                <ArrowLeft size={24} />
              </button>
              {exam.title}
            </h1>
            <p className="text-gray-500 mt-1 ml-12">
              Detailed performance overview
            </p>
          </div>

          <div className="flex gap-3 ml-12 md:ml-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-bold text-sm"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm font-bold text-sm"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SummaryCard label="Attempts" value={exam.attempts} />
          <SummaryCard label="Average Score" value={exam.avgScore} />
          <SummaryCard label="Pass Rate" value={`${exam.passRate}%`} />
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="p-4 text-left">Student</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4 text-center">%</th>
                <th className="p-4 text-center">Result</th>
                <th className="p-4 text-center">Tab Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    No matching students found.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{s.studentName}</div>
                      <div className="text-xs text-gray-500">{s.email}</div>
                    </td>

                    <td className="p-4 text-center font-mono font-medium">
                      {s.score} <span className="text-gray-400">/ {s.totalScore}</span>
                    </td>

                    <td className="p-4 text-center font-bold text-gray-700">
                      {s.percentage}%
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          s.result === "PASS"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.result}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      {s.tabSwitchCount > 3 ? (
                        <span className="text-red-600 font-bold flex items-center justify-center gap-1">
                           ⚠️ {s.tabSwitchCount}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-bold">{s.tabSwitchCount}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const SummaryCard = ({ label, value }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
      {label}
    </p>
    <h3 className="text-3xl font-extrabold text-gray-800 mt-2">{value}</h3>
  </div>
);