import { motion } from "framer-motion";

export default function MrRankingList({ rows = [], showCountry = true, scroll = true }) {
  return (
    <div className={`${scroll ? "scroll-panel max-h-[560px] overflow-y-auto pr-2" : ""} space-y-3`}>
      {rows.map((row, index) => (
        <motion.div
          key={`${row.mobile_number}-${row.rank}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.025 }}
          className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
            row.rank <= 3 ? "border-gold/40 bg-gold/10 shadow-glow" : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/45 text-lg font-black text-gold">
              {row.rank <= 3 ? (
                <span className="relative inline-flex h-8 w-8 items-center justify-center">
                  <img src="/images/cup_18104567.svg" alt={`Rank ${row.rank}`} className="h-7 w-7" />
                  <span className="absolute inset-0 flex items-center justify-center pt-1 text-base font-black text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,.95)]">
                    {row.rank}
                  </span>
                </span>
              ) : row.rank}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black">{row.full_name}</div>
              {showCountry && (
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white/70">
                  {row.country_flag_url && <img src={row.country_flag_url} alt={row.country} className="h-5 w-5 rounded-full object-cover" />}
                  <span>{row.country}</span>
                </div>
              )}
              {row.enrollments !== undefined && (
                <div className="mt-1 text-xs text-white/45">{row.enrollments} enrolled farmacists</div>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-black text-gold">{row.total_points ?? row.participations}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50">{row.total_points !== undefined ? "points" : "participations"}</div>
          </div>
        </motion.div>
      ))}
      {!rows.length && <div className="rounded-2xl bg-white/10 p-5 text-white/60">No HETERO Representative / Staff ranking data available yet.</div>}
    </div>
  );
}
