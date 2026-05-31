import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { homeForRole } from "../utils/auth";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];

export default function UserLogin() {
  const [countries, setCountries] = useState(fallbackCountries);
  const [countryName, setCountryName] = useState("");
  const [form, setForm] = useState({ country_code: "", mobile_number: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { userLogin, isAuthed, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed) navigate(homeForRole(role), { replace: true });
  }, [isAuthed, role, navigate]);

  useEffect(() => {
    api.get("/countries")
      .then(({ data }) => {
        if (data.countries?.length) setCountries(data.countries);
      })
      .catch(() => {});
  }, []);

  const updateCountry = (value) => {
    setCountryName(value);
    const selected = countries.find((country) => {
      const search = value.trim().toLowerCase();
      return country.name.toLowerCase() === search || String(country.label || "").toLowerCase() === search;
    });
    setForm((current) => ({ ...current, country_code: selected ? selected.country_code : "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!form.country_code) throw new Error("Please select a country from the list.");
      const data = await userLogin(form);
      navigate(homeForRole(data.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 text-white"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <form onSubmit={submit} noValidate className="glass relative z-10 w-full max-w-md rounded-[32px] p-8 text-center">
        <FootballLogo compact className="mx-auto mb-8" />
        <h1 className="text-3xl font-black">Participant Login</h1>
        <p className="mt-2 text-sm text-white/65">Use this only if your enrolled device is not available.</p>

        <label className="mt-8 block text-left text-sm font-bold">Country</label>
        <input
          className="input mt-2"
          list="user-login-country-options"
          value={countryName}
          onChange={(event) => updateCountry(event.target.value)}
          placeholder="Select Country"
        />
        <datalist id="user-login-country-options">
          {countries.map((country) => <option key={country.iso_code} value={country.label || `${country.name} (${country.country_code})`} />)}
        </datalist>

        <label className="mt-5 block text-left text-sm font-bold">Registered mobile number</label>
        <input
          className="input mt-2"
          value={form.mobile_number}
          onChange={(event) => setForm((current) => ({ ...current, mobile_number: event.target.value.replace(/\D/g, "") }))}
          inputMode="numeric"
          pattern="[0-9]{7,15}"
          placeholder="Enter mobile number"
        />
        <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Checking..." : "Login"}</button>
      </form>
    </div>
  );
}
