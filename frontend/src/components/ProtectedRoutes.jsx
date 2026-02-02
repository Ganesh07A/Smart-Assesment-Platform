import { Navigate, Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function ProtectedRoutes({ role }) {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");

    // 1. Check if user is logged in
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Check for role-based access
    if (role && userRole !== role) {
        return <Navigate to="/login" replace />;
    }

    // 3. Render the Layout (Navbar + Child Route content)
    return (
        <>
            <Navbar />
            <main className="p-6">
                <Outlet />
            </main>
        </>
    );
}