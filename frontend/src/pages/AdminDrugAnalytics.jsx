import { useCallback, useMemo, useState } from "react";
import { FaCapsules, FaFilter, FaPills, FaUsers } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useLanguage } from "../context/LanguageContext";
import { useApi } from "../hooks/useApi";
import api from "../services/api";
import { formatDateTime } from "../utils/datetime";

export default function AdminDrugAnalytics() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState({ country: "", participant_type: "", sort: "most" });
  const [page, setPage] = useState(1);
  const perPage = 25;
  const drugRequest = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.participant_type) params.set("participant_type", filters.participant_type);
    params.set("sort", filters.sort);
    params.set("page", page);
    params.set("per_page", perPage);
    return (await api.get(`/admin/drug-analytics?${params.toString()}`)).data;
  }, [filters.country, filters.participant_type, filters.sort, page]);
  const { data, loading, error } = useApi(drugRequest, [drugRequest]);

  const maxDrug = Math.max(...(data?.drugs || []).map((item) => item.selection_count), 1);
  const insights = useMemo(() => {
    const drugs = data?.drugs || [];
    const answers = data?.answers || [];
    const topDrug = drugs[0];
    const uniqueDrugs = drugs.length;
    const uniqueUsers = data?.summary?.unique_users ?? new Set(answers.map((answer) => answer.mobile_number || answer.email || answer.participant)).size;
    const pending = data?.summary?.pending_results ?? answers.filter((answer) => answer.is_correct === null).length;
    return { topDrug, uniqueDrugs, uniqueUsers, pending };
  }, [data]);
  const answers = data?.answers || [];
  const pagination = data?.pagination;
  const participantTypes = data?.participant_types?.length ? data.participant_types : defaultParticipantTypes;
  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const exportAnswers = () => {
    const csv = toCsv(answers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "farmacy-drug-answers.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">{t("admin.drugAnalytics", "Drug Analytics")}</h1>
        <p className="mt-2 text-white/60">Favorite brand responses, filtered by country and participant type.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("admin.topDrug", "Top Drug")} value={insights.topDrug?.favorite_drug || "-"} icon={FaPills} />
        <StatCard label={t("admin.selections", "Selections")} value={insights.topDrug?.selection_count || 0} icon={FaCapsules} />
        <StatCard label={t("admin.uniqueUsers", "Unique Users")} value={insights.uniqueUsers} icon={FaUsers} />
        <StatCard label="Pending Results" value={insights.pending} icon={FaFilter} />
      </div>

      <section className="glass rounded-3xl p-4 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(220px,420px)_1fr] xl:items-end">
          <div className="min-w-0">
            <h2 className="text-xl font-black">{t("admin.filters", "Filters")}</h2>
            <p className="text-sm text-white/55">Use these filters to find country-wise and participant-type-wise brand preference.</p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <select className="input" value={filters.country} onChange={(event) => updateFilter("country", event.target.value)}>
              <option className="bg-black" value="">{t("common.allCountries", "All countries")}</option>
              {(data?.countries || []).map((country) => <option className="bg-black" key={country} value={country}>{country}</option>)}
            </select>
            <select className="input" value={filters.participant_type} onChange={(event) => updateFilter("participant_type", event.target.value)}>
              <option className="bg-black" value="">{t("admin.allParticipantTypes", "All participant types")}</option>
              {participantTypes.map((type) => <option className="bg-black" key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <select className="input" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              <option className="bg-black" value="most">Most selected</option>
              <option className="bg-black" value="least">Least selected</option>
            </select>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <section className="glass min-w-0 rounded-3xl p-4 md:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-black">Drug Preference Ranking</h2>
              <p className="text-sm text-white/55">{insights.uniqueDrugs} drugs found for selected filters.</p>
            </div>
          </div>
          <div className="scroll-panel max-h-[560px] space-y-3 overflow-y-auto pr-2">
            {(data?.drugs || []).map((row, index) => (
              <div key={row.favorite_drug} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-black">{index + 1}. {row.favorite_drug}</span>
                  <span className="shrink-0 text-right text-sm font-bold text-gold">{row.selection_count} selections</span>
                </div>
                <div className="h-3 rounded-full bg-black/35">
                  <div className="h-full rounded-full bg-gradient-to-r from-gold to-ember" style={{ width: `${(row.selection_count / maxDrug) * 100}%` }} />
                </div>
                <div className="mt-2 text-xs text-white/50">{row.unique_users} unique users</div>
              </div>
            ))}
            {(data?.drugs || []).length === 0 && <div className="rounded-2xl bg-white/10 p-5 text-white/60">No favorite drug answers found for this filter.</div>}
          </div>
        </section>

        <section className="glass min-w-0 rounded-3xl p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-black">User Answers</h2>
              <p className="text-sm text-white/55">Participant-level answer details for Hetero product insight.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-fit shrink-0 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">{pagination?.total ?? answers.length} rows</span>
              <PaginationControls meta={pagination} onPage={setPage} />
              <button className="btn-primary" onClick={exportAnswers}>{t("admin.exportCsv", "Export CSV")}</button>
            </div>
          </div>
          <div className="scroll-panel max-h-[560px] min-w-0 overflow-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-white/55">
                <tr>
                  <th className="p-3">Participant</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Points</th>
                  <th className="p-3">Match</th>
                  <th className="p-3">Match Status</th>
                  <th className="p-3">Winner</th>
                  <th className="p-3">Prediction</th>
                  <th className="p-3">Drug</th>
                  <th className="p-3">Earned</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {answers.map((answer) => (
                  <tr key={answer.id} className="border-t border-white/10">
                    <td className="p-3 font-bold">{answer.participant}</td>
                    <td className="p-3">{answer.email || "-"}</td>
                    <td className="p-3">{answer.country}</td>
                    <td className="p-3">{typeLabel(answer.participant_type)}</td>
                    <td className="p-3 font-black text-gold">{answer.total_points}</td>
                    <td className="p-3">{answer.match}</td>
                    <td className="p-3">
                      <div className="font-bold capitalize">{answer.match_status}</div>
                      <div className="text-xs text-white/45">{answer.match_result}</div>
                    </td>
                    <td className="p-3">{answer.winner_team || "-"}</td>
                    <td className="p-3">{answer.predicted_team}</td>
                    <td className="p-3 font-black text-gold">{answer.favorite_drug}</td>
                    <td className="p-3">{Number(answer.participation_points || 0) + Number(answer.winner_points || 0)}</td>
                    <td className="p-3">{answer.is_correct === null ? "Pending" : answer.is_correct ? "Correct" : "No bonus"}</td>
                    <td className="p-3">{formatDateTime(answer.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <PaginationControls meta={pagination} onPage={setPage} />
          </div>
        </section>
      </div>
    </div>
  );
}

const defaultParticipantTypes = [
  { value: "all_farmacists", label: "All Farmacists" },
  { value: "farmacy_owner", label: "Farmacy Owner" },
  { value: "farmacy_head_supervisor", label: "Farmacy Head / Supervisor" },
  { value: "farmacy_sales_staff", label: "Farmacy Sales Staff" },
  { value: "hetero_representative_staff", label: "HETERO Representative / Staff" },
];

function typeLabel(value) {
  const option = defaultParticipantTypes.find((item) => {
    if (item.value === "farmacy_head_supervisor") return ["farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor"].includes(value);
    if (item.value === "hetero_representative_staff") return ["hetero_representative_staff", "hetero_staff", "hetero_representative", "medical_rep"].includes(value);
    return item.value === value;
  });
  return option?.label || "Farmacist";
}

function PaginationControls({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <button className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45" disabled={!meta.has_prev} onClick={() => onPage(meta.page - 1)}>
        Prev
      </button>
      <span className="min-w-14 text-center text-xs font-bold text-white/60">{meta.page}/{meta.pages}</span>
      <button className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-45" disabled={!meta.has_next} onClick={() => onPage(meta.page + 1)}>
        Next
      </button>
    </div>
  );
}

function toCsv(answers) {
  const header = [
    "participant",
    "email",
    "country",
    "participant_type",
    "total_points",
    "match",
    "match_status",
    "match_result",
    "winner_team",
    "predicted_team",
    "favorite_drug",
    "earned_points",
    "result",
    "submitted_at",
  ];
  const rows = answers.map((answer) => [
    answer.participant,
    answer.email || "",
    answer.country,
    typeLabel(answer.participant_type),
    answer.total_points || 0,
    answer.match,
    answer.match_status,
    answer.match_result,
    answer.winner_team || "",
    answer.predicted_team,
    answer.favorite_drug,
    Number(answer.participation_points || 0) + Number(answer.winner_points || 0),
    answer.is_correct === null ? "Pending" : answer.is_correct ? "Correct" : "No bonus",
    formatDateTime(answer.submitted_at),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
