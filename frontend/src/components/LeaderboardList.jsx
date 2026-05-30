import { motion } from "framer-motion";
import { FaCrown } from "react-icons/fa";

export default function LeaderboardList({ rows = [] }) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <motion.div
          key={row.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
          className={`flex items-center justify-between rounded-2xl border p-4 ${
            row.rank <= 3 ? "border-gold/40 bg-gold/10 shadow-glow" : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 font-black text-gold">
              {row.rank <= 3 ? <FaCrown /> : row.rank}
            </div>
            <div>
              <div className="font-bold">{row.full_name}</div>
              <div className="text-xs text-white/55">{row.country} - {row.participant_type === "medical_rep" ? "HETERO Rep" : "Farmacist"}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-gold">{row.total_points}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50">points</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
