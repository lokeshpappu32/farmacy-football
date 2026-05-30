import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FootballLogo from "../components/FootballLogo";
import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../utils/auth";

export default function Home() {
  const [params] = useSearchParams();
  const [visitorType, setVisitorType] = useState("farmacist");
  const navigate = useNavigate();
  const { isAuthed, role } = useAuth();
  const visitorParam = params.get("participant_type");
  const selectedType = visitorParam || visitorType;
  const enrollUrl = `/enroll?participant_type=${encodeURIComponent(selectedType)}`;

  useEffect(() => {
    if (isAuthed) navigate(homeForRole(role), { replace: true });
  }, [isAuthed, role, navigate]);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/soccer-field.webp')" }}
    >
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.34)_42%,rgba(0,0,0,0.64)_100%)]" />
      <div className="absolute inset-0 bg-emerald-950/30" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-5 py-10 text-center">
        <img
          src="/hetero-logo.png"
          alt="Hetero"
          className="mt-2 h-24 w-40 object-contain mix-blend-screen sm:h-32 sm:w-52"
        />

        <div className="flex flex-1 flex-col items-center justify-center pb-20 pt-10 sm:pb-24">
          <FootballLogo />

          <div className="mt-24 flex flex-wrap items-center justify-center gap-x-12 gap-y-5 text-xl font-medium uppercase tracking-wide sm:text-2xl">
            <label className="home-role-option">
              <input
                type="radio"
                name="visitor_type"
                value="farmacist"
                checked={selectedType === "farmacist"}
                onChange={(event) => setVisitorType(event.target.value)}
                className="home-role-radio"
              />
              <span className="home-role-mark" />
              <span>FARMACIST</span>
            </label>
            <label className="home-role-option normal-case">
              <input
                type="radio"
                name="visitor_type"
                value="medical_rep"
                checked={selectedType === "medical_rep"}
                onChange={(event) => setVisitorType(event.target.value)}
                className="home-role-radio"
              />
              <span className="home-role-mark" />
              <span>HETERO Rep.</span>
            </label>
          </div>

          <Link
            to={enrollUrl}
            className="mt-10 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-12 py-4 text-2xl font-black uppercase leading-none text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] hover:brightness-110"
          >
            Enroll
          </Link>
        </div>

        <Link
          to="/login"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-base font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline"
        >
          Login - if you are Admin
        </Link>
      </section>
    </main>
  );
}
