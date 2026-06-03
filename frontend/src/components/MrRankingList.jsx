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
          className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-4 ${
            row.rank <= 3 ? "border-gold/40 bg-gold/10 shadow-glow" : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/45 text-lg font-black text-gold">
            {row.rank <= 3 ? (
              <span className="flex flex-col items-center justify-center leading-none">
                <img src="/images/cup_18104567.svg" alt={`Rank ${row.rank}`} className="h-8 w-8 drop-shadow-[0_0_10px_rgba(250,204,21,.55)]" />
                <span className="-mt-0.5 text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                  {row.rank}
                </span>
              </span>
            ) : row.rank}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-black sm:text-lg">{row.full_name}</div>
            {showCountry && (
              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-semibold text-white/70">
                {row.country_flag_url && <img src={row.country_flag_url} alt={row.country} className="h-5 w-5 shrink-0 rounded-full object-cover" />}
                <span className="truncate">{row.country}</span>
              </div>
            )}
            {row.enrollments !== undefined && (
              <div className="mt-1 truncate text-xs text-white/45">{row.enrollments} enrolled farmacists</div>
            )}
          </div>
          <div className="col-span-2 min-w-0 text-left sm:col-span-1 sm:text-right">
            <div className="text-xl font-black text-gold sm:text-2xl">{row.total_points ?? row.participations}</div>
            <div className="truncate text-[10px] uppercase tracking-widest text-white/50">{row.total_points !== undefined ? "points" : "participations"}</div>
            {row.avg_participations_per_farmacist !== undefined && (
              <div className="mt-1 truncate text-xs font-bold text-white/45">
                {row.avg_participations_per_farmacist} avg/enrollment
              </div>
            )}
          </div>
        </motion.div>
      ))}
      {!rows.length && <div className="rounded-2xl bg-white/10 p-5 text-white/60">No HETERO Representative / Staff ranking data available yet.</div>}
    </div>
  );
}
