import { useEffect, useState } from "react";
import LeaderboardList from "../components/LeaderboardList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function Leaderboard() {
  const [filters, setFilters] = useState({ country: "", city: "" });
  const [options, setOptions] = useState({ countries: [], cities: [] });
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.city) params.set("city", filters.city);
    return (await api.get(`/leaderboard${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [filters.country, filters.city]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    api
      .get(`/leaderboard/options${params.toString() ? `?${params.toString()}` : ""}`)
      .then(({ data }) => setOptions({ countries: data.countries || [], cities: data.cities || [] }))
      .catch(() => {});
  }, [filters.country]);

  const rows = data?.leaderboard || [];
  const countries = uniqueOptions([...(options.countries || []), ...(data?.countries || []), ...rows.map((row) => row.country)]);
  const cities = uniqueOptions([
    ...(options.cities || []),
    ...(data?.cities || []),
    ...rows
      .filter((row) => !filters.country || row.country === filters.country)
      .map((row) => row.city),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">Leaderboard</h1>
          <p className="text-white/60">Global, country, and city rankings for all pharmacists.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[180px_180px_auto]">
          <select
            className="input"
            value={filters.country}
            onChange={(event) => setFilters({ country: event.target.value, city: "" })}
          >
            <option className="bg-black" value="">All countries</option>
            {countries.map((country) => <option className="bg-black" key={country} value={country}>{country}</option>)}
          </select>
          <select
            className="input"
            value={filters.city}
            onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
            disabled={cities.length === 0}
          >
            <option className="bg-black" value="">All cities</option>
            {cities.map((city) => <option className="bg-black" key={city} value={city}>{city}</option>)}
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
