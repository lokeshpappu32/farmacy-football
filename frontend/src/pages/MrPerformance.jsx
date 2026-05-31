import { FaChartLine, FaGlobeAsia, FaMedal, FaUsers } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import MrRankingList from "../components/MrRankingList";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function MrPerformance() {
  const { data, loading, error } = useApi(async () => (await api.get("/mr/performance")).data, []);
  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">MR Dashboard</h1>
        <p className="mt-2 text-white/65">Performance rankings are based on pharmacist participations under each MR.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Enrollments" value={data.summary.total_enrollments} icon={FaUsers} />
        <StatCard label="Total Participations" value={data.summary.total_participations} icon={FaChartLine} />
        <StatCard label="Enrolled MRs" value={data.summary.total_mrs} icon={FaMedal} />
        <StatCard label="Active MRs" value={data.summary.active_mrs} icon={FaGlobeAsia} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="glass rounded-3xl p-5 md:p-6">
          <h2 className="mb-4 text-xl font-black">Global Ranking of MRs</h2>
          <MrRankingList rows={data.mr_rankings || []} />
        </section>

        <section className="glass rounded-3xl p-5 md:p-6">
          <h2 className="mb-4 text-xl font-black">Country-wise Ranking</h2>
          <div className="scroll-panel max-h-[560px] space-y-3 overflow-y-auto pr-2">
            {(data.country_rankings || []).map((row) => (
              <div key={row.country} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 font-black text-gold">{row.rank}</div>
                  {row.country_flag_url && <img src={row.country_flag_url} alt={row.country} className="h-8 w-8 rounded-full object-cover" />}
                  <div className="min-w-0">
                    <div className="truncate text-lg font-black">{row.country}</div>
                    <div className="text-xs text-white/50">{row.mrs} enrolled MRs</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-gold">{row.score}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">avg/MR</div>
                </div>
              </div>
            ))}
            {(data.country_rankings || []).length === 0 && <div className="rounded-2xl bg-white/10 p-5 text-white/60">No country ranking data available yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
