import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
export default function TeacherDashboard() {
  // Dummy data for now (We will fetch this from Backend later)
  const exams = [
    { id: 1, title: "CS101 Midterm", date: "2024-02-20", status: "Active" },
    {
      id: 2,
      title: "Data Structures Quiz",
      date: "2024-02-25",
      status: "Scheduled",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto mt-10 p-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Manage your exams and student results
            </p>
          </div>
          <Link to="/create-exam">
            <button className="bg-blue-600 ...">+ Create New Exam</button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-400 text-sm font-medium uppercase">
              Total Exams
            </h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">12</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-400 text-sm font-medium uppercase">
              Students Active
            </h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">45</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-400 text-sm font-medium uppercase">
              Pending Reviews
            </h3>
            <p className="text-3xl font-bold text-orange-500 mt-2">3</p>
          </div>
        </div>

        {/* Recent Exams Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Recent Exams</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Exam Title</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map((exam) => (
                <tr
                  key={exam.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {exam.title}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{exam.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exam.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
