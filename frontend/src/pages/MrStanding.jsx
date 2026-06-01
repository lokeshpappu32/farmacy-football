import { useState } from "react";
import IdentityHeader from "../components/IdentityHeader";
import MrRankingList from "../components/MrRankingList";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function MrStanding({
  mode = "admin",
  title,
  subtitle = "Ranking based on self participation points earned by HETERO Representatives / Staff.",
  showIdentity,
}) {
  const [country, setCountry] = useState("");
  const endpoint = mode === "rep" ? "/mr/rep/standing" : "/mr/standing";
  const { data, loading, error, refresh } = useApi(async () => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    return (await api.get(`${endpoint}${params.toString() ? `?${params.toString()}` : ""}`)).data;
  }, [country, endpoint]);

  const countries = data?.countries || [];
  const rows = data?.mr_rankings || [];

  return (
    <div className="space-y-6">
      {(showIdentity ?? mode === "rep") && <IdentityHeader nameLabel="Participant name" />}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">{title || (mode === "rep" ? "My Standing" : "HETERO Staff Standing")}</h1>
          <p className="mt-2 text-white/65">{subtitle}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_auto]">
          <select className="input" value={country} onChange={(event) => setCountry(event.target.value)}>
            <option className="bg-black" value="">All countries</option>
            {countries.map((item) => <option className="bg-black" key={item} value={item}>{item}</option>)}
          </select>
          <button className="btn-ghost" onClick={refresh}>Refresh</button>
        </div>
      </div>

      <section className="glass scroll-panel max-h-[620px] overflow-y-auto rounded-3xl p-4 md:p-6">
        {loading ? <LoadingSkeleton rows={7} /> : error ? <div>{error}</div> : <MrRankingList rows={rows} showCountry={!country} />}
      </section>
    </div>
  );
}
