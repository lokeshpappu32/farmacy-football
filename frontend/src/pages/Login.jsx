import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { homeForRole } from "../utils/auth";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];
const fallbackCountry = fallbackCountries[0];

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [countries, setCountries] = useState(fallbackCountries);
  const [country, setCountry] = useState(fallbackCountry);
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthed, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed) navigate(homeForRole(role), { replace: true });
  }, [isAuthed, role, navigate]);

  useEffect(() => {
    api.get("/countries")
      .then(({ data }) => {
        if (!data.countries?.length) return;
        setCountries(data.countries);
        setCountry(data.countries.find((item) => item.iso_code === "IN") || data.countries[0]);
      })
      .catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!adminCode.trim() && !mobile.trim()) {
        throw new Error("Enter mobile number or use Admin/MR code.");
      }
      const payload = adminCode.trim()
        ? { admin_code: adminCode.trim() }
        : { country_code: country.country_code, mobile_number: mobile };
      const data = await login(payload);
      navigate(homeForRole(data.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stadium field-lines px-4">
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <form onSubmit={submit} noValidate className="glass w-full max-w-md rounded-3xl p-6">
        <h1 className="text-3xl font-black">Enter the arena</h1>
        <p className="mt-2 text-sm text-white/65">Participants select country code and enter mobile number. Admins and MRs can use their secure code below.</p>
        <label className="mt-6 block text-sm font-bold">Mobile number</label>
        <div className="mt-2 flex overflow-hidden rounded-xl border border-white/14 bg-black/40 focus-within:border-gold/75 focus-within:ring-4 focus-within:ring-gold/10">
          <select
            className="w-32 shrink-0 bg-black/70 px-3 text-sm font-bold text-gold outline-none"
            value={country.iso_code}
            onChange={(e) => setCountry(countries.find((item) => item.iso_code === e.target.value) || fallbackCountry)}
            aria-label="Country code"
          >
            {countries.map((item) => <option className="bg-black" key={item.iso_code} value={item.iso_code}>{item.country_code} {item.name}</option>)}
          </select>
          <input
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="9876543210"
          />
        </div>
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-white/45"><span className="h-px flex-1 bg-white/10" /> Admin / MR <span className="h-px flex-1 bg-white/10" /></div>
        <label className="block text-sm font-bold">Admin code or MR ID</label>
        <input className="input mt-2" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} placeholder="HETERO-ADMIN-2026 or MR123" />
        <button className="btn-primary mt-5 w-full" disabled={loading}>{loading ? "Checking..." : "Login"}</button>
        <p className="mt-5 text-center text-sm text-white/60">
          Not enrolled? <Link to="/enroll" className="font-bold text-gold">Create profile</Link>
        </p>
      </form>
    </div>
  );
}
