import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import CreateExam from "./pages/CreateExam.jsx";
import ExamView from "./pages/ExamView.jsx";
import DetailsView from "./pages/DetailsView.jsx";
import StudentResult from "./pages/StudentResult.jsx";
import StudentReport from "./pages/StudentReport.jsx";
import ProtectedRoutes from "./components/ProtectedRoutes.jsx";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {/* Removed dark: classes for a cleaner code */}
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoutes />}>
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/create-exam" element={<CreateExam />} />
            <Route path="/exam-details/:examId" element={<DetailsView />} />
            <Route path="/student/result" element={<StudentResult />} />
            <Route path="/exam/review/:examId" element={<StudentReport />} />
            <Route path="/teacher/exams/:examId" element={<DetailsView />} />
          </Route>
            <Route path="/take-exam/:examId" element={<ExamView />} />
          
          <Route path="*" element={<div className="p-10 text-center">404 - Page Not Found</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;