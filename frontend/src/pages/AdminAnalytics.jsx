import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function AdminAnalytics() {
  const { data, loading, error } = useApi(async () => (await api.get("/admin/analytics")).data, []);
  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  const max = Math.max(...data.country_analytics.map((item) => item.participants), 1);
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
    </div>
  );
}
