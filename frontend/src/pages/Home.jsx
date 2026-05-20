import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFutbol, FaTrophy } from "react-icons/fa";

export default function Home() {
  const [params] = useSearchParams();
  const mr = params.get("mr_id");
  const enrollUrl = mr ? `/enroll?mr_id=${encodeURIComponent(mr)}` : "/enroll";
  return (
    <div className="min-h-screen overflow-hidden bg-stadium field-lines px-4 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div className="text-xl font-black text-gold">Farmacy Football</div>
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
          <motion.div initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} className="glass relative rounded-[28px] p-6 shadow-glow">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-ember/30 blur-3xl" />
            <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <div className="mb-8 flex items-center justify-between">
                <span className="rounded-full bg-ember px-3 py-1 text-xs font-black">LIVE CAMPAIGN</span>
                <FaTrophy className="text-gold" size={32} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {["Enroll", "Predict", "Win Points"].map((item, index) => (
                  <div key={item} className="rounded-2xl bg-white/10 p-4">
                    <div className="text-3xl font-black text-gold">{index + 1}</div>
                    <div className="mt-2 text-sm font-bold">{item}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl bg-gradient-to-r from-gold/25 to-ember/25 p-5">
                <div className="text-sm text-white/65">Enrollment bonus</div>
                <div className="text-5xl font-black text-gold">+100</div>
                <div className="text-sm text-white/65">points instantly after registration</div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
