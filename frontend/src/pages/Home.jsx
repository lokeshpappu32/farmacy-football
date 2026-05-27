import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCheckCircle, FaFutbol, FaGift, FaMedal, FaTrophy, FaUserPlus } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../utils/auth";

const pointRules = [
  { icon: FaUserPlus, points: "100", label: "Enrollment" },
  { icon: FaCheckCircle, points: "50", label: "Match participation" },
  { icon: FaTrophy, points: "50", label: "Correct prediction" },
];

const rewards = [
  { points: "1,000", reward: "Hetero cap" },
  { points: "5,000", reward: "Water bottle" },
  { points: "Top scorer", reward: "$200 gift reward within the country" },
];

export default function Home() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthed, role } = useAuth();
  const mr = params.get("mr_id");
  const enrollUrl = mr ? `/enroll?mr_id=${encodeURIComponent(mr)}` : "/enroll";

  useEffect(() => {
    if (isAuthed) navigate(homeForRole(role), { replace: true });
  }, [isAuthed, role, navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-stadium field-lines px-4 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div className="text-xl font-black text-gold">HETERO Farmacy Football</div>
          <Link to="/login" className="btn-ghost">Login</Link>
        </header>
        <section className="grid min-h-[78vh] items-center gap-8 lg:grid-cols-[1.08fr_.92fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-bold text-gold">
              <FaFutbol /> FIFA prediction campaign for pharmacists
            </div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              Farmacy Football
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/72 md:text-xl">
              Predict match winners, choose your favorite Hetero drug, earn points, and climb a 30-country pharmacist leaderboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={enrollUrl} className="btn-primary text-center">Enroll and Play</Link>
              <Link to="/leaderboard" className="btn-ghost text-center">View Leaderboard</Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} className="glass relative rounded-[28px] p-5 shadow-glow">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-ember/30 blur-3xl" />
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gold">Play. Engage. Score. Win.</p>
                  <h2 className="mt-1 text-2xl font-black">Game Rules & Rewards</h2>
                </div>
                <FaTrophy className="shrink-0 text-gold" size={34} />
              </div>

              <div className="rounded-2xl border border-gold/25 bg-gold/10 p-4">
                <div className="mb-3 text-sm font-black uppercase tracking-widest text-gold">Points System</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {pointRules.map(({ icon: Icon, points, label }) => (
                    <div key={label} className="rounded-2xl bg-black/30 p-3">
                      <Icon className="mx-auto mb-2 text-gold" />
                      <div className="text-2xl font-black text-gold">{points}</div>
                      <div className="mt-1 text-[11px] font-bold leading-tight text-white/70">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {rewards.map((item) => (
                  <div key={item.points} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                    <FaGift className="mx-auto mb-2 text-ember" />
                    <div className="text-lg font-black text-gold">{item.points}</div>
                    <div className="mt-1 text-xs font-bold text-white/70">{item.reward}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-gradient-to-r from-gold/25 to-ember/25 p-5">
                <div className="flex items-center gap-3">
                  <FaMedal className="text-3xl text-gold" />
                  <div>
                    <div className="text-sm font-bold text-white/65">Qualifying condition</div>
                    <div className="text-3xl font-black text-gold">5,000 points</div>
                    <div className="text-xs text-white/60">Minimum score for reward eligibility</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
