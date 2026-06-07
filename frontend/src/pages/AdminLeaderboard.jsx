import LeaderboardList from "../components/LeaderboardList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useLanguage } from "../context/LanguageContext";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function AdminLeaderboard() {
  const { t } = useLanguage();
  const { data, loading, error } = useApi(async () => (await api.get("/admin/leaderboard")).data, []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">{t("admin.leaderboardAnalytics", "Leaderboard Analytics")}</h1>
      <div className="glass rounded-3xl p-5">
        {loading ? <LoadingSkeleton rows={8} /> : error ? <div>{error}</div> : <LeaderboardList rows={data.leaderboard} />}
      </div>
    </div>
  );
}
