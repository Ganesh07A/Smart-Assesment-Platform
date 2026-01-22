import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard"; // Import this
import CreateExam from "./pages/CreateExam";
import StudentDashboard from "./pages/StudentDashboard";
import ExamView from "./pages/ExamView";
import Register from "./pages/Register";
import StudentResult from "./pages/StudentResult";
import StudentReport from "./pages/StudentReport";
import { Toaster } from "react-hot-toast";
import DetailsView from "./pages/DetailsView";
import ProtectedRoutes from "./components/ProtectedRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/teacher-dashboard"
          element={
            <ProtectedRoutes role="TEACHER">
              <TeacherDashboard />
            </ProtectedRoutes>
          }
        />
        {/* Use Component */}
        <Route path="/create-exam" element={<CreateExam />} />
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoutes role="STUDENT">
              <StudentDashboard />
            </ProtectedRoutes>
          }
        />
        <Route path="/take-exam/:examId" element={<ExamView />} />
        <Route path="/student/result" element={<StudentResult />} />
        <Route path="/exam/review/:examId" element={<StudentReport />} />
        <Route path="/teacher/exams/:examId" element={<DetailsView />} />
      </Routes>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </BrowserRouter>
  );
}
