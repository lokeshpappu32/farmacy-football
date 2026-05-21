import { useEffect, useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

const empty = { team1_iso: "", team2_iso: "", match_datetime: "" };

export default function AdminMatches() {
  const [form, setForm] = useState(empty);
  const [actions, setActions] = useState({});
  const [countries, setCountries] = useState([]);
  const { data, loading, error, refresh } = useApi(async () => (await api.get("/admin/matches")).data, []);

  useEffect(() => {
    api.get("/countries")
      .then(({ data }) => {
        setCountries(data.countries || []);
        setForm((current) => ({
          ...current,
          team1_iso: current.team1_iso || data.countries?.[0]?.iso_code || "",
          team2_iso: current.team2_iso || data.countries?.[1]?.iso_code || "",
        }));
      })
      .catch(() => {});
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateAction = (matchId, key, value) => {
    setActions((current) => ({
      ...current,
      [matchId]: { action: "winner", winner_team: "", match_datetime: "", ...(current[matchId] || {}), [key]: value },
    }));
  };
  const create = async (event) => {
    event.preventDefault();
    await api.post("/admin/matches", { ...form, match_datetime: new Date(form.match_datetime).toISOString() });
    setForm(empty);
    refresh();
  };
  const applyAction = async (match) => {
    const state = actions[match.id] || { action: "winner" };
    const payload = { action: state.action };
    if (state.action === "winner") {
      if (!state.winner_team) return;
      payload.winner_team = state.winner_team;
    }
    if (state.action === "reschedule") {
      if (!state.match_datetime) return;
      payload.match_datetime = new Date(state.match_datetime).toISOString();
    }
    await api.post(`/admin/matches/${match.id}/action`, payload);
    refresh();
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Match Management</h1>
      <form onSubmit={create} className="glass grid gap-3 rounded-3xl p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
        <CountrySelect label="Team 1" value={form.team1_iso} countries={countries} onChange={(value) => update("team1_iso", value)} />
        <CountrySelect label="Team 2" value={form.team2_iso} countries={countries} onChange={(value) => update("team2_iso", value)} />
        <label className="text-sm font-bold">
          Match date & time
          <input required className="input mt-2" type="datetime-local" value={form.match_datetime} onChange={(e) => update("match_datetime", e.target.value)} />
        </label>
        <button className="btn-primary">Create</button>
      </form>
      <div className="glass rounded-3xl p-4">
        {loading ? <LoadingSkeleton rows={6} /> : error ? <div>{error}</div> : (
          <div className="space-y-3">
            {data.matches.map((match) => (
              <div key={match.id} className="grid gap-3 rounded-2xl bg-white/10 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="text-lg font-black">{match.team1} vs {match.team2}</div>
                  <div className="text-sm text-white/60">{formatDateTime(match.match_datetime)} - {match.result_label || match.status}</div>
                </div>
                {["completed", "cancelled"].includes(match.status) ? (
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white/55">
                    Result locked
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-[140px_180px_auto]">
                    <select
                      className="input"
                      value={actions[match.id]?.action || "winner"}
                      onChange={(event) => updateAction(match.id, "action", event.target.value)}
                    >
                      <option className="bg-black" value="winner">Winner</option>
                      <option className="bg-black" value="draw">Draw</option>
                      <option className="bg-black" value="reschedule">Reschedule</option>
                      <option className="bg-black" value="cancel">Cancel</option>
                    </select>
                    {(actions[match.id]?.action || "winner") === "winner" && (
                      <select
                        className="input"
                        value={actions[match.id]?.winner_team || ""}
                        onChange={(event) => updateAction(match.id, "winner_team", event.target.value)}
                      >
                        <option className="bg-black" value="">Select team</option>
                        <option className="bg-black" value={match.team1}>{match.team1}</option>
                        <option className="bg-black" value={match.team2}>{match.team2}</option>
                      </select>
                    )}
                    {(actions[match.id]?.action || "winner") === "reschedule" && (
                      <input
                        className="input"
                        type="datetime-local"
                        value={actions[match.id]?.match_datetime || ""}
                        onChange={(event) => updateAction(match.id, "match_datetime", event.target.value)}
                      />
                    )}
                    {["draw", "cancel"].includes(actions[match.id]?.action || "") && <div className="hidden sm:block" />}
                    <button type="button" className="btn-primary whitespace-nowrap" onClick={() => applyAction(match)}>Update Match</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CountrySelect({ label, value, countries, onChange }) {
  const selected = countries.find((country) => country.iso_code === value);
  return (
    <label className="text-sm font-bold">
      {label}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white">
          {selected?.flag_url ? <img src={selected.flag_url} alt={selected.name} className="max-h-8 max-w-10" /> : <span className="text-xs font-black text-black">{selected?.iso_code || "--"}</span>}
        </div>
        <select required className="input" value={value} onChange={(event) => onChange(event.target.value)}>
          {countries.map((country) => (
            <option className="bg-black" key={country.iso_code} value={country.iso_code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
