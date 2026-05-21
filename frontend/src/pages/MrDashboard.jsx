import { FaBullseye, FaClock, FaTimesCircle, FaUsers } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function MrDashboard() {
  const { data, loading, error } = useApi(async () => (await api.get("/mr/dashboard")).data, []);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-gold">Medical Representative</p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">MR Dashboard - {data.mr_id}</h1>
        <p className="mt-2 text-white/60">Track pharmacists enrolled under your MR ID, their prediction accuracy, points, and ranking.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Participants" value={data.summary.participants} icon={FaUsers} />
        <StatCard label="Correct" value={data.summary.correct_predictions} icon={FaBullseye} />
        <StatCard label="Wrong" value={data.summary.wrong_predictions} icon={FaTimesCircle} />
        <StatCard label="Pending" value={data.summary.pending_predictions} icon={FaClock} />
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">MR Leaderboard</h2>
            <p className="text-sm text-white/55">Users registered with MR ID {data.mr_id}</p>
          </div>
          <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm">
            <span className="font-black text-gold">{data.summary.total_points}</span> total points - {data.summary.accuracy}% accuracy
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-white/55">
              <tr>
                <th className="p-3">MR Rank</th>
                <th>Participant</th>
                <th>Country</th>
                <th>Mobile</th>
                <th>Points</th>
                <th>Correct</th>
                <th>Wrong</th>
                <th>Pending</th>
                <th>Global Rank</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((user) => (
                <tr key={user.id} className="border-t border-white/10">
                  <td className="p-3 font-black text-gold">#{user.rank}</td>
                  <td className="font-bold">{user.full_name}</td>
                  <td>{user.country}</td>
                  <td>{user.mobile_number}</td>
                  <td className="font-black text-gold">{user.total_points}</td>
                  <td>{user.correct}</td>
                  <td>{user.wrong}</td>
                  <td>{user.pending}</td>
                  <td>{user.global_rank ? `#${user.global_rank}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.leaderboard.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
            No participants have enrolled with this MR ID yet.
          </div>
        )}
      </div>
    </div>
  );
}
