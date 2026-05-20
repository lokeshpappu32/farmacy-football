import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { countries, defaultCountry } from "../utils/countries";

export default function Enroll() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    full_name: "",
    country_code: defaultCountry.country_code,
    mobile_number: "",
    email: "",
    country: defaultCountry.name,
    mr_id: params.get("mr_id") || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { enroll } = useAuth();
  const navigate = useNavigate();

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateCountry = (region) => {
    const selected = countries.find((country) => country.region === region) || defaultCountry;
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
          <label className="text-sm font-bold">Country<select required className="input mt-2" value={countries.find((country) => country.name === form.country)?.region || defaultCountry.region} onChange={(e) => updateCountry(e.target.value)}>{countries.map((country) => <option className="bg-black" key={country.region} value={country.region}>{country.label}</option>)}</select></label>
          <label className="text-sm font-bold">
            Mobile number
            <input required className="input mt-2" value={form.mobile_number} onChange={(e) => update("mobile_number", e.target.value)} placeholder="9876543210" />
            <span className="mt-1 block text-xs font-medium text-white/45">Dial code {form.country_code} will be added from selected country.</span>
          </label>
          <label className="text-sm font-bold">Email<input required type="email" className="input mt-2" value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          <label className="text-sm font-bold md:col-span-2">MR ID<input required className="input mt-2" value={form.mr_id} onChange={(e) => update("mr_id", e.target.value)} placeholder="Auto-filled from QR code when available" /></label>
        </div>
        <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Creating profile..." : "Enroll and get 100 points"}</button>
      </form>
    </div>
  );
}
