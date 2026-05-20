import { useState } from "react";
import { motion } from "framer-motion";
import { FaBolt, FaStar } from "react-icons/fa";
import CountdownTimer from "../components/CountdownTimer";
import LoadingSkeleton from "../components/LoadingSkeleton";
import TeamLogo from "../components/TeamLogo";
import Toast from "../components/Toast";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

const drugs = ["CoviFor", "Favivir", "Hepcinat", "Ledifos", "Velasof", "Tenvir", "Aluvia", "Ivermectol"];

export default function Dashboard() {
  const { data, loading, error, refresh } = useApi(async () => (await api.get("/matches/upcoming")).data, []);
  const [team, setTeam] = useState("");
  const [drug, setDrug] = useState(drugs[0]);
  const [toast, setToast] = useState("");
  const match = data?.match;
  const prediction = data?.prediction;

  const submit = async () => {
    try {
      const payload = { match_id: match.id, predicted_team: team || prediction?.predicted_team || match.team1, favorite_drug: drug || prediction?.favorite_drug };
      if (prediction) await api.put(`/predictions/${prediction.id}`, payload);
      else await api.post("/predictions", payload);
      setToast("Prediction locked in. You can edit until kickoff.");
      refresh();
    } catch (err) {
      setToast(err.message);
    }
  };

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  if (!match) return <div className="glass rounded-3xl p-8 text-center text-xl font-bold">No upcoming matches are available yet.</div>;

  return (
    <div className="space-y-6">
      <Toast message={toast} onClose={() => setToast("")} tone={toast.includes("locked") ? "gold" : "error"} />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass overflow-hidden rounded-3xl">
          <div className="bg-gradient-to-r from-ember/30 to-gold/20 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-gold">Next fixture</p>
                <h1 className="mt-2 text-3xl font-black md:text-5xl">{match.team1} vs {match.team2}</h1>
                <p className="mt-2 text-white/65">{formatDateTime(match.match_datetime)}</p>
              </div>
              <FaBolt className="hidden text-gold md:block" size={44} />
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-around gap-4">
              <TeamLogo src={match.team1_logo} name={match.team1} />
              <div className="text-3xl font-black text-ember">VS</div>
              <TeamLogo src={match.team2_logo} name={match.team2} />
            </div>
            <div className="mt-8">
              <CountdownTimer target={match.match_datetime} />
            </div>
          </div>
        </motion.section>
        <section className="glass rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-2 text-gold"><FaStar /> <span className="font-black">Prediction slip</span></div>
          {prediction && <div className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">Current pick: <b>{prediction.predicted_team}</b> with <b>{prediction.favorite_drug}</b></div>}
          <div className="space-y-4">
            <label className="block text-sm font-bold">Which team will win?</label>
            <div className="grid grid-cols-2 gap-3">
              {[match.team1, match.team2].map((name) => (
                <button key={name} onClick={() => setTeam(name)} className={`rounded-2xl border p-4 font-black ${team === name || (!team && prediction?.predicted_team === name) ? "border-gold bg-gold text-black" : "border-white/15 bg-white/5"}`}>
                  {name}
                </button>
              ))}
            </div>
            <label className="block text-sm font-bold">Favorite Hetero drug</label>
            <select className="input" value={drug} onChange={(e) => setDrug(e.target.value)}>
              {drugs.map((item) => <option className="bg-black" key={item}>{item}</option>)}
            </select>
            <button onClick={submit} className="btn-primary w-full">{prediction ? "Update Prediction" : "Participate and Earn +50"}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
