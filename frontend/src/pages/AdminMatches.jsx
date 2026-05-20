import { useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

const empty = { team1: "", team2: "", team1_logo: "", team2_logo: "", match_datetime: "" };

export default function AdminMatches() {
  const [form, setForm] = useState(empty);
  const [winnerSelections, setWinnerSelections] = useState({});
  const { data, loading, error, refresh } = useApi(async () => (await api.get("/admin/matches")).data, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const create = async (event) => {
    event.preventDefault();
    await api.post("/admin/matches", { ...form, match_datetime: new Date(form.match_datetime).toISOString() });
    setForm(empty);
    refresh();
  };
  const winner = async (match, winner_team) => {
    if (!winner_team) return;
    await api.post(`/admin/matches/${match.id}/winner`, { winner_team });
    refresh();
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Match Management</h1>
      <form onSubmit={create} className="glass grid gap-3 rounded-3xl p-5 md:grid-cols-2 lg:grid-cols-6">
        <input className="input" placeholder="Team 1" value={form.team1} onChange={(e) => update("team1", e.target.value)} />
        <input className="input" placeholder="Team 2" value={form.team2} onChange={(e) => update("team2", e.target.value)} />
        <input className="input" placeholder="Team 1 logo URL" value={form.team1_logo} onChange={(e) => update("team1_logo", e.target.value)} />
        <input className="input" placeholder="Team 2 logo URL" value={form.team2_logo} onChange={(e) => update("team2_logo", e.target.value)} />
        <input className="input" type="datetime-local" value={form.match_datetime} onChange={(e) => update("match_datetime", e.target.value)} />
        <button className="btn-primary">Create</button>
      </form>
      <div className="glass rounded-3xl p-4">
        {loading ? <LoadingSkeleton rows={6} /> : error ? <div>{error}</div> : (
          <div className="space-y-3">
            {data.matches.map((match) => (
              <div key={match.id} className="grid gap-3 rounded-2xl bg-white/10 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="text-lg font-black">{match.team1} vs {match.team2}</div>
                  <div className="text-sm text-white/60">{formatDateTime(match.match_datetime)} - {match.status} {match.winner_team ? `- Winner: ${match.winner_team}` : ""}</div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    className="input"
                    value={winnerSelections[match.id] || ""}
                    onChange={(event) => setWinnerSelections((current) => ({ ...current, [match.id]: event.target.value }))}
                  >
                    <option className="bg-black" value="">Select winner</option>
                    <option className="bg-black" value={match.team1}>{match.team1} won</option>
                    <option className="bg-black" value={match.team2}>{match.team2} won</option>
                  </select>
                  <button type="button" className="btn-primary whitespace-nowrap" onClick={() => winner(match, winnerSelections[match.id])}>Update Result</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
