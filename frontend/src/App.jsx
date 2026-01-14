import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard"; // Import this
import CreateExam from "./pages/CreateExam";

function StudentPlaceholder() {
  return <h1 className="text-center mt-10 text-2xl">Student Dashboard (Coming Soon)</h1>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} /> {/* Use Component */}
        <Route path="/student-dashboard" element={<StudentPlaceholder />} />
        <Route path="/create-exam" element={<CreateExam />} />
      </Routes>
    </BrowserRouter>
  );
}