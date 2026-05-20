import { Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "../components/ErrorBoundary";
import AppShell from "../layouts/AppShell";
import AdminAnalytics from "../pages/AdminAnalytics";
import AdminDashboard from "../pages/AdminDashboard";
import AdminLeaderboard from "../pages/AdminLeaderboard";
import AdminMatches from "../pages/AdminMatches";
import AdminUsers from "../pages/AdminUsers";
import Dashboard from "../pages/Dashboard";
import Enroll from "../pages/Enroll";
import Home from "../pages/Home";
import Leaderboard from "../pages/Leaderboard";
import Login from "../pages/Login";
import Performance from "../pages/Performance";
import Rules from "../pages/Rules";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/enroll" element={<Enroll />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/rules" element={<Rules />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute admin />}>
          <Route element={<AppShell admin />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/matches" element={<AdminMatches />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
