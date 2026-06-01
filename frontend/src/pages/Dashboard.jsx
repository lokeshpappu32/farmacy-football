import { useState } from "react";
import { motion } from "framer-motion";
import { FaBell, FaFutbol, FaStar } from "react-icons/fa";
import CountdownTimer from "../components/CountdownTimer";
import LoadingSkeleton from "../components/LoadingSkeleton";
import TeamLogo from "../components/TeamLogo";
import Toast from "../components/Toast";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import IdentityHeader from "../components/IdentityHeader";
import { useAuth } from "../context/AuthContext";
import { addHours, formatDate, formatDateTime } from "../utils/datetime";

export default function Dashboard() {
  const { role } = useAuth();
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
  const nextMatch = data?.next_match;

  return (
    <div className="space-y-6">
      <IdentityHeader nameLabel={role === "hetero_rep" ? "Participant name" : "Name of the Farmacist"} />
      <Toast message={toast} onClose={() => setToast("")} tone={toast.includes("saved") ? "gold" : "error"} />
      <Announcements announcements={data?.announcements || []} />
{/* 
      <div className="flex flex-col justify-between gap-2 text-center md:items-center">
        <div>
          <p className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-gold"><FaFutbol /> Game Dashboard</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">Matches Opening Within 48 Hours</h1>
          <p className="mt-2 text-white/80">
            {matches.length ? "Submit or edit your prediction until kickoff." : "No match is open for participation in the next 48 hours."}
          </p>
        </div>
      </div> */}

      {matches.length === 0 ? (
        <NoOpenMatches nextMatch={nextMatch} />
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

function NoOpenMatches({ nextMatch }) {
  const predictionOpenDate = nextMatch?.match_datetime ? addHours(nextMatch.match_datetime, -48) : null;

  return (
    <div className="glass rounded-3xl p-8 text-center">
      <div className="text-xl font-black">No matches are open yet.</div>
      {nextMatch ? (
        <div className="mx-auto mt-4 max-w-2xl space-y-2 text-base font-bold text-white/75 md:text-lg">
          <p>The first match is happening on {formatDate(nextMatch.match_datetime)}.</p>
          <p>You can start choosing your favourite team on {formatDate(predictionOpenDate)}.</p>
        </div>
      ) : (
        <p className="mt-3 text-base font-bold text-white/65">Upcoming match details will be available soon.</p>
      )}
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
      className="mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-black/15 shadow-[0_22px_70px_rgba(0,0,0,0.35)] backdrop-blur-sm"
    >
      <div className="bg-white px-6 py-4 text-center text-slate-700">
        <div className="grid items-center gap-4 md:grid-cols-[180px_1fr_180px]">
          <div className="hidden items-center justify-center md:flex">
            <img src="/images/football-a.png" alt="" className="h-24 w-24 object-contain" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-600">{formatDateTime(match.match_datetime)}</p>
            <h2 className="mt-1 text-3xl font-black text-red-600 md:text-4xl">{match.team1} <span className="text-slate-600">VS</span> {match.team2}</h2>
            <span className={`mt-3 inline-flex rounded-full border px-8 py-1 text-base font-black ${
              prediction ? "border-red-500 bg-red-50 text-red-600" : "border-red-500 text-red-600"
            }`}>
              {prediction ? "Participated" : "Participate Now"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <div className="flex items-center justify-around gap-4">
            <TeamLogo src={match.team1_logo} fallbackSrc={match.team1_flag_url} name={match.team1} />
            <div className="text-3xl font-black">VS</div>
            <TeamLogo src={match.team2_logo} fallbackSrc={match.team2_flag_url} name={match.team2} />
          </div>
          <div className="mx-auto mt-8 max-w-lg">
            {(match.venue_name || match.venue_location) && (
              <div className="mb-3 text-center text-xs font-semibold text-white/70">
                {match.venue_name && <span><span className="text-gold">Stadium:</span> {match.venue_name}</span>}
                {match.venue_name && match.venue_location && <span className="px-2 text-white/30">|</span>}
                {match.venue_location && <span><span className="text-gold">Location:</span> {match.venue_location}</span>}
              </div>
            )}
            <CountdownTimer target={match.match_datetime} />
          </div>
        </div>

        <div className="p-2 md:p-4">
          <div className="mb-5 flex items-center gap-2 text-white"><FaStar /> <span className="font-black">My favourite Team Today</span></div>
          {prediction && (
            <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-3 text-sm">
              Current pick: <b>{prediction.predicted_team}</b> with <b>{prediction.favorite_drug}</b>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[match.team1, "Draw", match.team2].map((name) => (
                <button
                  type="button"
                  key={name}
                  disabled={!canEdit}
                  onClick={() => onDraft(match.id, "predicted_team", name)}
                  className={`match-choice-btn border ${
                    selectedTeam === name
                      ? "border-white bg-white/85 text-black"
                      : "border-white/20 bg-white/45 text-white"
                  } ${canEdit ? "hover:border-gold/60" : "cursor-not-allowed opacity-70"}`}
                >
                  <span
                    className="match-choice-text"
                    style={{ fontSize: `clamp(0.68rem, ${Math.max(0.82, Math.min(1.12, 7 / String(name).length))}vw, 1.08rem)` }}
                  >
                    {name}
                  </span>
                </button>
              ))}
            </div>
            <label className="block text-lg font-black">My favourite HETERO Brand Today</label>
            <input
              className="enroll-input rounded-full"
              value={selectedDrug}
              disabled={!canEdit}
              onChange={(event) => onDraft(match.id, "favorite_drug", event.target.value)}
              placeholder="Xxxxxxxxxxxxxxx"
            />
            <button disabled={!canEdit} onClick={() => onSubmit(match)} className="w-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-8 py-4 text-3xl font-black text-white disabled:cursor-not-allowed disabled:opacity-70">
              {isLocked ? (prediction ? "Locked" : "Not Eligible") : prediction ? "Update" : "Participate"}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
