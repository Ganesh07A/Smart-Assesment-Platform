import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "STUDENT", // Default check
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send email, password, AND ROLE to backend
      const res = await axios.post("http://localhost:5000/api/auth/login", formData);
      
      // Save Token
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", res.data.role);
      localStorage.setItem("userName", res.data.name);

      toast.success(`Welcome back, ${res.data.name}!`);

      // Redirect based on role
      if (res.data.role === "TEACHER") {
        navigate("/teacher-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Login Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      <div className="grow flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
          
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">Welcome Back</h2>
          <p className="text-gray-500 text-center mb-8">Login to continue your exams</p>

          {/* Role Selector */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                formData.role === "STUDENT"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setFormData({ ...formData, role: "STUDENT" })}
            >
              🎓 Student
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                formData.role === "TEACHER"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setFormData({ ...formData, role: "TEACHER" })}
            >
              👨‍🏫 Teacher
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 text-white font-bold rounded-lg shadow-md transition-all ${
                formData.role === "STUDENT" ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              Login as {formData.role === "STUDENT" ? "Student" : "Teacher"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-bold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}