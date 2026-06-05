import { FaBullseye, FaChartLine, FaMedal, FaTrophy } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import IdentityHeader from "../components/IdentityHeader";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

export default function Performance() {
  const { t } = useLanguage();
  const { data, loading, error } = useApi(async () => (await api.get("/performance")).data, []);
  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  return (
    <div className="space-y-6">
      <IdentityHeader nameLabel={t("identity.nameFarmacist", "Name of the Farmacist")} />
      <div>
        <h1 className="text-3xl font-black">{t("performance.performanceDashboard", "Performance Dashboard")}</h1>
        <p className="text-white/60">{t("performance.performanceIntro", "Track points, prediction accuracy, match history, and points history.")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={t("performance.totalPoints", "Total Points")} value={data.total_points} icon={FaTrophy} />
        <StatCard label={t("performance.globalRank", "Global Rank")} value={data.rank || "-"} icon={FaMedal} />
        <StatCard label={t("performance.participated", "Participated")} value={data.matches_participated} icon={FaChartLine} />
        <StatCard label={t("performance.accuracy", "Accuracy")} value={`${data.accuracy}%`} icon={FaBullseye} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-black">{t("performance.matchHistory", "Match History")}</h2>
          <div className="scroll-panel max-h-[460px] space-y-3 overflow-y-auto pr-2">
            {data.predictions.map((prediction) => (
              <div key={prediction.id} className="rounded-2xl bg-white/10 p-4">
                <div className="font-bold">{prediction.match.team1} vs {prediction.match.team2}</div>
                <div className="text-sm text-white/60">{t("performance.picked", `Picked ${prediction.predicted_team} - ${prediction.favorite_drug}`, { team: prediction.predicted_team, drug: prediction.favorite_drug })}</div>
                <div className="mt-2 text-sm text-gold">{predictionResultLabel(prediction, t)}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-black">{t("performance.pointsHistory", "Points History")}</h2>
          <div className="scroll-panel max-h-[460px] space-y-3 overflow-y-auto pr-2">
            {data.points_history.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                <div>
                  <div className="font-bold">{item.reason}</div>
                  <div className="text-xs text-white/55">{formatDateTime(item.created_at)}</div>
                </div>
                <div className={`text-xl font-black ${item.points < 0 ? "text-ember" : "text-gold"}`}>
                  {item.points > 0 ? `+${item.points}` : item.points}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function predictionResultLabel(prediction, t) {
  if (prediction.is_correct === null) return t("performance.awaitingResult", "Awaiting result");
  if (prediction.is_correct) return t("performance.correct50", "Correct +50");
  if (prediction.match?.status === "cancelled") return t("performance.cancelledPointsRetained", "Match cancelled - participation points retained");
  if (prediction.match?.winner_team === "Draw") return t("performance.drawDidNotMatch", "Draw result - prediction did not match");
  return t("performance.wrongPrediction", "Wrong prediction");
}
