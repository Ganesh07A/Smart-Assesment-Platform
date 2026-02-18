import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Search, Plus, Loader2, Clock, FileText, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const Exams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:5000/api/exams/my-exams", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setExams(response.data);
        } catch (error) {
            console.error("Error fetching exams:", error);
            toast.error("Failed to load exams.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (examId) => {
        if (!window.confirm("Are you sure you want to delete this exam?")) return;

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`http://localhost:5000/api/exams/${examId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Exam deleted successfully");
            fetchExams(); // Refresh list
        } catch (error) {
            toast.error("Failed to delete exam");
        }
    };

    const filteredExams = exams.filter((exam) =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout role="teacher" userName={localStorage.getItem("userName")}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">My Exams</h1>
                        <p className="text-slate-500 mt-1">Manage and monitor all your created assessments</p>
                    </div>
                    <button
                        onClick={() => navigate("/create-exam")}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        <Plus size={20} />
                        Create New Exam
                    </button>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search exams by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* content */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">No exams found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                            {searchTerm
                                ? "No exams match your search criteria. Try a different keyword."
                                : "You haven't created any exams yet. Get started by creating your first assessment."}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => navigate("/create-exam")}
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Create your first exam
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Exam Name</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Duration</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600">Total Marks</th>
                                        <th className="px-6 py-4 font-semibold text-sm text-slate-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredExams.map((exam) => (
                                        <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{exam.title}</div>
                                                {exam.description && (
                                                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                                        {exam.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={16} className="text-slate-400" />
                                                    {exam.duration} mins
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                    {exam.totalMarks} Marks
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/teacher/exams/${exam.id}`)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(exam.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Exams;
