import { useState } from "react";
import { FaCalendarAlt, FaCheckCircle, FaClock, FaMapMarkerAlt } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import TeamLogo from "../components/TeamLogo";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

const perPage = 8;

export default function MatchSchedule() {
  const [pages, setPages] = useState({ upcoming: 1, completed: 1 });
  const today = new Date();
  const clientDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data, loading, error } = useApi(
    async () => (await api.get(`/matches/schedule?upcoming_page=${pages.upcoming}&completed_page=${pages.completed}&per_page=${perPage}&tz_offset_minutes=${new Date().getTimezoneOffset()}&client_date=${clientDate}&_=${Date.now()}`)).data,
    [pages.upcoming, pages.completed],
  );

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gold"><FaCalendarAlt /> Match Schedule</p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">Upcoming & Completed Matches</h1>
        <p className="mt-2 text-white/60">Track all fixtures, final results, cancelled games, venues, and kickoff times in your local timezone.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <SchedulePanel
          title="Upcoming Matches"
          icon={FaClock}
          matches={data.upcoming || []}
          meta={data.pagination?.upcoming}
          empty="No upcoming matches available."
          onPage={(page) => setPages((current) => ({ ...current, upcoming: page }))}
        />
        <SchedulePanel
          title="Completed Matches"
          icon={FaCheckCircle}
          matches={data.completed || []}
          meta={data.pagination?.completed}
          empty="No completed matches yet."
          onPage={(page) => setPages((current) => ({ ...current, completed: page }))}
          completed
        />
      </div>
    </div>
  );
}

function SchedulePanel({ title, icon: Icon, matches, meta, empty, onPage, completed = false }) {
  return (
    <section className="glass rounded-3xl p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="text-gold" />
          <h2 className="text-xl font-black">{title}</h2>
        </div>
        <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
          {meta?.total || 0} total
        </span>
      </div>

      <div className="scroll-panel max-h-[720px] space-y-4 overflow-y-auto pr-2">
        {matches.map((match) => <ScheduleCard key={match.id} match={match} completed={completed} />)}
        {!matches.length && <div className="rounded-2xl bg-white/10 p-6 text-center text-white/60">{empty}</div>}
      </div>

      <Pagination meta={meta} onPage={onPage} />
    </section>
  );
}

function ScheduleCard({ match, completed }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gold">{completed ? "Result" : "Fixture"}</div>
          <h3 className="mt-1 text-lg font-black">{match.team1} vs {match.team2}</h3>
          <div className="mt-1 text-sm text-white/60">{formatDateTime(match.match_datetime)}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${match.status === "cancelled" ? "bg-ember/20 text-ember" : "bg-gold/10 text-gold"}`}>
          {match.result_label || match.status}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamLogo src={match.team1_logo} fallbackSrc={match.team1_flag_url} name={match.team1} />
        <div className="text-xl font-black text-ember">VS</div>
        <TeamLogo src={match.team2_logo} fallbackSrc={match.team2_flag_url} name={match.team2} />
      </div>

      {(match.venue_name || match.venue_location) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-white/55">
          <FaMapMarkerAlt className="text-gold" />
          {match.venue_name && <span><span className="text-gold">Stadium:</span> {match.venue_name}</span>}
          {match.venue_name && match.venue_location && <span className="text-white/30">|</span>}
          {match.venue_location && <span><span className="text-gold">Location:</span> {match.venue_location}</span>}
        </div>
      )}
    </article>
  );
}

function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <button className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50" disabled={!meta.has_prev} onClick={() => onPage(meta.page - 1)}>Previous</button>
      <span className="text-sm font-bold text-white/60">Page {meta.page} of {meta.pages}</span>
      <button className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50" disabled={!meta.has_next} onClick={() => onPage(meta.page + 1)}>Next</button>
    </div>
  );
}
