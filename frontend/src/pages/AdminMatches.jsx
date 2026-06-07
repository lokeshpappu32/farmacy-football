import { useEffect, useState } from "react";
import Toast from "../components/Toast";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useLanguage } from "../context/LanguageContext";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";
import { localizeMessage } from "../utils/messages";

const empty = { team1_iso: "", team2_iso: "", match_datetime: "" };
const perPage = 20;

export default function AdminMatches() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty);
  const [actions, setActions] = useState({});
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("gold");
  const [countries, setCountries] = useState([]);
  const { data, loading, error, refresh } = useApi(async () => (await api.get(`/admin/matches?page=${page}&per_page=${perPage}`)).data, [page]);

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
  const changeActionType = (match, action) => {
    setActions((current) => ({
      ...current,
      [match.id]: {
        action,
        winner_team: action === "winner" ? current[match.id]?.winner_team || "" : "",
        match_datetime: action === "reschedule" ? current[match.id]?.match_datetime || toDateTimeLocal(match.match_datetime) : "",
      },
    }));
  };
  const create = async (event) => {
    event.preventDefault();
    try {
      await api.post("/admin/matches", { ...form, match_datetime: toUtcIso(form.match_datetime) });
      setForm(empty);
      setToastTone("gold");
      setToast(t("toast.matchCreated", "Match created."));
      refresh();
    } catch (err) {
      setToastTone("error");
      setToast(localizeMessage(err.message, t));
    }
  };
  const applyAction = async (match) => {
    const state = actions[match.id] || { action: "winner" };
    const payload = { action: state.action };
    if (state.action === "winner") {
      if (!state.winner_team) {
        setToastTone("error");
        setToast(t("errors.selectWinningTeam", "Select a winning team."));
        return;
      }
      payload.winner_team = state.winner_team;
    }
    if (state.action === "reschedule") {
      if (!state.match_datetime) {
        setToastTone("error");
        setToast(t("errors.selectMatchDate", "Select the new match date and time."));
        return;
      }
      payload.match_datetime = toUtcIso(state.match_datetime);
    }
    try {
      const { data } = await api.post(`/admin/matches/${match.id}/action`, payload);
      setToastTone("gold");
      setToast(localizeMessage(data.message || "Match updated.", t));
      setActions((current) => ({ ...current, [match.id]: { action: "winner", winner_team: "", match_datetime: "" } }));
      refresh();
    } catch (err) {
      setToastTone("error");
      setToast(localizeMessage(err.message, t));
    }
  };
  const allMatches = data?.matches || [];
  const hasServerPagination = Boolean(data?.pagination);
  const localTotalPages = Math.max(Math.ceil(allMatches.length / perPage), 1);
  const matchesMeta = data?.pagination || {
    page,
    per_page: perPage,
    total: allMatches.length,
    pages: localTotalPages,
    has_prev: page > 1,
    has_next: page < localTotalPages,
  };
  const visibleMatches = hasServerPagination ? allMatches : allMatches.slice((page - 1) * perPage, page * perPage);
  return (
    <div className="space-y-6">
      <Toast message={toast} tone={toastTone} onClose={() => setToast("")} />
      <h1 className="text-3xl font-black">{t("admin.matchManagement", "Match Management")}</h1>
      <form onSubmit={create} className="glass grid gap-3 rounded-3xl p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
        <CountrySelect label={t("admin.team1", "Team 1")} value={form.team1_iso} countries={countries} onChange={(value) => update("team1_iso", value)} />
        <CountrySelect label={t("admin.team2", "Team 2")} value={form.team2_iso} countries={countries} onChange={(value) => update("team2_iso", value)} />
        <label className="text-sm font-bold">
          Match date & time
          <input required className="input mt-2" type="datetime-local" value={form.match_datetime} onChange={(e) => update("match_datetime", e.target.value)} />
        </label>
        <button className="btn-primary">{t("admin.create", "Create")}</button>
      </form>
      <div className="glass rounded-3xl p-4">
        {loading ? <LoadingSkeleton rows={6} /> : error ? <div>{error}</div> : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-black">{t("admin.matches", "Matches")}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
                  {matchesMeta.total || 0} total
                </span>
                <Pagination meta={matchesMeta} onPage={setPage} />
              </div>
            </div>
            <div className="scroll-panel max-h-[680px] space-y-3 overflow-y-auto pr-2">
              {visibleMatches.map((match) => (
                <div key={match.id} className="grid gap-3 rounded-2xl bg-white/10 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <CompactLogo src={match.team1_logo} fallbackSrc={match.team1_flag_url} name={match.team1} />
                      <div className="text-lg font-black">
                        {match.team1} <span className="text-ember">VS</span> {match.team2}
                      </div>
                      <CompactLogo src={match.team2_logo} fallbackSrc={match.team2_flag_url} name={match.team2} />
                    </div>
                    <div className="mt-1 grid gap-1 text-sm text-white/60">
                      <span>UTC: {formatUtcDateTime(match.match_datetime)}</span>
                      <span>Local: {formatDateTime(match.match_datetime)} - {match.result_label || match.status}</span>
                    </div>
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
                        onChange={(event) => changeActionType(match, event.target.value)}
                      >
                        <option className="bg-black" value="winner">Winner</option>
                        <option className="bg-black" value="draw">{t("common.draw", "Draw")}</option>
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
                      <button type="button" className="btn-primary whitespace-nowrap" onClick={() => applyAction(match)}>{t("admin.updateMatch", "Update Match")}</button>
                    </div>
                  )}
                </div>
              ))}
              {visibleMatches.length === 0 && <div className="rounded-2xl bg-white/10 p-5 text-white/55">{t("admin.noMatches", "No matches found.")}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Pagination({ meta, onPage }) {
  const { t } = useLanguage();
  if (!meta) return null;
  const currentPage = meta.page || 1;
  const totalPages = Math.max(meta.pages || 1, 1);
  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!meta.has_prev}
        onClick={() => onPage(currentPage - 1)}
      >
        {t("schedule.previous", "Prev")}
      </button>
      <span className="min-w-12 text-center text-xs font-bold text-white/60">{currentPage}/{totalPages}</span>
      <button
        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!meta.has_next}
        onClick={() => onPage(currentPage + 1)}
      >
        {t("schedule.next", "Next")}
      </button>
    </div>
  );
}

function CompactLogo({ src, fallbackSrc, name }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  useEffect(() => setCurrentSrc(src || fallbackSrc), [src, fallbackSrc]);
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-1">
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={name}
          className="max-h-full max-w-full"
          onError={() => setCurrentSrc(currentSrc !== fallbackSrc ? fallbackSrc : null)}
        />
      ) : (
        <span className="text-xs font-black text-pitch">{name?.slice(0, 2)}</span>
      )}
    </div>
  );
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return value.slice(0, 16);
}

function toUtcIso(dateTime) {
  if (!dateTime) return dateTime;
  return `${dateTime}:00+00:00`;
}

function formatUtcDateTime(value) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
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
