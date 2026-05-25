import { FaBullseye, FaCity, FaMapMarkedAlt, FaUsers } from "react-icons/fa";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatCard from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import api from "../services/api";

export default function AdminAnalytics() {
  const { data, loading, error } = useApi(async () => (await api.get("/admin/analytics")).data, []);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <div className="glass rounded-2xl p-6">{error}</div>;

  const countryRows = data.country_analytics || [];
  const cityRows = data.city_analytics || [];
  const topCountry = data.insights?.top_country;
  const topCity = data.insights?.top_city;
  const topActiveCity = [...cityRows].sort((a, b) => (b.participation_rate || 0) - (a.participation_rate || 0))[0];
  const topAccuracyCountry = [...countryRows].sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))[0];
  const maxCountryUsers = Math.max(...countryRows.map((item) => item.participants), 1);
  const maxCityUsers = Math.max(...cityRows.map((item) => item.participants), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Country & City Analytics</h1>
        <p className="mt-2 text-white/60">Geography-wise enrollment, participation, points, and prediction accuracy.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Participants" value={data.total_participants} icon={FaUsers} />
        <StatCard label="Active Rate" value={`${data.participation_rate || 0}%`} icon={FaBullseye} />
        <StatCard label="Top Country" value={topCountry?.country || "-"} icon={FaMapMarkedAlt} />
        <StatCard label="Top City" value={topCity?.city || "-"} icon={FaCity} />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Insight title="Highest Enrollment Country" value={topCountry?.country || "-"} detail={`${topCountry?.participants || 0} users, ${topCountry?.points || 0} pts`} />
        <Insight title="Highest Enrollment City" value={topCity?.city || "-"} detail={`${topCity?.participants || 0} users, ${topCity?.participation_rate || 0}% active`} />
        <Insight title="Most Active City" value={topActiveCity?.city || "-"} detail={`${topActiveCity?.participation_rate || 0}% active, ${topActiveCity?.participants || 0} users`} />
        <Insight title="Best Accuracy Country" value={topAccuracyCountry?.country || "-"} detail={`${topAccuracyCountry?.accuracy || 0}% accuracy, ${topAccuracyCountry?.correct || 0} correct`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GeoPanel title="Country Performance" rows={countryRows} labelKey="country" maxUsers={maxCountryUsers} />
        <GeoPanel title="City Performance" rows={cityRows} labelKey="city" maxUsers={maxCityUsers} />
      </div>
    </div>
  );
}

function Insight({ title, value, detail }) {
  return (
    <section className="glass rounded-3xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-white/45">{title}</p>
      <div className="mt-2 text-2xl font-black text-gold">{value}</div>
      <div className="mt-1 text-sm text-white/55">{detail}</div>
    </section>
  );
}

function GeoPanel({ title, rows, labelKey, maxUsers }) {
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <div className="scroll-panel max-h-[560px] space-y-4 overflow-y-auto pr-2">
        {rows.map((item) => (
          <div key={item[labelKey]} className="rounded-2xl bg-white/10 p-4">
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span className="font-black text-gold">{item[labelKey]}</span>
              <span className="text-white/65">{item.participants} users</span>
            </div>
            <div className="h-3 rounded-full bg-black/35">
              <div className="h-full rounded-full bg-gradient-to-r from-gold to-ember" style={{ width: `${(item.participants / maxUsers) * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55 md:grid-cols-4">
              <span>{item.points} pts</span>
              <span>{item.avg_points} avg pts</span>
              <span>{item.participation_rate}% active</span>
              <span>{item.accuracy}% accuracy</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/40">
              <span>{item.correct} correct</span>
              <span>{item.wrong} no bonus</span>
              <span>{item.pending} pending</span>
            </div>
          </div>
        ))}
        {!rows.length && <div className="rounded-2xl bg-white/10 p-5 text-white/60">No geography analytics available yet.</div>}
      </div>
    </section>
  );
}
