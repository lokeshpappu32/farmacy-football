import { useState } from "react";
import LeaderboardList from "../components/LeaderboardList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useLanguage } from "../context/LanguageContext";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function AdminLeaderboard() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const perPage = 50;
  const { data, loading, error } = useApi(async () => (await api.get(`/admin/leaderboard?page=${page}&per_page=${perPage}`)).data, [page]);
  const pagination = data?.pagination;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <h1 className="text-3xl font-black">{t("admin.leaderboardAnalytics", "Leaderboard Analytics")}</h1>
        {pagination && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
              {pagination.total} {t("admin.users", "users")}
            </span>
            <PaginationControls meta={pagination} onPage={setPage} />
          </div>
        )}
      </div>
      <div className="glass rounded-3xl p-5">
        {loading ? <LoadingSkeleton rows={8} /> : error ? <div>{error}</div> : <LeaderboardList rows={data.leaderboard} />}
      </div>
      {pagination && <PaginationControls meta={pagination} onPage={setPage} align="center" />}
    </div>
  );
}

function PaginationControls({ meta, onPage, align = "end" }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className={`flex items-center gap-2 ${align === "center" ? "justify-center" : ""}`}>
      <button
        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!meta.has_prev}
        onClick={() => onPage(meta.page - 1)}
      >
        Prev
      </button>
      <span className="min-w-14 text-center text-xs font-bold text-white/60">{meta.page}/{meta.pages}</span>
      <button
        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!meta.has_next}
        onClick={() => onPage(meta.page + 1)}
      >
        Next
      </button>
    </div>
  );
}
