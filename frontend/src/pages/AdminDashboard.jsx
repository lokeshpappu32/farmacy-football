import { useState } from "react";
import { FaUsers, FaFutbol, FaClipboardList, FaBullseye } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useLanguage } from "../context/LanguageContext";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [pages, setPages] = useState({ adminLogs: 1, apiLogs: 1 });
  const { data, loading, error, refresh } = useApi(
    async () => (
      await api.get(`/admin/dashboard?admin_log_page=${pages.adminLogs}&api_log_page=${pages.apiLogs}&per_page=10`)
    ).data,
    [pages.adminLogs, pages.apiLogs],
  );
  const sync = async () => {
    await api.post("/admin/sync-matches");
    refresh();
  };
  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  const adminLogsMeta = normalizePagination(data.logs_pagination, data.logs?.length || 0, pages.adminLogs);
  const apiLogsMeta = normalizePagination(data.api_logs_pagination, data.api_logs?.length || 0, pages.apiLogs);
  const apiLimit = latestApiLimit(data.api_sync_states, data.api_logs);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">{t("admin.commandCenter", "Admin Command Center")}</h1>
          <p className="text-white/60">{t("admin.commandCopy", "Campaign operations across matches, users, points, and analytics.")}</p>
        </div>
        <div className="flex gap-2"><button onClick={sync} className="btn-primary">{t("admin.syncMatches", "Sync Matches")}</button></div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={t("admin.participants", "Participants")} value={data.total_participants} icon={FaUsers} />
        <StatCard label={t("admin.predictions", "Predictions")} value={data.total_predictions} icon={FaClipboardList} />
        <StatCard label="Participation" value={`${data.participation_rate || 0}%`} icon={FaFutbol} />
        <StatCard label={t("admin.accuracy", "Accuracy")} value={`${data.accuracy || 0}%`} icon={FaBullseye} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsList title="HETERO Representative / Staff Performance" rows={data.mr_analytics || []} labelKey="medical_rep_name" />
        <section className="glass rounded-3xl p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black">Admin Logs</h2>
            <div className="flex flex-wrap items-center gap-2">
              <CountBadge count={adminLogsMeta.total} label="total" />
              <InlinePagination
                meta={adminLogsMeta}
                onPage={(page) => setPages((current) => ({ ...current, adminLogs: page }))}
              />
            </div>
          </div>
          <div className="scroll-panel max-h-[420px] space-y-3 overflow-y-auto pr-2">
            {data.logs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-white/10 p-4">
                <div className="font-bold text-gold">{log.admin_action}</div>
                <div className="text-sm text-white/60">{formatLogDetails(log.details)}</div>
                <div className="text-xs text-white/40">{formatDateTime(log.created_at)} local time</div>
              </div>
            ))}
            {data.logs.length === 0 && <div className="rounded-2xl bg-white/10 p-4 text-white/55">No admin logs yet.</div>}
          </div>
        </section>
      </div>
      <section className="glass rounded-3xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-black">Football API Sync Tracking</h2>
              {apiLimit.limit ? <CountBadge count={apiLimit.remaining} label="remaining" /> : null}
            </div>
            {apiLimit.limit ? (
              <p className="mt-1 text-xs text-white/50">
                Latest account limit snapshot: {apiLimit.remaining} remaining, {apiLimit.used} used of {apiLimit.limit}.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CountBadge count={apiLogsMeta.total} label="logs" />
            <InlinePagination
              meta={apiLogsMeta}
              onPage={(page) => setPages((current) => ({ ...current, apiLogs: page }))}
            />
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-white/55">Football APIs</h3>
            <div className="scroll-panel max-h-[520px] space-y-3 overflow-y-auto pr-2">
            {(data.api_sync_states || []).map((state) => (
              <div key={state.sync_type} className="rounded-2xl bg-white/10 p-4">
                <div className="flex justify-between gap-3">
                  <span className="font-bold capitalize text-gold">{state.sync_type}</span>
                  <span className="text-sm text-white/60">{state.last_status || "not synced"}</span>
                </div>
                <div className="mt-1 text-xs text-white/45">Last synced: {formatDateTime(state.last_synced_at)} local time</div>
                {state.requests_limit_snapshot ? (
                  <div className="mt-1 text-xs text-white/45">
                    Account snapshot: {state.requests_remaining_snapshot ?? "-"} remaining, {state.requests_used_snapshot ?? "-"} used of {state.requests_limit_snapshot}
                  </div>
                ) : null}
              </div>
            ))}
            {(data.api_sync_states || []).length === 0 && <div className="rounded-2xl bg-white/10 p-4 text-white/55">Football API sync not started yet.</div>}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-white/55">Football API Logs</h3>
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
        </div>
      </section>
    </div>
  );
}

function latestApiLimit(states = [], logs = []) {
  const candidates = [
    ...(logs || []).map((item) => ({
      created_at: item.created_at,
      used: item.requests_used_snapshot,
      limit: item.requests_limit_snapshot,
      remaining: item.requests_remaining_snapshot,
    })),
    ...(states || []).map((item) => ({
      created_at: item.last_synced_at,
      used: item.requests_used_snapshot,
      limit: item.requests_limit_snapshot,
      remaining: item.requests_remaining_snapshot,
    })),
  ]
    .filter((item) => item.limit !== null && item.limit !== undefined)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const latest = candidates[0] || {};
  const used = latest.used ?? 0;
  const limit = latest.limit ?? 0;
  const remaining = latest.remaining ?? Math.max(limit - used, 0);
  return { used, limit, remaining };
}

function normalizePagination(meta, visibleCount, currentPage) {
  if (meta) {
    return {
      ...meta,
      page: meta.page || currentPage || 1,
      pages: Math.max(meta.pages || 1, 1),
      total: meta.total ?? visibleCount,
    };
  }
  return {
    page: currentPage || 1,
    pages: 1,
    total: visibleCount,
    has_prev: false,
    has_next: false,
  };
}

function CountBadge({ count, label }) {
  return (
    <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
      {count} {label}
    </span>
  );
}

function InlinePagination({ meta, onPage }) {
  const { t } = useLanguage();
  const currentPage = meta.page || 1;
  const totalPages = Math.max(meta.pages || 1, 1);
  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!meta.has_prev}
        onClick={() => onPage(currentPage - 1)}
      >
        {t("schedule.previous", "Prev")}
      </button>
      <span className="min-w-12 text-center text-xs font-bold text-white/60">
        {currentPage}/{totalPages}
      </span>
      <button
        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!meta.has_next}
        onClick={() => onPage(currentPage + 1)}
      >
        {t("schedule.next", "Next")}
      </button>
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
