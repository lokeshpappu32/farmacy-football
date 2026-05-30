import { useEffect, useState } from "react";
import LeaderboardList from "../components/LeaderboardList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function Leaderboard() {
  const [filters, setFilters] = useState({ country: "", medical_rep_name: "" });
  const [options, setOptions] = useState({ countries: [], medical_rep_names: [] });
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.medical_rep_name) params.set("medical_rep_name", filters.medical_rep_name);
    return (await api.get(`/leaderboard${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [filters.country, filters.medical_rep_name]);

  useEffect(() => {
    api
      .get("/leaderboard/options")
      .then(({ data }) => setOptions({ countries: data.countries || [], medical_rep_names: data.medical_rep_names || [] }))
      .catch(() => {});
  }, []);

  const rows = data?.leaderboard || [];
  const countries = uniqueOptions([...(options.countries || []), ...(data?.countries || []), ...rows.map((row) => row.country)]);
  const medicalRepNames = uniqueOptions([...(options.medical_rep_names || []), ...(data?.medical_rep_names || []), ...rows.map((row) => row.medical_rep_name)]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">Leaderboard</h1>
          <p className="text-white/80">Global, country, and HETERO Rep wise rankings.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[180px_180px_auto]">
          <select
            className="input"
            value={filters.country}
            onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))}
          >
            <option className="bg-black" value="">All countries</option>
            {countries.map((country) => <option className="bg-black" key={country} value={country}>{country}</option>)}
          </select>
          <select
            className="input"
            value={filters.medical_rep_name}
            onChange={(event) => setFilters((current) => ({ ...current, medical_rep_name: event.target.value }))}
          >
            <option className="bg-black" value="">HETERO Rep</option>
            {medicalRepNames.map((name) => <option className="bg-black" key={name} value={name}>{name}</option>)}
          </select>
          <button className="btn-ghost" onClick={refresh}>Refresh</button>
        </div>
      </div>
      <div className="glass rounded-3xl p-4 md:p-6">
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
