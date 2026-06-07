import { useEffect, useState } from "react";
import LeaderboardList from "../components/LeaderboardList";
import IdentityHeader from "../components/IdentityHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";

export default function Leaderboard({
  title = "My Standing",
  subtitle = "Farmacist standings by country and HETERO representative.",
  identityLabel = "Name of the Farmacist",
  showIdentity = true,
}) {
  const { participant } = useAuth();
  const { t } = useLanguage();
  const [filters, setFilters] = useState({ country: "", medical_rep_mobile_number: "" });
  const [options, setOptions] = useState({ countries: [], medical_reps: [] });
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.medical_rep_mobile_number) params.set("medical_rep_mobile_number", filters.medical_rep_mobile_number);
    return (await api.get(`/leaderboard${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [filters.country, filters.medical_rep_mobile_number]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    api
      .get(`/leaderboard/options${params.toString() ? `?${params.toString()}` : ""}`)
      .then(({ data }) => setOptions({ countries: data.countries || [], medical_reps: data.medical_reps || [] }))
      .catch(() => {});
  }, [filters.country]);

  const rows = data?.leaderboard || [];
  const ownStanding = rows.find((row) => row.id === participant?.id);
  const countries = uniqueOptions([...(options.countries || []), ...(data?.countries || []), ...rows.map((row) => row.country)]);
  const medicalReps = uniqueRepOptions([...(options.medical_reps || []), ...(data?.medical_reps || [])]);
  return (
    <div className="space-y-6">
      {showIdentity && <IdentityHeader nameLabel={identityLabel === "Name of the Farmacist" ? t("identity.nameFarmacist", identityLabel) : identityLabel} rank={ownStanding?.rank} points={ownStanding?.total_points} />}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">{title.includes("Farmacist Standing") ? t("ranking.titleFarmacist", title) : title}</h1>
          <p className="text-white/80">{subtitle.includes("Global Farmacist") ? t("ranking.farmacistGlobalByCountry", subtitle) : subtitle}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[180px_180px_auto]">
          <select
            className="input"
            value={filters.country}
            onChange={(event) => setFilters({ country: event.target.value, medical_rep_mobile_number: "" })}
          >
            <option className="bg-black" value="">{t("common.allCountries", "All countries")}</option>
            {countries.map((country) => <option className="bg-black" key={country} value={country}>{country}</option>)}
          </select>
          <select
            className="input"
            value={filters.medical_rep_mobile_number}
            onChange={(event) => setFilters((current) => ({ ...current, medical_rep_mobile_number: event.target.value }))}
          >
            <option className="bg-black" value="">HETERO Rep</option>
            {medicalReps.map((rep) => (
              <option className="bg-black" key={`${rep.mobile_number}-${rep.country}`} value={rep.mobile_number}>
                {rep.name} - {rep.country || t("ranking.countryNotSet", "Country not set")}
              </option>
            ))}
          </select>
          <button className="btn-ghost" onClick={refresh}>{t("common.refresh", "Refresh")}</button>
        </div>
      </div>
      <div className="glass scroll-panel max-h-[620px] overflow-y-auto rounded-3xl p-4 md:p-6">
        {loading ? <LoadingSkeleton rows={6} /> : error ? <div>{error}</div> : <LeaderboardList rows={rows} />}
      </div>
    </div>
  );
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function uniqueRepOptions(values) {
  const byMobile = new Map();
  values.filter(Boolean).forEach((rep) => {
    if (rep.mobile_number && !byMobile.has(rep.mobile_number)) byMobile.set(rep.mobile_number, rep);
  });
  return [...byMobile.values()].sort((a, b) => `${a.name} ${a.country}`.localeCompare(`${b.name} ${b.country}`));
}
