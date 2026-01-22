import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">
          E
        </div>
        <span className="text-xl font-bold text-gray-800">Evalua</span>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-gray-600 font-medium">
          Welcome, <span className="text-blue-600">{userName || "User"}</span>
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700 font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}