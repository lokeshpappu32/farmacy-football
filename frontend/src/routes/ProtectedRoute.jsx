import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ admin = false }) {
  const { isAuthed, isAdmin } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (!admin && isAdmin) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
