import { FaBullseye, FaChartLine, FaMedal, FaTrophy } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

export default function Performance() {
  const { data, loading, error } = useApi(async () => (await api.get("/performance")).data, []);
  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Performance Dashboard</h1>
        <p className="text-white/60">Track points, prediction accuracy, and reward progress.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Points" value={data.total_points} icon={FaTrophy} />
        <StatCard label="Global Rank" value={data.rank || "-"} icon={FaMedal} />
        <StatCard label="Accuracy" value={`${data.accuracy}%`} icon={FaBullseye} />
        <StatCard label="Participated" value={data.matches_participated} icon={FaChartLine} />
      </div>
      <div className="glass rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Reward Progress</h2>
          <span className="text-sm text-gold">{Math.min(data.total_points, 500)} / 500</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-ember" style={{ width: `${Math.min(100, (data.total_points / 500) * 100)}%` }} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-black">Match History</h2>
          <div className="space-y-3">
            {data.predictions.map((prediction) => (
              <div key={prediction.id} className="rounded-2xl bg-white/10 p-4">
                <div className="font-bold">{prediction.match.team1} vs {prediction.match.team2}</div>
                <div className="text-sm text-white/60">Picked {prediction.predicted_team} - {prediction.favorite_drug}</div>
                <div className="mt-2 text-sm text-gold">{predictionResultLabel(prediction)}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-black">Points History</h2>
          <div className="space-y-3">
            {data.points_history.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                <div>
                  <div className="font-bold">{item.reason}</div>
                  <div className="text-xs text-white/55">{formatDateTime(item.created_at)}</div>
                </div>
                <div className="text-xl font-black text-gold">+{item.points}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function predictionResultLabel(prediction) {
  if (prediction.is_correct === null) return "Awaiting result";
  if (prediction.is_correct) return "Correct +50";
  if (prediction.match?.status === "cancelled") return "Match cancelled - no winner bonus";
  if (prediction.match?.winner_team === "Draw") return "Draw - no winner bonus";
  return "Wrong prediction";
}
