import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Users,
    BarChart2,
    Settings,
    Search,
    Bell,
    Menu,
    BookOpen,
    LogOut,
    GraduationCap,
    HelpCircle,
    TrendingUp
} from "lucide-react";

const DashboardLayout = ({ children, userName = "User", role = "teacher" }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userName");
        navigate("/login");
    };

    const teacherNavItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/teacher-dashboard" },
        { icon: FileText, label: "Exams", path: "/exams" },
        { icon: Users, label: "Students", path: "/students" },
        { icon: BarChart2, label: "Results", path: "/teacher-dashboard" },
        { icon: Settings, label: "Settings", path: "/teacher-dashboard" },
    ];

    const studentNavItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/student-dashboard" },
        { icon: FileText, label: "My Exams", path: "/my-exams" },
        // { icon: BarChart2, label: "Results", path: "/student-dashboard" },
        { icon: TrendingUp, label: "Learning Path", path: "/student-dashboard" },
        { icon: Settings, label: "Settings", path: "/student-dashboard" },
        { icon: HelpCircle, label: "Help Center", path: "/student-dashboard" },
    ];

    const navItems = role === "student" ? studentNavItems : teacherNavItems;
    const portalTitle = role === "student" ? "Student Portal" : "Teacher Portal";
    const userRoleLabel = role === "student" ? "Student" : "Senior Instructor";

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-slate-900">
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex flex-col
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
                <div className="p-6 flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center">
                        {role === "student" ? <GraduationCap size={24} /> : <BookOpen size={24} />}
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight leading-none">SmartAssess</h1>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">{portalTitle}</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path && item.label === "Dashboard";
                        return (
                            <Link
                                key={item.label}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                                    }`}
                            >
                                <item.icon size={22} className={isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    {role === "student" ? (
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                            <p className="text-xs font-semibold text-blue-600 mb-1">PRO PLAN</p>
                            <p className="text-xs text-slate-500 mb-3">Upgrade for detailed analytics & unlimited tests.</p>
                            <button className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-all">Upgrade Now</button>
                        </div>
                    ) : (
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Platform Status</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <p className="text-xs text-slate-600">All systems operational</p>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-10">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-slate-600 hover:bg-gray-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                    </div>

                    <div className="max-w-md w-full hidden lg:block">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-500 transition-all"
                                placeholder={role === "student" ? "Search exams, lessons..." : "Search exams or students..."}
                                type="text"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                <span className="px-1.5 py-0.5 rounded border border-gray-200 bg-white text-[10px] text-slate-400">⌘</span>
                                <span className="px-1.5 py-0.5 rounded border border-gray-200 bg-white text-[10px] text-slate-400">K</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                            <LogOut size={18} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                        <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>
                        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-slate-600 transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-slate-900 leading-none">{userName}</p>
                                <p className="text-xs text-slate-500 mt-1">{userRoleLabel}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${userName}&background=random`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
