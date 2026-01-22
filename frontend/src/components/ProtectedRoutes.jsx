import  { Navigate } from "react-router-dom"

export default  function ProtectedRoutes({children, role}) {
    const token  = localStorage.getItem("token")
    const userRole  = localStorage.getItem("userRole")

    if(!token) {
        return <Navigate to="/login" replace />
    }

    if (role && userRole !== role) {
        return <Navigate to="/login" replace />;
    }

    return children
}