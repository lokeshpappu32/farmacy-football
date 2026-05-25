import { useState } from "react";
import { motion } from "framer-motion";
import { FaBell, FaCalendarDay, FaStar } from "react-icons/fa";
import CountdownTimer from "../components/CountdownTimer";
import LoadingSkeleton from "../components/LoadingSkeleton";
import TeamLogo from "../components/TeamLogo";
import Toast from "../components/Toast";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

export default function Dashboard() {
  const today = new Date();
  const clientDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data, loading, error, refresh } = useApi(
    async () => (await api.get(`/matches/dashboard?tz_offset_minutes=${new Date().getTimezoneOffset()}&client_date=${clientDate}`)).data,
    [],
  );
  const [drafts, setDrafts] = useState({});
  const [toast, setToast] = useState("");

  const updateDraft = (matchId, key, value) => {
    setDrafts((current) => ({ ...current, [matchId]: { ...(current[matchId] || {}), [key]: value } }));
  };

  const submit = async (match) => {
    const prediction = data.predictions?.[match.id];
    const draft = drafts[match.id] || {};
    try {
      const payload = {
        match_id: match.id,
        predicted_team: draft.predicted_team || prediction?.predicted_team || match.team1,
        favorite_drug: draft.favorite_drug || prediction?.favorite_drug || "",
      };
      if (prediction) await api.put(`/predictions/${prediction.id}`, payload);
      else await api.post("/predictions", payload);
      setToast("Prediction saved. You can edit until kickoff.");
      refresh();
    } catch (err) {
      setToast(err.message);
    }
  };

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;

  const matches = data?.matches || [];
  const awaitingResultMatches = data?.awaiting_result_matches || [];

  return (
    <div className="space-y-6">
      <Toast message={toast} onClose={() => setToast("")} tone={toast.includes("saved") ? "gold" : "error"} />
      <Announcements announcements={data?.announcements || []} />

      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gold"><FaCalendarDay /> Game Dashboard</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">
            {data?.schedule_date ? `Matches on ${new Date(`${data.schedule_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "full" })}` : "No scheduled matches"}
          </h1>
          <p className="mt-2 text-white/60">
            {matches.length ? "Showing today's matches or the next available match day. Submit or edit each prediction until kickoff." : "Admin has not scheduled an upcoming match yet."}
          </p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-xl font-bold">No upcoming matches are available yet.</div>
      ) : (
        <div className="grid gap-6">
          {matches.map((match, index) => (
            <MatchPredictionCard
              key={match.id}
              index={index}
              match={match}
              prediction={data.predictions?.[match.id]}
              draft={drafts[match.id] || {}}
              onDraft={updateDraft}
              onSubmit={submit}
            />
          ))}
        </div>
      )}

      <AwaitingResults
        matches={awaitingResultMatches}
        predictions={data.predictions || {}}
        drafts={drafts}
        onDraft={updateDraft}
        onSubmit={submit}
      />
    </div>
  );
}

function Announcements({ announcements }) {
  if (!announcements.length) return null;
  return (
    <section className="glass rounded-3xl p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2 text-gold"><FaBell /> <span className="font-black">Latest match updates</span></div>
      <div className="space-y-2">
        {announcements.map((item) => (
          <div key={item.id} className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-white/85">
            {item.message}
          </div>
        ))}
      </div>
    </section>
  );
}

function AwaitingResults({ matches, predictions, drafts, onDraft, onSubmit }) {
  if (!matches.length) return null;

  return (
    <section className="space-y-4 pt-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gold"><FaBell /> Awaiting Result Update</p>
        <h2 className="mt-2 text-2xl font-black md:text-3xl">Previous Matches Pending Result</h2>
        <p className="mt-2 text-sm text-white/60">These matches have started, so answers are locked until the result is updated by admin or API.</p>
      </div>
      <div className="grid gap-6">
        {matches.map((match, index) => (
          <MatchPredictionCard
            key={match.id}
            index={index}
            match={match}
            prediction={predictions?.[match.id]}
            draft={drafts[match.id] || {}}
            onDraft={onDraft}
            onSubmit={onSubmit}
          />
        ))}
      </div>
    </section>
  );
}

function MatchPredictionCard({ match, prediction, draft, onDraft, onSubmit, index }) {
  const selectedTeam = draft.predicted_team || prediction?.predicted_team || "";
  const selectedDrug = draft.favorite_drug ?? prediction?.favorite_drug ?? "";
  const isLocked = new Date(match.match_datetime).getTime() <= Date.now();
  const canEdit = !isLocked;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass overflow-hidden rounded-3xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <div className="bg-gradient-to-r from-ember/30 to-gold/20 p-5 md:p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gold">Scheduled fixture</p>
                <h2 className="mt-2 text-2xl font-black md:text-4xl">{match.team1} vs {match.team2}</h2>
                <p className="mt-2 text-white/65">{formatDateTime(match.match_datetime)}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${
                prediction
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : "border-white/15 bg-white/5 text-white/55"
              }`}>
                {prediction ? "Participated" : "Not participated"}
              </span>
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-around gap-4">
              <TeamLogo src={match.team1_logo} name={match.team1} />
              <div className="text-3xl font-black text-ember">VS</div>
              <TeamLogo src={match.team2_logo} name={match.team2} />
            </div>
            <div className="mt-6">
              {(match.venue_name || match.venue_location) && (
                <div className="mb-3 text-center text-xs font-semibold text-white/55">
                  {match.venue_name && <span><span className="text-gold">Stadium:</span> {match.venue_name}</span>}
                  {match.venue_name && match.venue_location && <span className="px-2 text-white/30">|</span>}
                  {match.venue_location && <span><span className="text-gold">Location:</span> {match.venue_location}</span>}
                </div>
              )}
              <CountdownTimer target={match.match_datetime} />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-5 lg:border-l lg:border-t-0 md:p-6">
          <div className="mb-5 flex items-center gap-2 text-gold"><FaStar /> <span className="font-black">Prediction questions</span></div>
          {prediction && (
            <div className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
              Current pick: <b>{prediction.predicted_team}</b> with <b>{prediction.favorite_drug}</b>
            </div>
          )}
          <div className="space-y-4">
            <label className="block text-sm font-bold">Which team will win?</label>
            <div className="grid grid-cols-2 gap-3">
              {[match.team1, match.team2].map((name) => (
                <button
                  type="button"
                  key={name}
                  disabled={!canEdit}
                  onClick={() => onDraft(match.id, "predicted_team", name)}
                  className={`rounded-2xl border p-4 font-black transition ${
                    selectedTeam === name
                      ? "border-gold bg-gold text-black"
                      : "border-white/15 bg-white/5"
                  } ${canEdit ? "hover:border-gold/60" : "cursor-not-allowed opacity-70"}`}
                >
                  {name}
                </button>
              ))}
            </div>
            <label className="block text-sm font-bold">Favorite Hetero drug</label>
            <input
              className="input"
              value={selectedDrug}
              disabled={!canEdit}
              onChange={(event) => onDraft(match.id, "favorite_drug", event.target.value)}
              placeholder="Enter favorite Hetero drug"
            />
            <button disabled={!canEdit} onClick={() => onSubmit(match)} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
              {isLocked ? (prediction ? "Match Started - Answers Locked" : "Match Started - Not Eligible") : prediction ? "Update Prediction" : "Participate and Earn +50"}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
