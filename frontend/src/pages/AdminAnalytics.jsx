import { useCallback, useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

export default function AdminAnalytics() {
  const { data, loading, error } = useApi(async () => (await api.get("/admin/analytics")).data, []);
  const [filters, setFilters] = useState({ country: "", mr_id: "", sort: "most" });
  const drugRequest = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.mr_id) params.set("mr_id", filters.mr_id);
    params.set("sort", filters.sort);
    return (await api.get(`/admin/drug-analytics?${params.toString()}`)).data;
  }, [filters.country, filters.mr_id, filters.sort]);
  const { data: drugData, loading: drugLoading, error: drugError } = useApi(drugRequest, [drugRequest]);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  const max = Math.max(...data.country_analytics.map((item) => item.participants), 1);
  const maxDrug = Math.max(...(drugData?.drugs || []).map((item) => item.selection_count), 1);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Participants" value={data.total_participants} />
        <StatCard label="Predictions" value={data.total_predictions} />
        <StatCard label="Matches" value={data.total_matches} />
        <StatCard label="Completed" value={data.completed_matches} />
      </div>
      <section className="glass rounded-3xl p-6">
        <h2 className="mb-5 text-xl font-black">Country Distribution</h2>
        <div className="space-y-4">
          {data.country_analytics.map((item) => (
            <div key={item.country}>
              <div className="mb-1 flex justify-between text-sm"><span>{item.country}</span><span className="text-gold">{item.participants}</span></div>
              <div className="h-3 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-gold to-ember" style={{ width: `${(item.participants / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
      <section className="glass rounded-3xl p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-black">Favorite Drug Analytics</h2>
            <p className="text-sm text-white/55">Filter participant answers by country and MR ID, then sort most or least selected drugs.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="input" value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))}>
              <option className="bg-black" value="">All countries</option>
              {(drugData?.countries || []).map((country) => <option className="bg-black" key={country} value={country}>{country}</option>)}
            </select>
            <select className="input" value={filters.mr_id} onChange={(event) => setFilters((current) => ({ ...current, mr_id: event.target.value }))}>
              <option className="bg-black" value="">All MRs</option>
              {(drugData?.mr_ids || []).map((mr) => <option className="bg-black" key={mr} value={mr}>{mr}</option>)}
            </select>
            <select className="input" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}>
              <option className="bg-black" value="most">Most selected</option>
              <option className="bg-black" value="least">Least selected</option>
            </select>
          </div>
        </div>

        {drugLoading ? <LoadingSkeleton rows={4} /> : drugError ? <div>{drugError}</div> : (
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <div className="space-y-3">
              {(drugData?.drugs || []).map((row, index) => (
                <div key={row.favorite_drug} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-black">{index + 1}. {row.favorite_drug}</span>
                    <span className="text-gold">{row.selection_count} selections</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold to-ember" style={{ width: `${(row.selection_count / maxDrug) * 100}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-white/50">{row.unique_users} unique users</div>
                </div>
              ))}
              {(drugData?.drugs || []).length === 0 && <div className="rounded-2xl bg-white/10 p-5 text-white/60">No favorite drug answers found for this filter.</div>}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-black/25 text-white/55">
                  <tr>
                    <th className="p-3">Participant</th>
                    <th>Country</th>
                    <th>MR</th>
                    <th>Match</th>
                    <th>Prediction</th>
                    <th>Drug</th>
                    <th>Result</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {(drugData?.answers || []).map((answer) => (
                    <tr key={answer.id} className="border-t border-white/10">
                      <td className="p-3 font-bold">{answer.participant}</td>
                      <td>{answer.country}</td>
                      <td>{answer.mr_id}</td>
                      <td>{answer.match}</td>
                      <td>{answer.predicted_team}</td>
                      <td className="font-black text-gold">{answer.favorite_drug}</td>
                      <td>{answer.is_correct === null ? "Pending" : answer.is_correct ? "Correct" : "No bonus"}</td>
                      <td>{formatDateTime(answer.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
