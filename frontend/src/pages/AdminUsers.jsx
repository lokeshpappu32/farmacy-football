import { useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const { data, loading, error, refresh } = useApi(async () => (await api.get(`/admin/users${q ? `?q=${q}` : ""}`)).data, [q]);
  const exportCsv = async () => {
    const response = await api.get("/admin/export/users.csv", { responseType: "blob" });
    const url = window.URL.createObjectURL(response.data);
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
        <div className="flex gap-2">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, country, MR" />
          <button className="btn-ghost" onClick={refresh}>Search</button>
          <button className="btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      <div className="glass overflow-x-auto rounded-3xl p-4">
        {loading ? <LoadingSkeleton rows={7} /> : error ? <div>{error}</div> : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-white/55"><tr><th className="p-3">Name</th><th>Mobile</th><th>Email</th><th>Country</th><th>MR</th><th>Points</th></tr></thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-t border-white/10">
                  <td className="p-3 font-bold">{user.full_name}</td><td>{user.mobile_number}</td><td>{user.email}</td><td>{user.country}</td><td>{user.mr_id}</td><td className="font-black text-gold">{user.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
