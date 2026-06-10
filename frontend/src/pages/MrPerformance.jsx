import { useState } from "react";
import { FaChartLine, FaGlobeAsia, FaMedal, FaUsers } from "react-icons/fa";
import IdentityHeader from "../components/IdentityHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import MrRankingList from "../components/MrRankingList";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";

export default function MrPerformance({ mode = "admin" }) {
  const { t } = useLanguage();
  const [country, setCountry] = useState("");
  const endpoint = mode === "rep" ? "/mr/rep/performance" : "/mr/performance";
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    return (await api.get(`${endpoint}${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [endpoint, mode, country]);
  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;
  const summary = data.summary || {};
  const countries = data.countries || [];
  const mrRows = data.mr_rankings || data.top_global_representatives || [];
  const countryRows = data.country_rankings || [];

  return (
    <div className="space-y-6">
      {mode === "rep" && <IdentityHeader nameLabel={t("identity.participantName", "Participant name")} />}
      <div>
        <div>
          <h1 className="text-3xl font-black">{mode === "rep" ? t("navigation.myPerformance", "My Performance") : t("navigation.globalPerformance", "Global Performance")}</h1>
          <p className="mt-2 text-white/65">{t("performance.repPerformanceIntro", "Performance is based on Farmacist enrollments and participations under each HETERO Representative / Staff.")}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={mode === "rep" ? t("performance.myEnrollments", "My Enrollments") : t("performance.totalEnrollments", "Total Participant Enrollments")} value={summary.enrollments ?? summary.total_enrollments} icon={FaUsers} />
        <StatCard label={mode === "rep" ? t("performance.userParticipations", "User Participations") : t("performance.totalParticipations", "Total Participations")} value={summary.participations ?? summary.total_participations} icon={FaChartLine} />
        <StatCard label={mode === "rep" ? t("ranking.global", "Global Rank") : t("performance.heteroRepresentatives", "HETERO Representatives")} value={summary.global_rank ?? summary.total_mrs} icon={FaMedal} />
        <StatCard
          label={mode === "rep" ? t("ranking.country", "Country Rank") : t("performance.avgParticipationEnrollment", "Avg Participation / Enrollment")}
          value={mode === "rep" ? summary.country_rank : summary.avg_participations_per_enrollment}
          icon={FaGlobeAsia}
        />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <section className="glass min-w-0 overflow-hidden rounded-3xl p-4 md:p-6">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <h2 className="min-w-0 break-words text-xl font-black">{t("ranking.topGlobalHeteroStaff", "Top Global HETERO Representatives / Staff")}</h2>
            <div className="grid min-w-0 gap-2 sm:grid-cols-[190px_auto]">
              <select className="input" value={country} onChange={(event) => setCountry(event.target.value)}>
                <option className="bg-black" value="">{t("common.allCountries", "All countries")}</option>
                {countries.map((item) => <option className="bg-black" key={item} value={item}>{item}</option>)}
              </select>
              <button className="btn-ghost" onClick={refresh}>{t("common.refresh", "Refresh")}</button>
            </div>
          </div>
          <div className="scroll-panel max-h-[560px] min-w-0 overflow-y-auto overflow-x-hidden pr-1 md:pr-2">
            <MrRankingList rows={mrRows} scroll={false} />
          </div>
        </section>

        <section className="glass min-w-0 overflow-hidden rounded-3xl p-4 md:p-6">
          <h2 className="mb-4 text-xl font-black">{t("ranking.topCountries", "Top Countries")}</h2>
          <div className="scroll-panel max-h-[560px] min-w-0 space-y-3 overflow-y-auto overflow-x-hidden pr-1 md:pr-2">
            {countryRows.map((row) => (
              <div key={row.mobile_number || row.country} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 font-black text-gold">{row.rank}</div>
                  {row.country_flag_url && <img src={row.country_flag_url} alt={row.country} className="h-8 w-8 rounded-full object-cover" />}
                  <div className="min-w-0">
                    <div className="truncate text-lg font-black">{row.country}</div>
                    <div className="text-xs leading-5 text-white/50">
                      {t("ranking.enrolledFarmacists", `${row.farmacy_enrollments ?? row.enrollments ?? 0} enrolled farmacists`, { count: row.farmacy_enrollments ?? row.enrollments ?? 0 })},{" "}
                      {t("ranking.enrolledHeteroStaff", `${row.hetero_enrollments || 0} enrolled HETERO reps/staff`, { count: row.hetero_enrollments || 0 })},{" "}
                      {row.participations || 0} {t("ranking.participations", "participations")}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 pl-[52px] text-left sm:pl-0 sm:text-right">
                  <div className="text-xl font-black text-gold">{row.avg_participations ?? row.score}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">{t("ranking.avgParticipationsPerHeteroStaff", "avg participations / HETERO rep")}</div>
                </div>
              </div>
            ))}
            {countryRows.length === 0 && <div className="rounded-2xl bg-white/10 p-5 text-white/60">{t("ranking.noCountryData", "No country ranking data available yet.")}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
