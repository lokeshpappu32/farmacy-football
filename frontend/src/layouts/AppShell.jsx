import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import AppFooter from "../components/AppFooter";
import FootballLogo from "../components/FootballLogo";

const userLinks = [
  ["My Dashboard", "/dashboard"],
  ["Schedule", "/schedule"],
  ["My Performance", "/performance"],
  ["My Standing", "/leaderboard"],
  ["Points System", "/rules"],
];

const adminLinks = [
  ["Global Performance", "/admin"],
  ["HETERO Staff Standing", "/admin/standing"],
  ["Farmacists Standing", "/admin/farmacists-standing"],
  ["Schedule", "/admin/schedule"],
  ["Users", "/admin/users"],
];

const repLinks = [
  ["My Dashboard", "/rep/dashboard"],
  ["Schedule", "/rep/schedule"],
  ["My Performance", "/rep/performance"],
  ["My Standing", "/rep/standing"],
  ["Farmacist Standing", "/rep/farmacist-standing"],
  ["Points System", "/rep/rules"],
];

const superAdminLinks = [
  ["Dashboard", "/super-admin"],
  ["Matches", "/super-admin/matches"],
  ["Users", "/super-admin/users"],
  ["Country/City", "/super-admin/analytics"],
  ["Drug Analytics", "/super-admin/drug-analytics"],
];

export default function AppShell({ mode = "user" }) {
  const [open, setOpen] = useState(false);
  const links = mode === "super-admin" ? superAdminLinks : mode === "admin" ? adminLinks : mode === "rep" ? repLinks : userLinks;
  const home = mode === "super-admin" ? "/super-admin" : mode === "admin" ? "/admin" : mode === "rep" ? "/rep/dashboard" : "/dashboard";

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url('/images/bg.png')" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-black/5" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.04)_46%,rgba(0,0,0,0.14)_100%)]" />
      <nav className="relative z-40 bg-black/50">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 pb-10 pt-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-3 lg:gap-4">
          <NavLink to={home} aria-label="Farmacy Football" className="shrink-0">
            <FootballLogo compact />
          </NavLink>
          <button className="flex h-12 w-12 items-center justify-center justify-self-end rounded-xl border border-white/20 bg-black/70 text-2xl text-white shadow-lg md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
            {open ? <FiX /> : <FiMenu />}
          </button>
          <div className="hidden min-w-0 items-center justify-center gap-1.5 md:flex lg:gap-2">
            {links.map(([label, path]) => (
              <NavLink key={path} to={path} end className={({ isActive }) => `flex h-8 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md px-1.5 text-center text-[10px] font-semibold leading-none shadow-sm transition lg:h-9 lg:px-2 lg:text-[11px] xl:px-2.5 xl:text-xs ${isActive ? "bg-white/80 text-black" : "bg-white/10 text-white hover:bg-white/18"}`}>
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
          <img src="/hetero-logo.png" alt="Hetero" className="hidden h-16 w-24 shrink-0 object-contain mix-blend-screen lg:h-20 lg:w-28 md:block" />
        </div>
        {open && (
          <div className="mx-4 space-y-2 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl md:hidden">
            {links.map(([label, path]) => (
              <NavLink
                key={path}
                to={path}
                end
                onClick={() => setOpen(false)}
                className={({ isActive }) => `block rounded-xl px-3 py-2 text-sm font-bold transition ${
                  isActive ? "bg-white/85 text-black shadow-sm" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <main className="relative z-10 mx-auto min-h-[calc(100vh-210px)] max-w-7xl px-4 py-6 md:py-8">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
