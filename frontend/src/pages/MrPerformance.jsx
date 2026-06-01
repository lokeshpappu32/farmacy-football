import { useState } from "react";
import { FaChartLine, FaGlobeAsia, FaMedal, FaUsers } from "react-icons/fa";
import IdentityHeader from "../components/IdentityHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import MrRankingList from "../components/MrRankingList";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function MrPerformance({ mode = "admin" }) {
  const [country, setCountry] = useState("");
  const endpoint = mode === "rep" ? "/mr/rep/performance" : "/mr/performance";
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (mode !== "rep" && country) params.set("country", country);
    return (await api.get(`${endpoint}${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [endpoint, mode, country]);
  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  const summary = data.summary || {};
  const countries = data.countries || [];

  return (
    <div className="space-y-6">
      {mode === "rep" && <IdentityHeader nameLabel="Participant name" />}
      <div>
        <div>
          <h1 className="text-3xl font-black">{mode === "rep" ? "My Performance" : "Global Performance"}</h1>
          <p className="mt-2 text-white/65">Performance is based on Farmacist enrollments and participations under each HETERO Representative / Staff.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={mode === "rep" ? "My Enrollments" : "Total Enrollments"} value={summary.enrollments ?? summary.total_enrollments} icon={FaUsers} />
        <StatCard label={mode === "rep" ? "User Participations" : "Total Participations"} value={summary.participations ?? summary.total_participations} icon={FaChartLine} />
        <StatCard label={mode === "rep" ? "Global Rank" : "HETERO Representatives"} value={summary.global_rank ?? summary.total_mrs} icon={FaMedal} />
        <StatCard label={mode === "rep" ? "Country Rank" : "Active Representatives"} value={summary.country_rank ?? summary.active_mrs} icon={FaGlobeAsia} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="glass rounded-3xl p-5 md:p-6">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <h2 className="text-xl font-black">Top Global HETERO Representatives / Staff</h2>
            {mode !== "rep" && (
              <div className="grid gap-2 sm:grid-cols-[190px_auto]">
                <select className="input" value={country} onChange={(event) => setCountry(event.target.value)}>
                  <option className="bg-black" value="">All countries</option>
                  {countries.map((item) => <option className="bg-black" key={item} value={item}>{item}</option>)}
                </select>
                <button className="btn-ghost" onClick={refresh}>Refresh</button>
              </div>
            )}
          </div>
          <div className="scroll-panel max-h-[560px] overflow-y-auto pr-2">
            <MrRankingList rows={data.top_global_representatives || data.mr_rankings || []} scroll={false} />
          </div>
        </section>

        <section className="glass rounded-3xl p-5 md:p-6">
          <h2 className="mb-4 text-xl font-black">{mode === "rep" ? "Top Representatives In My Country" : "Top Countries"}</h2>
          <div className="scroll-panel max-h-[560px] space-y-3 overflow-y-auto pr-2">
            {(data.top_country_representatives || data.country_rankings || []).map((row) => (
              <div key={row.mobile_number || row.country} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 font-black text-gold">{row.rank}</div>
                  {row.country_flag_url && <img src={row.country_flag_url} alt={row.country} className="h-8 w-8 rounded-full object-cover" />}
                  <div className="min-w-0">
                    <div className="truncate text-lg font-black">{row.full_name || row.country}</div>
                    <div className="text-xs text-white/50">{row.full_name ? `${row.enrollments} enrolled farmacists` : `${row.mrs} enrolled HETERO Representatives / Staff`}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-gold">{row.participations ?? row.score}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">{row.participations !== undefined ? "participations" : "avg/rep"}</div>
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
