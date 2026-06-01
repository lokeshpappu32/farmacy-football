import { Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "../components/ErrorBoundary";
import AppShell from "../layouts/AppShell";
import AdminAnalytics from "../pages/AdminAnalytics";
import AdminDashboard from "../pages/AdminDashboard";
import AdminDrugAnalytics from "../pages/AdminDrugAnalytics";
import AdminLeaderboard from "../pages/AdminLeaderboard";
import AdminMatches from "../pages/AdminMatches";
import AdminUsers from "../pages/AdminUsers";
import Dashboard from "../pages/Dashboard";
import Enroll from "../pages/Enroll";
import Home from "../pages/Home";
import Leaderboard from "../pages/Leaderboard";
import Login from "../pages/Login";
import MatchSchedule from "../pages/MatchSchedule";
import MrPerformance from "../pages/MrPerformance";
import MrStanding from "../pages/MrStanding";
import Performance from "../pages/Performance";
import RepFarmacistStanding from "../pages/RepFarmacistStanding";
import Rules from "../pages/Rules";
import UserLogin from "../pages/UserLogin";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <ErrorBoundary>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/user-login" element={<UserLogin />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/schedule" element={<MatchSchedule />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/rules" element={<Rules />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="admin" />}>
            <Route element={<AppShell mode="admin" />}>
              <Route path="/admin" element={<MrPerformance />} />
              <Route path="/admin/standing" element={<MrStanding title="HETERO Staff Standing" showIdentity={false} />} />
              <Route path="/admin/farmacists-standing" element={<Leaderboard title="Farmacist Standing" subtitle="Global Farmacist standings by country and HETERO representative." showIdentity={false} />} />
              <Route path="/admin/schedule" element={<MatchSchedule />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="hetero_rep" />}>
            <Route element={<AppShell mode="rep" />}>
              <Route path="/rep/dashboard" element={<Dashboard />} />
              <Route path="/rep/schedule" element={<MatchSchedule />} />
              <Route path="/rep/performance" element={<MrPerformance mode="rep" />} />
              <Route path="/rep/standing" element={<MrStanding mode="rep" />} />
              <Route path="/rep/farmacist-standing" element={<RepFarmacistStanding />} />
              <Route path="/rep/rules" element={<Rules />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="super_admin" />}>
            <Route element={<AppShell mode="super-admin" />}>
              <Route path="/super-admin" element={<AdminDashboard />} />
              <Route path="/super-admin/matches" element={<AdminMatches />} />
              <Route path="/super-admin/users" element={<AdminUsers />} />
              <Route path="/super-admin/leaderboard" element={<AdminLeaderboard />} />
              <Route path="/super-admin/analytics" element={<AdminAnalytics />} />
              <Route path="/super-admin/drug-analytics" element={<AdminDrugAnalytics />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </ErrorBoundary>
  );
}
