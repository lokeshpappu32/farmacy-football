import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];
const fallbackCountry = fallbackCountries[0];

export default function Enroll() {
  const [params] = useSearchParams();
  const [countries, setCountries] = useState(fallbackCountries);
  const [form, setForm] = useState({
    full_name: "",
    country_code: fallbackCountry.country_code,
    mobile_number: "",
    email: "",
    country: fallbackCountry.name,
    city: "",
    mr_id: params.get("mr_id") || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { enroll } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/countries")
      .then(({ data }) => {
        if (!data.countries?.length) return;
        setCountries(data.countries);
        const india = data.countries.find((country) => country.iso_code === "IN") || data.countries[0];
        setForm((current) => ({
          ...current,
          country: current.country || india.name,
          country_code: current.country_code || india.country_code,
        }));
      })
      .catch(() => {});
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateCountry = (isoCode) => {
    const selected = countries.find((country) => country.iso_code === isoCode) || fallbackCountry;
    setForm((current) => ({ ...current, country: selected.name, country_code: selected.country_code }));
  };
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await enroll(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stadium field-lines px-4 py-8">
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <form onSubmit={submit} className="glass mx-auto max-w-2xl rounded-3xl p-6">
        <h1 className="text-3xl font-black">Enroll for Farmacy Football</h1>
        <p className="mt-2 text-white/65">Registration grants 100 points instantly.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">Full name<input required className="input mt-2" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} /></label>
          <label className="text-sm font-bold">Email<input required type="email" className="input mt-2" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@example.com" /></label>
          <label className="text-sm font-bold">Country<select required className="input mt-2" value={countries.find((country) => country.name === form.country)?.iso_code || fallbackCountry.iso_code} onChange={(e) => updateCountry(e.target.value)}>{countries.map((country) => <option className="bg-black" key={country.iso_code} value={country.iso_code}>{country.label}</option>)}</select></label>
          <label className="text-sm font-bold">City<input required className="input mt-2" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Enter city" /></label>
          <label className="text-sm font-bold">
            Mobile number
            <input required className="input mt-2" value={form.mobile_number} onChange={(e) => update("mobile_number", e.target.value)} placeholder="9876543210" />
            <span className="mt-1 block text-xs font-medium text-white/45">Dial code {form.country_code} will be added from selected country.</span>
          </label>
          <label className="text-sm font-bold">MR ID<input required className="input mt-2" value={form.mr_id} onChange={(e) => update("mr_id", e.target.value)} placeholder="Enter MR ID" /></label>
        </div>
        <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Creating profile..." : "Enroll and get 100 points"}</button>
      </form>
    </div>
  );
}
