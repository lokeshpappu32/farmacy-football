import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppFooter from "../components/AppFooter";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { rememberSelectedCountry } from "../utils/language";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];
const mrEnrollmentMessage = "Kindly ask your Hetero Representative to enroll first using his/her mobile number.";
const participantLabels = {
  farmacy_owner: "Farmacy Owner",
  farmacy_head_supervisor: "Farmacy Head / Supervisor",
  farmacy_head: "Farmacy Head",
  farmacy_supervisor: "Farmacy Supervisor",
  farmacy_sales_staff: "Farmacy Sales Staff",
  hetero_representative_staff: "HETERO Representative / Staff",
  hetero_staff: "HETERO Staff",
  hetero_representative: "HETERO Representative",
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
const termsText = [
  ["1. Purpose", "This Campaign is a voluntary pharmacist engagement initiative conducted by representatives associated with Hetero and/or its affiliated entities (“Organizer”) for promotional interaction, participation engagement, and entertainment purposes only.\n\nThis Campaign does not constitute gambling, betting, wagering, lottery, gaming, or any activity involving monetary stakes or consideration."],
  ["2. Eligibility", "Participation is open only to legally eligible pharmacists and authorized pharmacy personnel aged 18 years or above, subject to applicable local laws, institutional policies, and professional regulations.\n\nParticipation is entirely voluntary and independent."],
  ["3. Campaign Mechanics", "Participants may:\n\nRegister once on the designated web platform;\nPredict outcomes of listed football matches; and\nIndicate their preferred Hetero brand.\n\nParticipants may receive engagement points for:\n\nMatch participation; and\nCorrect outcome predictions.\n\nPoints, rankings, and leaderboard positions are solely for engagement and recognition purposes and hold no monetary value, transferable rights, or commercial entitlement."],
  ["4. No Commercial Obligation", "Participation in this Campaign:\n\nDoes not require purchase, prescription, recommendation, stocking, or promotion of any product;\nShall not influence professional judgment or pharmacy practice; and\nCreates no commercial, contractual, or financial relationship between participants and the Organizer."],
  ["5. Leaderboard & Technical Disclaimer", "The Campaign platform, schedules, scoring systems, and leaderboards may be operated through third-party software providers.\n\nThe Organizer shall not be liable for:\n\nTechnical failures;\nConnectivity issues;\nLogin/access interruptions;\nDelayed or inaccurate updates;\nFixture or schedule errors;\nIncorrect scoring or rankings; or\nAny software or system malfunction.\n\nAll match-related information is sourced from publicly available third-party data and may change without notice."],
  ["6. Independent Participation", "Each participant confirms that:\n\nParticipation is voluntary;\nParticipation complies with applicable local laws, employer policies, and healthcare compliance standards; and\nThe participant independently assumes responsibility for participation."],
  ["7. Hetero Representative Disclaimer", "Any Hetero representative, medical representative (“MR”), distributor personnel, or field staff involved in facilitating this Campaign acts solely in an engagement coordination capacity.\n\nThe Organizer shall not be responsible for any independent representation, commitment, assurance, or communication made outside officially approved Campaign channels."],
  ["8. No Association With Sports Authorities", "This Campaign is an independent engagement activity and is not sponsored, endorsed, administered by, or associated with any football federation, tournament organizer, league authority, club, or sports governing body."],
  ["9. Data Privacy", "By participating, users consent to collection and processing of limited participation-related information for Campaign administration, leaderboard generation, communication, and engagement tracking purposes.\n\nThe Organizer does not guarantee uninterrupted platform security or error-free digital operations."],
  ["10. Limitation of Liability", "To the fullest extent permitted under applicable law, the Organizer, its affiliates, employees, representatives, distributors, and technology partners shall not be liable for any direct, indirect, incidental, consequential, technical, reputational, or financial loss arising from participation in the Campaign."],
  ["11. Right to Modify or Terminate", "The Organizer reserves the absolute right to:\n\nAmend these Terms & Conditions;\nModify Campaign mechanics or scoring;\nSuspend or terminate participation; or\nWithdraw the Campaign,\n\nat any time without prior notice or liability."],
  ["12. Acceptance", "By registering or participating, participants acknowledge that they:\n\nHave read and accepted these Terms & Conditions;\nParticipate voluntarily and independently; and\nUnderstand that this Campaign is solely a non-commercial engagement activity and not a betting or gaming platform."],
];

export default function Enroll() {
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
  const { enroll } = useAuth();
  const navigate = useNavigate();

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
      await enroll(payload);
      navigate("/dashboard");
    } catch (err) {
      if (err.message === mrEnrollmentMessage) {
        setRepEnrollmentPopup(err.message);
      } else {
        setError(err.message);
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

      <form onSubmit={submit} className="enroll-card relative z-10 mx-auto mt-24 min-w-0 rounded-[30px] border border-white/12 bg-green-950/42 px-4 pb-8 pt-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-[1px] sm:mt-16 sm:px-7 md:px-12">
        <FootballLogo compact={false} className="mx-auto mb-10 max-w-[260px] sm:mb-16 sm:max-w-[420px]" />

        <div className={`grid min-w-0 gap-x-10 gap-y-6 ${heteroTypes.has(form.participant_type) ? "mx-auto w-full max-w-md md:grid-cols-1" : "w-full md:grid-cols-2"}`}>
          <Field label={`Name of ${participantLabels[form.participant_type] || "Participant"}`}>
            <input className="enroll-input" required value={form.full_name} onChange={(event) => update("full_name", event.target.value)} />
          </Field>
          {pharmacyTypes.has(form.participant_type) && (
            <Field label="Name of Farmacy">
              <input className="enroll-input" required value={form.pharmacy_name} onChange={(event) => update("pharmacy_name", event.target.value)} />
            </Field>
          )}
          <Field label="Country">
            <div className="relative min-w-0">
              <div className="flex h-[42px] w-full min-w-0 overflow-hidden rounded-[10px] border border-white/25 bg-[rgba(239,244,236,.9)] focus-within:border-white/85 focus-within:shadow-[0_0_0_4px_rgba(255,255,255,.12)]">
                <span className="flex w-[70px] shrink-0 items-center justify-center border-r border-black/10 px-2 text-sm font-black text-red-700 sm:w-[76px]">
                  {form.country_code || "Code"}
                </span>
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[#050608] outline-none placeholder:text-black/45"
                  required
                  placeholder="Search country or code"
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
                    <div className="px-3 py-3 text-sm font-semibold text-white/55">No countries found</div>
                  )}
                </div>
              )}
            </div>
          </Field>
          <Field label="Mobile Number">
            <input
              className="enroll-input"
              required
              inputMode="numeric"
              pattern="[0-9]{7,15}"
              title="Enter 7 to 15 digits only."
              value={form.mobile_number}
              onChange={(event) => update("mobile_number", event.target.value.replace(/\D/g, ""))}
              onBlur={() => confirmMobileIfReady("mobile_number", "Mobile Number")}
              name="mobile_number"
            />
          </Field>
          {pharmacyTypes.has(form.participant_type) && (
            <>
              <Field label="HETERO Rep. Name">
                <input className="enroll-input" required value={form.medical_rep_name} onChange={(event) => update("medical_rep_name", event.target.value)} />
              </Field>
              <Field label="HETERO Rep. Mobile Number">
                <input
                  className="enroll-input"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{7,15}"
                  title="Enter 7 to 15 digits only."
                  value={form.medical_rep_mobile_number}
                  onChange={(event) => update("medical_rep_mobile_number", event.target.value.replace(/\D/g, ""))}
                  onBlur={() => confirmMobileIfReady("medical_rep_mobile_number", "HETERO Rep. Mobile Number")}
                  name="medical_rep_mobile_number"
                />
              </Field>
            </>
          )}
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-3 text-base italic">
          <input
            type="checkbox"
            className="terms-checkbox-input"
            checked={form.accepted_terms}
            onChange={(event) => update("accepted_terms", event.target.checked)}
          />
          <span className="terms-checkbox-mark" aria-hidden="true" />
          <span>
            I accept the{" "}
            <button type="button" className="underline" onClick={() => setShowTerms(true)}>
              terms and conditions
            </button>
          </span>
        </label>

        <button className="mx-auto mt-8 block w-full max-w-2xl rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-8 py-4 text-2xl font-black uppercase leading-none text-white shadow-[0_16px_34px_rgba(0,0,0,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70" disabled={loading}>
          {loading ? "Enrolling..." : "Enroll and get 100 points"}
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#07120d] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-xl font-black">Terms & Conditions</h2>
          <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xl" onClick={onClose} aria-label="Close terms">x</button>
        </div>
        <div className="scroll-panel max-h-[68vh] space-y-4 overflow-y-auto px-5 py-4">
          <p className="font-bold text-gold">Pharmacist Football Engagement Campaign</p>
          {termsText.map(([title, copy]) => (
            <section key={title}>
              <h3 className="font-black">{title}</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/75">{copy}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileConfirmModal({ label, number, onConfirm, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl border border-gold/25 bg-[#07120d] p-5 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,.5)]">
        <h2 className="text-2xl font-black">{label}</h2>
        <p className="mt-3 text-sm text-white/65">Please confirm this mobile number is correct.</p>
        <div className="mt-5 rounded-2xl border border-white/12 bg-white/10 px-4 py-4 text-2xl font-black text-gold">
          {number}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Correct
          </button>
        </div>
      </div>
    </div>
  );
}
