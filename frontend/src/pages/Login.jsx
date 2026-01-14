import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [isTeacher, setIsTeacher] = useState(true); // Toggle state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1. Send data to your backend
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email:email,
        password:password,
      });

      // 2. Save the token securely
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      alert("Login Successful!");

      // 3. Redirect based on role
      if (res.data.user.role === "TEACHER") {
        navigate("/teacher-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err) {
      alert("Login Failed: " + (err.response?.data?.error || "Server Error"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-200">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600">Evalua</h1>
          <p className="text-gray-500 text-sm">Smart Assessment Platform</p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              isTeacher ? "bg-white shadow text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setIsTeacher(true)}
          >
            Teacher
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              !isTeacher ? "bg-white shadow text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setIsTeacher(false)}
          >
            Student
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all"
          >
            Login as {isTeacher ? "Teacher" : "Student"}
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-400 mt-4">
          Don't have an account? Ask your admin.
        </p>
      </div>
    </div>
  );
}