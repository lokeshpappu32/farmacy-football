import { FaUsers, FaFutbol, FaChartPie, FaClipboardList } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

export default function AdminDashboard() {
  const { data, loading, error, refresh } = useApi(async () => (await api.get("/admin/dashboard")).data, []);
  const sync = async () => {
    await api.post("/admin/sync-matches");
    refresh();
  };
  const reminders = async () => {
    await api.post("/admin/reminders");
    refresh();
  };
  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">Admin Command Center</h1>
          <p className="text-white/60">Campaign operations across matches, users, points, and reminders.</p>
        </div>
        <div className="flex gap-2"><button onClick={sync} className="btn-primary">Sync Matches</button><button onClick={reminders} className="btn-ghost">Resend Reminders</button></div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Participants" value={data.total_participants} icon={FaUsers} />
        <StatCard label="Predictions" value={data.total_predictions} icon={FaClipboardList} />
        <StatCard label="Matches" value={data.total_matches} icon={FaFutbol} />
        <StatCard label="Completed" value={data.completed_matches} icon={FaChartPie} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-black">Country Analytics</h2>
          <div className="space-y-3">
            {data.country_analytics.map((row) => (
              <div key={row.country} className="flex justify-between rounded-2xl bg-white/10 p-4">
                <span className="font-bold">{row.country}</span>
                <span className="text-gold">{row.participants} users - {row.points} pts</span>
              </div>
            ))}
          </div>
        </section>
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-black">Admin Logs</h2>
          <div className="space-y-3">
            {data.logs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-white/10 p-4">
                <div className="font-bold text-gold">{log.admin_action}</div>
                <div className="text-sm text-white/60">{log.details}</div>
                <div className="text-xs text-white/40">{formatDateTime(log.created_at)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
