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
  const [filters, setFilters] = useState({ country: "", city: "", mr_id: "", sort: "most" });
  const drugRequest = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.city) params.set("city", filters.city);
    if (filters.mr_id) params.set("mr_id", filters.mr_id);
    params.set("sort", filters.sort);
    return (await api.get(`/admin/drug-analytics?${params.toString()}`)).data;
  }, [filters.country, filters.city, filters.mr_id, filters.sort]);
  const { data, loading, error } = useApi(drugRequest, [drugRequest]);

  const maxDrug = Math.max(...(data?.drugs || []).map((item) => item.selection_count), 1);
  const insights = useMemo(() => {
    const drugs = data?.drugs || [];
    const answers = data?.answers || [];
    const topDrug = drugs[0];
    const uniqueDrugs = drugs.length;
    const uniqueUsers = new Set(answers.map((answer) => answer.mobile_number || answer.email || answer.participant)).size;
    const pending = answers.filter((answer) => answer.is_correct === null).length;
    return { topDrug, uniqueDrugs, uniqueUsers, pending };
  }, [data]);
  const answers = data?.answers || [];
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
        <p className="mt-2 text-white/60">Favorite Hetero drug responses, filtered by country, city, and MR ID.</p>
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
            <p className="text-sm text-white/55">Use these filters to find country-wise, city-wise, or MR-wise drug preference.</p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select className="input" value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value, city: "" }))}>
              <option className="bg-black" value="">{t("common.allCountries", "All countries")}</option>
              {(data?.countries || []).map((country) => <option className="bg-black" key={country} value={country}>{country}</option>)}
            </select>
            <select className="input" value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}>
              <option className="bg-black" value="">{t("admin.allCities", "All cities")}</option>
              {(data?.cities || []).map((city) => <option className="bg-black" key={city} value={city}>{city}</option>)}
            </select>
            <select className="input" value={filters.mr_id} onChange={(event) => setFilters((current) => ({ ...current, mr_id: event.target.value }))}>
              <option className="bg-black" value="">{t("admin.allMrs", "All MRs")}</option>
              {(data?.mr_ids || []).map((mr) => <option className="bg-black" key={mr} value={mr}>{mr}</option>)}
            </select>
            <select className="input" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}>
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
              <span className="w-fit shrink-0 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">{answers.length} rows</span>
              <button className="btn-primary" onClick={exportAnswers}>{t("admin.exportCsv", "Export CSV")}</button>
            </div>
          </div>
          <div className="scroll-panel max-h-[560px] min-w-0 overflow-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-white/55">
                <tr>
                  <th className="p-3">Participant</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">City</th>
                  <th className="p-3">MR ID</th>
                  <th className="p-3">Match</th>
                  <th className="p-3">Match Status</th>
                  <th className="p-3">Prediction</th>
                  <th className="p-3">Drug</th>
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
                    <td className="p-3">{answer.city || "-"}</td>
                    <td className="p-3">{answer.mr_id}</td>
                    <td className="p-3">{answer.match}</td>
                    <td className="p-3">
                      <div className="font-bold capitalize">{answer.match_status}</div>
                      <div className="text-xs text-white/45">{answer.match_result}</div>
                    </td>
                    <td className="p-3">{answer.predicted_team}</td>
                    <td className="p-3 font-black text-gold">{answer.favorite_drug}</td>
                    <td className="p-3">{answer.is_correct === null ? "Pending" : answer.is_correct ? "Correct" : "No bonus"}</td>
                    <td className="p-3">{formatDateTime(answer.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function toCsv(answers) {
  const header = [
    "participant",
    "email",
    "country",
    "city",
    "mr_id",
    "match",
    "match_status",
    "match_result",
    "predicted_team",
    "favorite_drug",
    "result",
    "submitted_at",
  ];
  const rows = answers.map((answer) => [
    answer.participant,
    answer.email || "",
    answer.country,
    answer.city || "",
    answer.mr_id || "",
    answer.match,
    answer.match_status,
    answer.match_result,
    answer.predicted_team,
    answer.favorite_drug,
    answer.is_correct === null ? "Pending" : answer.is_correct ? "Correct" : "No bonus",
    formatDateTime(answer.submitted_at),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
