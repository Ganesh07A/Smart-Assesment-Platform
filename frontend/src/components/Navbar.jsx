import { useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, GraduationCap } from "lucide-react";


export default function Navbar() {
  const navigate = useNavigate();
  
  const userName = localStorage.getItem("userName");
  const userRole = localStorage.getItem("userRole");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2">
        <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">
          <GraduationCap size={24} />
        </div>
        <span className="text-xl font-bold text-gray-800 dark:text-white transition-colors">
          Smart<span className="text-blue-600 dark:text-blue-400">Exam</span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Theme Toggle Button */}
      

        <button 
          onClick={() => navigate(userRole === 'TEACHER' ? '/teacher-dashboard' : '/student-dashboard')}
          className="text-gray-600 dark:text-gray-300 font-medium hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2 transition"
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>
        
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        <span className="text-gray-600 dark:text-gray-300 font-medium">
         Welcome, {userName || "User"}
        </span>
        
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold transition-colors flex items-center gap-1"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
}