import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";
import { TableSkeleton } from "../components/Skeleton";

export default function DetailsView() {
    const { examId } = useParams()
    const navigate = useNavigate()

// need 4 states 
//     exam        // summary info
// submissions // student rows
// loading     // loading state
// search      // filter text
    const [exam, setExam] = useState(null)
    const [submissions, setSubmissions] = useState([])
    const [loading , setLoading ] = useState(true)
    const [ search, setSearch ] = useState("")

    useEffect(()=> {
        const fetchExamDetails  = async () => {
            try {
                const token = localStorage.getItem("token")
                const res = await axios.get(`http://localhost:5000/api/exams/${examId}/details`, {
                    headers: { Authorization: `Bearer ${token}`}
                })

                setExam(res.data.exam)
                setSubmissions(res.data.submissions)
                setLoading(false)
            }catch(err) {
                console.log(err)
                toast.error("Failed to load exam details")
                setLoading(false)
            }
        }
        fetchExamDetails()
    }, [examId])

    //  Search filter
    const filteredSubmissions = submissions.filter((s)=>{
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    })

    if (loading) {
        return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="p-10 text-center text-gray-400">
            <TableSkeleton/>
            </div>
        </div>
        );
    }

    if (!exam) {
        return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="p-10 text-center text-red-500">
            Exam not found or access denied.
            </div>
        </div>
        );
    }

    return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {exam.title}
            </h1>
            <p className="text-gray-500 mt-1">
              Detailed performance overview
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            ← Back
          </button>
        </div>

        {/* EXAM SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SummaryCard label="Attempts" value={exam.attempts} />
          <SummaryCard label="Average Score" value={exam.avgScore} />
          <SummaryCard label="Pass Rate" value={`${exam.passRate}%`} />
        </div>

        {/* SEARCH */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search student by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 border rounded-lg"
          />
        </div>

        {/* STUDENT TABLE */}
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
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-6 text-center text-gray-400"
                  >
                    No matching students
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s, idx) => (
                  <tr
                    key={idx}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div className="font-medium">{s.studentName}</div>
                      <div className="text-xs text-gray-400">
                        {s.email}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      {s.score}/{s.totalScore}
                    </td>

                    <td className="p-4 text-center">
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

                    <td
                      className={`p-4 text-center font-bold ${
                        s.tabSwitchCount > 3
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {s.tabSwitchCount}
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


/* ============================
   SMALL COMPONENT
============================ */

const SummaryCard = ({ label, value }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border">
    <p className="text-gray-500 text-sm font-bold uppercase">
      {label}
    </p>
    <h3 className="text-3xl font-bold mt-1">{value}</h3>
  </div>
);