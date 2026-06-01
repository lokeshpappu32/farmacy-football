import { useEffect, useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

const defaultParticipantTypes = [
  { value: "farmacy_owner", label: "Farmacy Owner" },
  { value: "farmacy_head_supervisor", label: "Farmacy Head / Supervisor" },
  { value: "farmacy_sales_staff", label: "Farmacy Sales Staff" },
  { value: "hetero_representative_staff", label: "HETERO Representative / Staff" },
];

export default function AdminUsers() {
  const [filters, setFilters] = useState({ q: "", country: "", participant_type: "" });
  const [options, setOptions] = useState({ countries: [], participant_types: [] });
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.country) params.set("country", filters.country);
    if (filters.participant_type) params.set("participant_type", filters.participant_type);
    return (await api.get(`/admin/users${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [filters.q, filters.country, filters.participant_type]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    api
      .get(`/admin/users/options${params.toString() ? `?${params.toString()}` : ""}`)
      .then(({ data }) => setOptions({
        countries: data.countries || [],
        participant_types: data.participant_types || [],
      }))
      .catch(() => {});
  }, [filters.country]);
  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const clearFilters = () => {
    setFilters({ q: "", country: "", participant_type: "" });
  };
  const users = filterUsers(data?.users || [], filters);
  const countries = uniqueOptions([...(options.countries || []), ...(data?.countries || []), ...(data?.users || []).map((user) => user.country)]);
  const participantTypes = options.participant_types?.length ? options.participant_types : defaultParticipantTypes;
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
        <div className="grid gap-2 lg:grid-cols-[240px_180px_250px_auto_auto]">
          <input className="input" value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} placeholder="Search user, mobile, email" />
          <FilterSelect value={filters.country} onChange={(value) => updateFilter("country", value)} options={countries} label="All countries" />
          <ParticipantTypeSelect value={filters.participant_type} onChange={(value) => updateFilter("participant_type", value)} options={participantTypes} />
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
                <thead className="sticky top-0 bg-zinc-950 text-white/55"><tr><th className="p-3">Name</th><th>Mobile</th><th>Email</th><th>Country</th><th>HETERO Rep / Staff</th><th>Participant Type</th><th>Points</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="p-3 font-bold">{user.full_name}</td><td>{user.mobile_number}</td><td>{user.email}</td><td>{user.country}</td><td>{user.medical_rep_name || "-"}</td><td>{typeLabel(user.participant_type)}</td><td className="font-black text-gold">{user.total_points}</td>
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

function typeLabel(value) {
  const option = defaultParticipantTypes.find((item) => {
    if (item.value === "farmacy_head_supervisor") return ["farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor"].includes(value);
    if (item.value === "hetero_representative_staff") return ["hetero_representative_staff", "hetero_staff", "hetero_representative", "medical_rep"].includes(value);
    return item.value === value;
  });
  return option?.label || "Farmacist";
}

function filterUsers(users, filters) {
  const search = filters.q.trim().toLowerCase();
  return users.filter((user) => {
    const matchesSearch = !search || [
      user.full_name,
      user.mobile_number,
      user.email,
      user.country,
      user.medical_rep_name,
      user.medical_rep_mobile_number,
    ].some((value) => String(value || "").toLowerCase().includes(search));
    return (
      matchesSearch &&
      (!filters.country || user.country === filters.country) &&
      (!filters.participant_type || typeMatches(user.participant_type, filters.participant_type))
    );
  });
}

function typeMatches(actual, selected) {
  if (selected === "farmacy_head_supervisor") return ["farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor"].includes(actual);
  if (selected === "hetero_representative_staff") return ["hetero_representative_staff", "hetero_staff", "hetero_representative", "medical_rep"].includes(actual);
  return actual === selected;
}

function toCsv(users) {
  const header = ["id", "full_name", "participant_type", "mobile_number", "email", "country", "hetero_rep_name", "hetero_rep_mobile", "total_points", "created_at"];
  const rows = users.map((user) => [
    user.id,
    user.full_name,
    typeLabel(user.participant_type),
    user.mobile_number,
    user.email,
    user.country,
    user.medical_rep_name || "",
    user.medical_rep_mobile_number || "",
    user.total_points,
    user.created_at,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function FilterSelect({ value, onChange, options, label, labels = {} }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option className="bg-black" value="">{label}</option>
      {options.map((option) => <option className="bg-black" key={option} value={option}>{labels[option] || option}</option>)}
    </select>
  );
}

function ParticipantTypeSelect({ value, onChange, options }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option className="bg-black" value="">All participant types</option>
      {options.map((option) => (
        <option className="bg-black" key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
