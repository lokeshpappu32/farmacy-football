import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiMenu, FiX, FiLogOut } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const userLinks = [
  ["Game Dashboard", "/dashboard"],
  ["Performance", "/performance"],
  ["Leaderboard", "/leaderboard"],
  ["Rules", "/rules"],
];

const adminLinks = [
  ["Dashboard", "/admin"],
  ["Matches", "/admin/matches"],
  ["Users", "/admin/users"],
  ["Analytics", "/admin/analytics"],
];

export default function AppShell({ admin = false }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const links = admin ? adminLinks : userLinks;

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-stadium field-lines">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <NavLink to={admin ? "/admin" : "/dashboard"} className="text-lg font-black text-gold">
            Farmacy Football
          </NavLink>
          <button className="btn-ghost md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
            {open ? <FiX /> : <FiMenu />}
          </button>
          <div className="hidden items-center gap-2 md:flex">
            {links.map(([label, path]) => (
              <NavLink key={path} to={path} end className={({ isActive }) => `rounded-xl px-3 py-2 text-sm font-bold ${isActive ? "bg-gold text-black" : "text-white/75 hover:bg-white/10"}`}>
                {label}
              </NavLink>
            ))}
            <button onClick={doLogout} className="btn-ghost inline-flex items-center gap-2 text-sm"><FiLogOut /> Logout</button>
          </div>
        </div>
        {open && (
          <div className="space-y-2 border-t border-white/10 px-4 py-3 md:hidden">
            {links.map(([label, path]) => (
              <NavLink key={path} to={path} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10">
                {label}
              </NavLink>
            ))}
            <button onClick={doLogout} className="btn-ghost flex w-full items-center gap-2"><FiLogOut /> Logout</button>
          </div>
        )}
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
