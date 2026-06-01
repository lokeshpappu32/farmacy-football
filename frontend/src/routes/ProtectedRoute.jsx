import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../utils/auth";

export default function ProtectedRoute({ role }) {
  const { isAuthed, role: currentRole } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (role && ![].concat(role).includes(currentRole)) return <Navigate to={homeForRole(currentRole)} replace />;
  if (!role && currentRole !== "participant") return <Navigate to={homeForRole(currentRole)} replace />;
  return <Outlet />;
}
