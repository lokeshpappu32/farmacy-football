import { useState } from "react";
import MrRankingList from "../components/MrRankingList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function MrStanding() {
  const [country, setCountry] = useState("");
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    return (await api.get(`/mr/standing${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [country]);

  const countries = data?.countries || [];
  const rows = data?.mr_rankings || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">My Standing</h1>
          <p className="mt-2 text-white/65">Individual MR / HETERO Staff rankings by pharmacist participations.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_auto]">
          <select className="input" value={country} onChange={(event) => setCountry(event.target.value)}>
            <option className="bg-black" value="">All countries</option>
            {countries.map((item) => <option className="bg-black" key={item} value={item}>{item}</option>)}
          </select>
          <button className="btn-ghost" onClick={refresh}>Refresh</button>
        </div>
      </div>

      <section className="glass rounded-3xl p-4 md:p-6">
        {loading ? <LoadingSkeleton rows={7} /> : error ? <div>{error}</div> : <MrRankingList rows={rows} showCountry={!country} />}
      </section>
    </div>
  );
}
