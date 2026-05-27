import { useEffect, useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function AdminUsers() {
  const [filters, setFilters] = useState({ q: "", country: "", city: "", mr_id: "" });
  const [options, setOptions] = useState({ countries: [], cities: [], mr_ids: [] });
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.country) params.set("country", filters.country);
    if (filters.city) params.set("city", filters.city);
    if (filters.mr_id) params.set("mr_id", filters.mr_id);
    return (await api.get(`/admin/users${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [filters.q, filters.country, filters.city, filters.mr_id]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.city) params.set("city", filters.city);
    api
      .get(`/admin/users/options${params.toString() ? `?${params.toString()}` : ""}`)
      .then(({ data }) => setOptions({
        countries: data.countries || [],
        cities: data.cities || [],
        mr_ids: data.mr_ids || [],
      }))
      .catch(() => {});
  }, [filters.country, filters.city]);
  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "country" ? { city: "", mr_id: "" } : {}),
      ...(key === "city" ? { mr_id: "" } : {}),
    }));
  };
  const clearFilters = () => {
    setFilters({ q: "", country: "", city: "", mr_id: "" });
  };
  const users = filterUsers(data?.users || [], filters);
  const countries = uniqueOptions([...(options.countries || []), ...(data?.countries || []), ...(data?.users || []).map((user) => user.country)]);
  const cities = uniqueOptions([...(options.cities || []), ...(data?.cities || []), ...(data?.users || []).map((user) => user.city)]);
  const mrIds = uniqueOptions([...(options.mr_ids || []), ...(data?.mr_ids || []), ...(data?.users || []).map((user) => user.mr_id)]);
  const exportCsv = async () => {
    const csv = toCsv(users);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "farmacy-users.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <h1 className="text-3xl font-black">User Management</h1>
        <div className="grid gap-2 lg:grid-cols-[220px_170px_170px_150px_auto_auto]">
          <input className="input" value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} placeholder="Search user, mobile, email" />
          <FilterSelect value={filters.country} onChange={(value) => updateFilter("country", value)} options={countries} label="All countries" />
          <FilterSelect value={filters.city} onChange={(value) => updateFilter("city", value)} options={cities} label="All cities" />
          <FilterSelect value={filters.mr_id} onChange={(value) => updateFilter("mr_id", value)} options={mrIds} label="All MRs" />
          <button className="btn-ghost" onClick={clearFilters}>Clear</button>
          <button className="btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      <div className="glass overflow-x-auto rounded-3xl p-4">
        {loading ? <LoadingSkeleton rows={7} /> : error ? <div>{error}</div> : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
                {users.length} users
              </span>
            </div>
            <div className="scroll-panel max-h-[680px] overflow-auto pr-2">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="sticky top-0 bg-zinc-950 text-white/55"><tr><th className="p-3">Name</th><th>Mobile</th><th>Email</th><th>Country</th><th>City</th><th>MR</th><th>Points</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="p-3 font-bold">{user.full_name}</td><td>{user.mobile_number}</td><td>{user.email}</td><td>{user.country}</td><td>{user.city || "-"}</td><td>{user.mr_id}</td><td className="font-black text-gold">{user.total_points}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr className="border-t border-white/10">
                      <td className="p-4 text-white/55" colSpan="7">No users match the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function filterUsers(users, filters) {
  const search = filters.q.trim().toLowerCase();
  return users.filter((user) => {
    const matchesSearch = !search || [
      user.full_name,
      user.mobile_number,
      user.email,
      user.country,
      user.city,
      user.mr_id,
    ].some((value) => String(value || "").toLowerCase().includes(search));
    return (
      matchesSearch &&
      (!filters.country || user.country === filters.country) &&
      (!filters.city || user.city === filters.city) &&
      (!filters.mr_id || user.mr_id === filters.mr_id)
    );
  });
}

function toCsv(users) {
  const header = ["id", "full_name", "mobile_number", "email", "country", "city", "mr_id", "total_points", "created_at"];
  const rows = users.map((user) => [
    user.id,
    user.full_name,
    user.mobile_number,
    user.email,
    user.country,
    user.city || "",
    user.mr_id || "",
    user.total_points,
    user.created_at,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option className="bg-black" value="">{label}</option>
      {options.map((option) => <option className="bg-black" key={option} value={option}>{option}</option>)}
    </select>
  );
}
