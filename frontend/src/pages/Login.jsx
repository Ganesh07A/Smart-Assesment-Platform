import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", res.data.role);
      localStorage.setItem("userName", res.data.name);

      toast.success("Login Successful!");

      if (res.data.role === "TEACHER") navigate("/teacher-dashboard");
      else navigate("/student-dashboard");
    } catch (err) {
      console.error("Full Login Error Context:", err);
      // Robust error message extraction
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "An unexpected error occurred during login";

      toast.error(typeof errorMsg === "string" ? errorMsg : "Login Failed (Technical Error)");
    }
  };

  return (
    <div className="bg-background-light min-h-screen flex flex-col font-display selection:bg-primary/30">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px]">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-primary/10 p-3 rounded-xl mb-4 group hover:bg-primary/20 transition-colors cursor-default">
              <span className="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            </div>
            <h2 className="text-[#111318] text-xl font-bold tracking-tight">Smart Assessment</h2>
          </div>

          {/* Login Card */}
          <div className="bg-white p-8 md:p-10 rounded-xl shadow-sm border border-slate-200 animate-in zoom-in-95 duration-500">
            <div className="mb-8 text-center sm:text-left">
              <h1 className="text-[#111318] text-2xl font-bold leading-tight mb-2">Welcome Back</h1>
              <p className="text-slate-500 text-sm">Enter your credentials to access your dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <input
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="name@university.edu"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <a className="text-xs font-medium text-primary hover:underline cursor-pointer" onClick={() => toast.error("Contact admin to reset password")}>
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-3">
                <input
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                  id="remember"
                  type="checkbox"
                />
                <label className="text-sm text-slate-600 select-none cursor-pointer" htmlFor="remember">
                  Remember me for 30 days
                </label>
              </div>

              {/* Sign In Button */}
              <button
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-all active:scale-[0.98] shadow-sm shadow-primary/20 mt-2"
                type="submit"
              >
                Sign In
              </button>
            </form>

            {/* Create Account */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?
                <Link className="text-primary font-semibold hover:underline ml-1" to="/register">
                  Create account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Section */}
          <footer className="mt-8 text-center px-4 animate-in fade-in duration-1000">
            <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-widest font-medium">
              © 2026 Smart Assessment Platform
            </p>
            <p className="mt-2 text-[10px] text-slate-400 max-w-xs mx-auto">
              Authorized academic personnel only. All access and activity is monitored for security and compliance.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}