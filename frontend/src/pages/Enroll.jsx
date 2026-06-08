import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppFooter from "../components/AppFooter";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { homeForRole } from "../utils/auth";
import { rememberSelectedCountry } from "../utils/language";
import { ENGLISH_TERMS } from "../utils/terms";
import { localizeMessage } from "../utils/messages";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];
const mrEnrollmentMessage = "Kindly ask your Hetero Representative to enroll first using his/her mobile number.";
const participantLabels = {
  farmacy_owner: ["participant.farmacyOwner", "Farmacy Owner"],
  farmacy_head_supervisor: ["participant.farmacyHeadSupervisor", "Farmacy Head / Supervisor"],
  farmacy_head: ["participant.farmacyHead", "Farmacy Head"],
  farmacy_supervisor: ["participant.farmacyHeadSupervisor", "Farmacy Supervisor"],
  farmacy_sales_staff: ["participant.farmacySalesStaff", "Farmacy Sales Staff"],
  hetero_representative_staff: ["participant.heteroRepresentativeStaff", "HETERO Representative / Staff"],
  hetero_staff: ["participant.heteroStaff", "HETERO Staff"],
  hetero_representative: ["participant.heteroRepresentative", "HETERO Representative"],
};
const participantTypes = new Set(Object.keys(participantLabels));
const participantAliases = {
  farmacist: "farmacy_owner",
  pharmacy_head: "farmacy_head_supervisor",
  farmacy_head: "farmacy_head_supervisor",
  pharmacy_supervisor: "farmacy_head_supervisor",
  farmacy_supervisor: "farmacy_head_supervisor",
  medical_rep: "hetero_representative_staff",
  hetero_rep: "hetero_representative_staff",
  representative: "hetero_representative_staff",
  staff: "hetero_representative_staff",
  hetero_staff: "hetero_representative_staff",
  hetero_representative: "hetero_representative_staff",
  rep: "hetero_representative_staff",
  mr: "hetero_representative_staff",
};
const pharmacyTypes = new Set(["farmacy_owner", "farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor", "farmacy_sales_staff"]);
const heteroTypes = new Set(["hetero_representative_staff", "hetero_staff", "hetero_representative"]);
const termsText = ENGLISH_TERMS;
export default function Enroll() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const requestedType = (params.get("participant_type") || "").toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const normalizedRequestedType = participantAliases[requestedType] || requestedType;
  const initialType = participantTypes.has(normalizedRequestedType) ? normalizedRequestedType : "farmacy_owner";
  const [countries, setCountries] = useState(fallbackCountries);
  const [countryQuery, setCountryQuery] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const [form, setForm] = useState({
    participant_type: initialType,
    full_name: "",
    pharmacy_name: "",
    country_code: "",
    mobile_number: "",
    country: "",
    medical_rep_name: "",
    medical_rep_country_code: "",
    medical_rep_mobile_number: "",
    accepted_terms: false,
  });
  const [error, setError] = useState("");
  const [repEnrollmentPopup, setRepEnrollmentPopup] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [mobileConfirm, setMobileConfirm] = useState(null);
  const [confirmedMobiles, setConfirmedMobiles] = useState({});
  const [loading, setLoading] = useState(false);
  const { enroll, isAuthed, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed) navigate(homeForRole(role), { replace: true });
  }, [isAuthed, role, navigate]);

  useEffect(() => {
    api.get("/countries")
      .then(({ data }) => {
        if (!data.countries?.length) return;
        setCountries(data.countries);
      })
      .catch(() => {});
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const confirmMobileIfReady = (field, label) => {
    const value = String(form[field] || "").trim();
    if (!/^[0-9]{7,15}$/.test(value)) return;
    if (confirmedMobiles[field] === value) return;
    const prefix = field === "mobile_number" ? form.country_code : form.medical_rep_country_code;
    setMobileConfirm({ field, label, value, prefix });
  };
  const acceptMobileConfirm = () => {
    if (!mobileConfirm) return;
    setConfirmedMobiles((current) => ({ ...current, [mobileConfirm.field]: mobileConfirm.value }));
    setMobileConfirm(null);
  };
  const editMobileConfirm = () => {
    const field = mobileConfirm?.field;
    setMobileConfirm(null);
    if (!field) return;
    window.setTimeout(() => document.querySelector(`[name="${field}"]`)?.focus(), 50);
  };
  const updateCountry = (value) => {
    setCountryQuery(value);
    const selected = countries.find((country) => {
      const search = value.trim().toLowerCase();
      return country.name.toLowerCase() === search || String(country.label || "").toLowerCase() === search;
    });
    setForm((current) => ({
      ...current,
      country: selected ? selected.name : "",
      country_code: selected ? selected.country_code : "",
      medical_rep_country_code: selected ? selected.country_code : "",
    }));
    if (selected) rememberSelectedCountry(selected.name);
  };
  const selectCountry = (country) => {
    setCountryQuery(country.label || `${country.name} (${country.country_code})`);
    setForm((current) => ({
      ...current,
      country: country.name,
      country_code: country.country_code,
      medical_rep_country_code: country.country_code,
    }));
    rememberSelectedCountry(country.name);
    setShowCountryList(false);
  };

  const filteredCountries = countries.filter((country) => {
    const search = countryQuery.trim().toLowerCase();
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
    setRepEnrollmentPopup("");
    try {
      if (!form.accepted_terms) throw new Error("Please accept the terms and conditions.");
      if (!form.country || !form.country_code) throw new Error("Please select a country from the list.");
      const payload = heteroTypes.has(form.participant_type)
        ? {
            ...form,
            medical_rep_name: form.full_name,
            medical_rep_country_code: form.country_code,
            medical_rep_mobile_number: form.mobile_number,
          }
        : form;
      const data = await enroll(payload);
      navigate(homeForRole(data.role), { replace: true });
    } catch (err) {
      if (err.message === mrEnrollmentMessage) {
        setRepEnrollmentPopup(localizeMessage(err.message, t));
      } else {
        setError(localizeMessage(err.message, t));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-cover bg-center px-3 pt-6 text-white sm:px-4 sm:pt-8"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_14%,rgba(0,0,0,0.22)_100%)]" />
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <Toast message={repEnrollmentPopup} tone="error" onClose={() => setRepEnrollmentPopup("")} />

      <img src="/hetero-logo.png" alt="Hetero" className="absolute right-3 top-4 z-10 h-16 w-24 object-contain mix-blend-screen sm:right-[7%] sm:top-8 sm:h-24 sm:w-32" />

      <form onSubmit={submit} className="enroll-card relative z-10 mx-auto mt-24 min-w-0 rounded-[30px] border border-white/12 bg-green-950/42 px-3 pb-8 pt-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-[1px] sm:mt-16 sm:px-7 md:px-12">
        <FootballLogo compact={false} className="mx-auto mb-10 max-w-[260px] sm:mb-16 sm:max-w-[420px]" />

        <div className={`grid min-w-0 gap-x-10 gap-y-6 ${heteroTypes.has(form.participant_type) ? "mx-auto w-full max-w-md md:grid-cols-1" : "w-full md:grid-cols-2"}`}>
          <Field label={t("enroll.nameOf", `Name of ${participantLabel(t, form.participant_type)}`, { type: participantLabel(t, form.participant_type) })}>
            <input className="enroll-input" required value={form.full_name} onChange={(event) => update("full_name", event.target.value)} />
          </Field>
          {pharmacyTypes.has(form.participant_type) && (
            <Field label={t("enroll.pharmacyName", "Name of Farmacy")}>
              <input className="enroll-input" required value={form.pharmacy_name} onChange={(event) => update("pharmacy_name", event.target.value)} />
            </Field>
          )}
          <Field label={t("common.country", "Country")}>
            <div className="relative min-w-0">
              <div className="flex h-[42px] w-full min-w-0 overflow-hidden rounded-[10px] border border-white/25 bg-[rgba(239,244,236,.9)] focus-within:border-white/85 focus-within:shadow-[0_0_0_4px_rgba(255,255,255,.12)]">
                <span className="flex w-[70px] shrink-0 items-center justify-center border-r border-black/10 px-2 text-sm font-black text-red-700 sm:w-[76px]">
                  {form.country_code || t("enroll.countryCode", "Code")}
                </span>
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[#050608] outline-none placeholder:text-black/45"
                  required
                  placeholder={t("enroll.countrySearch", "Search country or code")}
                  value={countryQuery}
                  onChange={(event) => {
                    updateCountry(event.target.value);
                    setShowCountryList(true);
                  }}
                  onFocus={() => setShowCountryList(true)}
                  onBlur={() => window.setTimeout(() => setShowCountryList(false), 140)}
                  autoComplete="off"
                />
              </div>
              {showCountryList && (
                <div className="scroll-panel absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-gold/25 bg-[#0b0d10] p-2 shadow-[0_18px_40px_rgba(0,0,0,.45)]">
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
          </Field>
          <Field label={t("common.mobileNumber", "Mobile Number")}>
            <input
              className="enroll-input"
              required
              inputMode="numeric"
              pattern="[0-9]{7,15}"
              title="Enter 7 to 15 digits only."
              value={form.mobile_number}
              onChange={(event) => update("mobile_number", event.target.value.replace(/\D/g, ""))}
              onBlur={() => confirmMobileIfReady("mobile_number", t("common.mobileNumber", "Mobile Number"))}
              name="mobile_number"
            />
          </Field>
          {pharmacyTypes.has(form.participant_type) && (
            <>
              <Field label={t("enroll.heteroRepName", "HETERO Rep. Name")}>
                <input className="enroll-input" required value={form.medical_rep_name} onChange={(event) => update("medical_rep_name", event.target.value)} />
              </Field>
              <Field label={t("enroll.heteroRepMobile", "HETERO Rep. Mobile Number")}>
                <input
                  className="enroll-input"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{7,15}"
                  title="Enter 7 to 15 digits only."
                  value={form.medical_rep_mobile_number}
                  onChange={(event) => update("medical_rep_mobile_number", event.target.value.replace(/\D/g, ""))}
                  onBlur={() => confirmMobileIfReady("medical_rep_mobile_number", t("enroll.heteroRepMobile", "HETERO Rep. Mobile Number"))}
                  name="medical_rep_mobile_number"
                />
              </Field>
            </>
          )}
        </div>

        <label className="mt-5 flex cursor-pointer items-start justify-center gap-3 text-sm italic sm:items-center sm:text-base">
          <input
            type="checkbox"
            className="terms-checkbox-input"
            checked={form.accepted_terms}
            onChange={(event) => update("accepted_terms", event.target.checked)}
          />
          <span className="terms-checkbox-mark" aria-hidden="true" />
          <span className="min-w-0 flex-1 leading-snug sm:flex-none">
            {t("enroll.acceptTerms", "I accept the")}{" "}
            <button type="button" className="whitespace-normal break-words text-left underline" onClick={() => setShowTerms(true)}>
              {t("enroll.terms", "terms and conditions")}
            </button>
          </span>
        </label>

        <button className="enroll-submit-btn mx-auto mt-8 block w-full max-w-2xl rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-4 py-4 font-black uppercase leading-tight text-white shadow-[0_16px_34px_rgba(0,0,0,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 sm:px-8" disabled={loading}>
          {loading ? t("enroll.buttonLoading", "Enrolling...") : t("enroll.button", "Enroll and get 100 points")}
        </button>
      </form>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {mobileConfirm && (
        <MobileConfirmModal
          label={mobileConfirm.label}
          number={`${mobileConfirm.prefix || ""} ${mobileConfirm.value}`.trim()}
          onConfirm={acceptMobileConfirm}
          onEdit={editMobileConfirm}
        />
      )}
      <AppFooter />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0 text-base font-semibold tracking-wide text-white sm:text-lg">
      {label}
      <div className="mt-2 min-w-0">{children}</div>
    </label>
  );
}

function TermsModal({ onClose }) {
  const { t, tList } = useLanguage();
  const translatedTerms = tList("terms.paragraphs", termsText);
  const termsTitle = translatedTerms[0] || t("enroll.termsTitle", "TERMS, CONDITIONS & DISCLAIMER");
  const termsBody = translatedTerms.slice(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#07120d] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-xl font-black">{termsTitle}</h2>
          <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xl" onClick={onClose} aria-label="Close terms">x</button>
        </div>
        <div className="scroll-panel max-h-[68vh] space-y-4 overflow-y-auto px-5 py-4">
          {termsBody.map((copy, index) => (
            <p key={index} className="text-sm leading-6 text-white/75">{copy}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileConfirmModal({ label, number, onConfirm, onEdit }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl border border-gold/25 bg-[#07120d] p-5 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,.5)]">
        <h2 className="text-2xl font-black">{label}</h2>
        <p className="mt-3 text-sm text-white/65">{t("enroll.mobileConfirmCopy", "Please confirm this mobile number is correct.")}</p>
        <div className="mt-5 rounded-2xl border border-white/12 bg-white/10 px-4 py-4 text-2xl font-black text-gold">
          {number}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onEdit}>
            {t("common.edit", "Edit")}
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            {t("common.correct", "Correct")}
          </button>
        </div>
      </div>
    </div>
  );
}

function participantLabel(t, type) {
  const option = participantLabels[type];
  return option ? t(option[0], option[1]) : t("common.participant", "Participant");
}
