import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import FootballLogo from "../components/FootballLogo";

const userLinks = [
  ["Game Dashboard", "/dashboard"],
  ["Schedule", "/schedule"],
  ["Performance", "/performance"],
  ["Leaderboard", "/leaderboard"],
  ["Rules", "/rules"],
];

const adminLinks = [
  ["Dashboard", "/admin"],
  ["Matches", "/admin/matches"],
  ["Users", "/admin/users"],
  ["Country/City", "/admin/analytics"],
  ["Drug Analytics", "/admin/drug-analytics"],
];

export default function AppShell({ mode = "user" }) {
  const [open, setOpen] = useState(false);
  const links = mode === "admin" ? adminLinks : userLinks;
  const home = mode === "admin" ? "/admin" : "/dashboard";

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url('/soccer-field.webp')" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-black/42" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.24)_46%,rgba(0,0,0,0.56)_100%)]" />
      <nav className="relative z-40 bg-black/50">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 pb-10 pt-5 md:grid-cols-[auto_1fr_auto] md:gap-6">
          <NavLink to={home} aria-label="Farmacy Football">
            <FootballLogo compact />
          </NavLink>
          <button className="flex h-12 w-12 items-center justify-center justify-self-end rounded-xl border border-white/20 bg-black/70 text-2xl text-white shadow-lg md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
            {open ? <FiX /> : <FiMenu />}
          </button>
          <div className="hidden items-center justify-center gap-4 md:flex">
            {links.map(([label, path]) => (
              <NavLink key={path} to={path} end className={({ isActive }) => `rounded-xl px-5 py-3 text-lg font-medium shadow-sm transition ${isActive ? "bg-white/80 text-black" : "bg-white/10 text-white hover:bg-white/18"}`}>
                {label}
              </NavLink>
            ))}
          </div>
          <img src="/hetero-logo.png" alt="Hetero" className="hidden h-20 w-28 object-contain mix-blend-screen md:block" />
        </div>
        {open && (
          <div className="mx-4 space-y-2 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl md:hidden">
            {links.map(([label, path]) => (
              <NavLink key={path} to={path} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10">
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
