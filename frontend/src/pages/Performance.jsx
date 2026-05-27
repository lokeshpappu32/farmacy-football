import { FaBullseye, FaChartLine, FaMedal, FaTrophy } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

const rewardTarget = 5000;
const rewardTiers = [
  { points: 1000, label: "Hetero cap" },
  { points: 5000, label: "Water bottle" },
];

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
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Reward Progress</h2>
            <p className="text-sm text-white/55">Reach reward milestones and compete for the country top scorer prize.</p>
          </div>
          <span className="text-sm font-black text-gold">{Math.min(data.total_points, rewardTarget)} / {rewardTarget} points</span>
        </div>
        <div className="relative h-4 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-ember" style={{ width: `${Math.min(100, (data.total_points / rewardTarget) * 100)}%` }} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {rewardTiers.map((tier) => (
            <div key={tier.points} className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="text-2xl font-black text-gold">{tier.points.toLocaleString()} pts</div>
              <div className="mt-1 text-sm font-bold">{tier.label}</div>
              <div className="mt-2 text-xs text-white/50">
                {data.total_points >= tier.points ? "Reached" : `${tier.points - data.total_points} points to go`}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-gold/25 bg-gold/10 p-4">
            <div className="text-2xl font-black text-gold">$200</div>
            <div className="mt-1 text-sm font-bold">Top scorer reward</div>
            <div className="mt-2 text-xs text-white/60">Awarded to the highest scorer within the country.</div>
          </div>
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

function predictionResultLabel(prediction) {
  if (prediction.is_correct === null) return "Awaiting result";
  if (prediction.is_correct) return "Correct +50";
  if (prediction.match?.status === "cancelled") return "Match cancelled - no winner bonus";
  if (prediction.match?.winner_team === "Draw") return "Draw result - prediction did not match";
  return "Wrong prediction";
}
