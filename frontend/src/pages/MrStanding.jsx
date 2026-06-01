import { useState } from "react";
import IdentityHeader from "../components/IdentityHeader";
import MrRankingList from "../components/MrRankingList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function MrStanding({
  mode = "admin",
  title,
  subtitle = "Ranking based on self participation points earned by HETERO Representatives / Staff.",
  showIdentity,
}) {
  const [country, setCountry] = useState("");
  const endpoint = mode === "rep" ? "/mr/rep/standing" : "/mr/standing";
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    return (await api.get(`${endpoint}${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [country, endpoint]);

  const countries = data?.countries || [];
  const rows = data?.mr_rankings || [];

  return (
    <div className="space-y-6">
      {(showIdentity ?? mode === "rep") && <IdentityHeader nameLabel="Participant name" />}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">{title || (mode === "rep" ? "My Standing" : "HETERO Staff Standing")}</h1>
          <p className="mt-2 text-white/65">{subtitle}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_auto]">
          <select className="input" value={country} onChange={(event) => setCountry(event.target.value)}>
            <option className="bg-black" value="">All countries</option>
            {countries.map((item) => <option className="bg-black" key={item} value={item}>{item}</option>)}
          </select>
          <button className="btn-ghost" onClick={refresh}>Refresh</button>
        </div>
      </div>

      <section className="glass scroll-panel max-h-[620px] overflow-y-auto rounded-3xl p-4 md:p-6">
        {loading ? <LoadingSkeleton rows={7} /> : error ? <div>{error}</div> : <MrRankingList rows={rows} showCountry={!country} />}
      </section>

      {mode === "rep" && !loading && !error && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="glass rounded-3xl p-5 md:p-6">
            <h2 className="text-xl font-black">My Points History</h2>
            <div className="scroll-panel mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {(data?.points_history || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <div className="font-black">{item.reason}</div>
                    <div className="text-xs text-white/50">{formatDateTime(item.created_at)}</div>
                  </div>
                  <div className="text-xl font-black text-gold">+{item.points}</div>
                </div>
              ))}
              {(data?.points_history || []).length === 0 && <div className="rounded-2xl bg-white/10 p-4 text-white/60">No points history yet.</div>}
            </div>
          </section>

          <section className="glass rounded-3xl p-5 md:p-6">
            <h2 className="text-xl font-black">My Match History</h2>
            <div className="scroll-panel mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {(data?.match_history || []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-black">{item.match?.team1} vs {item.match?.team2}</div>
                  <div className="mt-1 text-sm text-white/65">Prediction: <span className="font-bold text-gold">{item.predicted_team}</span></div>
                  <div className="mt-1 text-xs text-white/50">{item.is_correct === true ? "Correct" : item.is_correct === false ? "Wrong / No bonus" : "Pending result"}</div>
                </div>
              ))}
              {(data?.match_history || []).length === 0 && <div className="rounded-2xl bg-white/10 p-4 text-white/60">No match history yet.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
