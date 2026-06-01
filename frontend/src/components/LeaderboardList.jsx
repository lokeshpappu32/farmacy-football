import { motion } from "framer-motion";

const participantTypeLabels = {
  farmacist: "Farmacist",
  farmacy_owner: "Farmacy Owner",
  farmacy_head_supervisor: "Farmacy Head / Supervisor",
  farmacy_head: "Farmacy Head",
  farmacy_supervisor: "Farmacy Supervisor",
  farmacy_sales_staff: "Farmacy Sales Staff",
  medical_rep: "HETERO Representative",
  hetero_representative_staff: "HETERO Representative / Staff",
  hetero_staff: "HETERO Staff",
  hetero_representative: "HETERO Representative",
};

export default function LeaderboardList({ rows = [] }) {
  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <motion.div
          key={row.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
          className={`flex items-center justify-between gap-4 rounded-2xl border p-4 md:p-5 ${
            row.rank <= 3 ? "border-gold/40 bg-gold/10 shadow-glow" : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/40 text-lg font-black text-gold md:h-16 md:w-16">
              {row.rank <= 3 ? (
                <span className="flex flex-col items-center justify-center leading-none">
                  <img src="/images/cup_18104567.svg" alt={`Rank ${row.rank}`} className="h-8 w-8 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,.55)] md:h-9 md:w-9" />
                  <span className="-mt-0.5 text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] md:text-base">
                    {row.rank}
                  </span>
                </span>
              ) : row.rank}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black md:text-2xl">{row.full_name}</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white/75 md:text-base">
                {row.country_flag_url && <img src={row.country_flag_url} alt={row.country} className="h-5 w-5 rounded-full object-cover md:h-6 md:w-6" />}
                <span>{row.country}</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-white/45 md:text-sm">
                {participantTypeLabels[row.participant_type] || "Participant"}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-black text-gold md:text-3xl">{row.total_points}</div>
            <div className="text-[11px] uppercase tracking-widest text-white/50 md:text-xs">points</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
