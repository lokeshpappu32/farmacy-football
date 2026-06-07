import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppFooter from "../components/AppFooter";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { homeForRole } from "../utils/auth";
import { rememberSelectedCountry } from "../utils/language";
import { localizeMessage } from "../utils/messages";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];

export default function UserLogin() {
  const { t } = useLanguage();
  const [countries, setCountries] = useState(fallbackCountries);
  const [countryName, setCountryName] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
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
    if (selected) rememberSelectedCountry(selected.name);
  };
  const selectCountry = (country) => {
    setCountryName(country.label || `${country.name} (${country.country_code})`);
    setForm((current) => ({ ...current, country_code: country.country_code }));
    rememberSelectedCountry(country.name);
    setShowCountryList(false);
  };

  const filteredCountries = countries.filter((country) => {
    const search = countryName.trim().toLowerCase();
    if (!search) return true;
    return (
      country.name.toLowerCase().includes(search) ||
      String(country.country_code || "").toLowerCase().includes(search) ||
      String(country.label || "").toLowerCase().includes(search)
    );
  });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!form.country_code) throw new Error("Please select a country from the list.");
      const data = await userLogin(form);
      navigate(homeForRole(data.role), { replace: true });
    } catch (err) {
      setError(localizeMessage(err.message, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <form onSubmit={submit} noValidate className="glass w-full max-w-md rounded-[28px] p-5 text-center sm:rounded-[32px] sm:p-8">
          <FootballLogo compact className="mx-auto mb-8" />
          <h1 className="text-3xl font-black">{t("login.participantTitle", "Participant Login")}</h1>
          <p className="mt-2 text-sm text-white/65">{t("login.participantCopy", "Use this only if your enrolled device is not available.")}</p>

          <label className="mt-8 block text-left text-sm font-bold">{t("enroll.countryCode", "Country code")}</label>
          <div className="relative mt-2 min-w-0 text-left">
            <div className="flex overflow-hidden rounded-xl border border-white/15 bg-black/45 focus-within:border-gold/70 focus-within:shadow-[0_0_0_3px_rgba(248,201,69,.14)]">
              <span className="flex w-[70px] shrink-0 items-center justify-center border-r border-white/10 px-2 text-sm font-black text-gold sm:w-[76px] sm:px-3">
                {form.country_code || t("enroll.countryCode", "Code")}
              </span>
              <input
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/45"
                value={countryName}
                onChange={(event) => {
                  updateCountry(event.target.value);
                  setShowCountryList(true);
                }}
                onFocus={() => setShowCountryList(true)}
                onBlur={() => window.setTimeout(() => setShowCountryList(false), 140)}
                placeholder={t("enroll.countrySearch", "Search country or code")}
                autoComplete="off"
              />
            </div>
            {showCountryList && (
              <div className="scroll-panel absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-gold/25 bg-[#0b0d10] p-2 shadow-[0_18px_40px_rgba(0,0,0,.45)]">
                {filteredCountries.length ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.iso_code}
                      type="button"
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-gold/15"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectCountry(country);
                      }}
                    >
                      <span className="min-w-0 break-words leading-snug">{country.name}</span>
                      <span className="shrink-0 text-gold">{country.country_code}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm font-semibold text-white/55">{t("common.noCountriesFound", "No countries found")}</div>
                )}
              </div>
            )}
            </div>

          <label className="mt-5 block text-left text-sm font-bold">{t("common.mobileNumber", "Registered mobile number")}</label>
          <input
            className="input mt-2"
            value={form.mobile_number}
            onChange={(event) => setForm((current) => ({ ...current, mobile_number: event.target.value.replace(/\D/g, "") }))}
            inputMode="numeric"
            pattern="[0-9]{7,15}"
            placeholder={t("common.mobileNumber", "Enter mobile number")}
          />
          <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? t("login.checking", "Checking...") : t("common.login", "Login")}</button>
        </form>
      </div>
      <AppFooter />
    </div>
  );
}
