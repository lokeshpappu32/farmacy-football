import { FaUsers, FaFutbol, FaClipboardList, FaBullseye } from "react-icons/fa";
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
  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">Admin Command Center</h1>
          <p className="text-white/60">Campaign operations across matches, users, points, and analytics.</p>
        </div>
        <div className="flex gap-2"><button onClick={sync} className="btn-primary">Sync Matches</button></div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Participants" value={data.total_participants} icon={FaUsers} />
        <StatCard label="Predictions" value={data.total_predictions} icon={FaClipboardList} />
        <StatCard label="Participation" value={`${data.participation_rate || 0}%`} icon={FaFutbol} />
        <StatCard label="Accuracy" value={`${data.accuracy || 0}%`} icon={FaBullseye} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsList title="MR Performance" rows={data.mr_analytics || []} labelKey="mr_id" />
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-black">Admin Logs</h2>
          <div className="scroll-panel max-h-[420px] space-y-3 overflow-y-auto pr-2">
            {data.logs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-white/10 p-4">
                <div className="font-bold text-gold">{log.admin_action}</div>
                <div className="text-sm text-white/60">{formatLogDetails(log.details)}</div>
                <div className="text-xs text-white/40">{formatDateTime(log.created_at)} local time</div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="glass rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-black">Football API Sync Tracking</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="scroll-panel max-h-[520px] space-y-3 overflow-y-auto pr-2">
            {(data.api_sync_states || []).map((state) => (
              <div key={state.sync_type} className="rounded-2xl bg-white/10 p-4">
                <div className="flex justify-between gap-3">
                  <span className="font-bold capitalize text-gold">{state.sync_type}</span>
                  <span className="text-sm text-white/60">{state.last_status || "not synced"}</span>
                </div>
                <div className="mt-1 text-xs text-white/45">Last synced: {formatDateTime(state.last_synced_at)} local time</div>
                {state.requests_limit_snapshot ? (
                  <div className="mt-1 text-xs text-white/45">Usage: {state.requests_used_snapshot} / {state.requests_limit_snapshot}</div>
                ) : null}
              </div>
            ))}
            {(data.api_sync_states || []).length === 0 && <div className="rounded-2xl bg-white/10 p-4 text-white/55">Football API sync not started yet.</div>}
          </div>
          <div className="scroll-panel max-h-[520px] space-y-3 overflow-y-auto pr-2">
            {(data.api_logs || []).map((log) => (
              <div key={log.id} className="rounded-2xl bg-white/10 p-4">
                <div className="flex justify-between gap-3">
                  <span className="font-bold">{log.sync_type} - {log.triggered_by_page}</span>
                  <span className="text-sm text-gold">{log.status}</span>
                </div>
                <div className="text-xs text-white/45">
                  {log.endpoint} - requests: {log.request_count}
                  {log.requests_remaining_snapshot !== null && log.requests_remaining_snapshot !== undefined ? ` - remaining: ${log.requests_remaining_snapshot}` : ""}
                </div>
                <div className="text-xs text-white/45">{formatDateTime(log.created_at)} local time</div>
              </div>
            ))}
            {(data.api_logs || []).length === 0 && <div className="rounded-2xl bg-white/10 p-4 text-white/55">No API sync logs yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function formatLogDetails(details) {
  if (!details) return "";
  return details.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, (value) => formatDateTime(value));
}

function AnalyticsList({ title, rows, labelKey }) {
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <div className="scroll-panel max-h-[360px] space-y-3 overflow-y-auto pr-2">
        {rows.map((row) => (
          <div key={row[labelKey]} className="rounded-2xl bg-white/10 p-4">
            <div className="flex justify-between gap-3">
              <span className="font-black text-gold">{row[labelKey]}</span>
              <span className="text-sm text-white/60">{row.participants} users</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/50">
              <span>{row.points || 0} pts</span>
              <span>{row.participation_rate}% active</span>
              <span>{row.accuracy}% accuracy</span>
            </div>
          </div>
        ))}
        {!rows.length && <div className="rounded-2xl bg-white/10 p-4 text-white/55">No data available yet.</div>}
      </div>
    </section>
  );
}
