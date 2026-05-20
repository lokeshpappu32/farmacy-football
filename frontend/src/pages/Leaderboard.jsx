import { useState } from "react";
import LeaderboardList from "../components/LeaderboardList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function Leaderboard() {
  const [country, setCountry] = useState("");
  const { data, loading, error, refresh } = useApi(async () => (await api.get(`/leaderboard${country ? `?country=${country}` : ""}`)).data, [country]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">Leaderboard</h1>
          <p className="text-white/60">Global and country rankings for all pharmacists.</p>
        </div>
        <div className="flex gap-2">
          <input className="input max-w-xs" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Filter country" />
          <button className="btn-ghost" onClick={refresh}>Refresh</button>
        </div>
      </div>
      <div className="glass rounded-3xl p-4 md:p-6">
        {loading ? <LoadingSkeleton rows={6} /> : error ? <div>{error}</div> : <LeaderboardList rows={data.leaderboard} />}
      </div>
    </div>
  );
}
