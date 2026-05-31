import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];
const mrEnrollmentMessage = "Kindly ask your Hetero Representative to enroll first using his/her mobile number.";
const participantLabels = {
  farmacy_owner: "Farmacy Owner",
  farmacy_head: "Farmacy Head",
  farmacy_supervisor: "Farmacy Supervisor",
  farmacy_sales_staff: "Farmacy Sales Staff",
  hetero_staff: "HETERO Staff",
  hetero_representative: "HETERO Representative",
};
const participantTypes = new Set(Object.keys(participantLabels));
const participantAliases = {
  farmacist: "farmacy_owner",
  medical_rep: "hetero_representative",
  hetero_rep: "hetero_representative",
  representative: "hetero_representative",
  rep: "hetero_representative",
  mr: "hetero_representative",
};
const pharmacyTypes = new Set(["farmacy_owner", "farmacy_head", "farmacy_supervisor", "farmacy_sales_staff"]);
const heteroTypes = new Set(["hetero_staff", "hetero_representative"]);
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
  };

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
      className="relative min-h-screen overflow-hidden bg-cover bg-center px-3 py-6 text-white sm:px-4 sm:py-8"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_14%,rgba(0,0,0,0.22)_100%)]" />
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <Toast message={repEnrollmentPopup} tone="error" onClose={() => setRepEnrollmentPopup("")} />

      <img src="/hetero-logo.png" alt="Hetero" className="absolute right-3 top-4 z-10 h-16 w-24 object-contain mix-blend-screen sm:right-[7%] sm:top-8 sm:h-24 sm:w-32" />

      <form onSubmit={submit} className="relative z-10 mx-auto mt-24 w-full max-w-[920px] rounded-[30px] border border-white/12 bg-green-950/42 px-5 pb-8 pt-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-[1px] sm:mt-16 sm:px-7 md:px-12">
        <FootballLogo compact={false} className="mx-auto mb-12 max-w-[320px] sm:mb-16 sm:max-w-[420px]" />

        <div className={`grid gap-x-10 gap-y-6 ${heteroTypes.has(form.participant_type) ? "mx-auto max-w-md md:grid-cols-1" : "md:grid-cols-2"}`}>
          <Field label={`Name of ${participantLabels[form.participant_type] || "Participant"}`}>
            <input className="enroll-input" required value={form.full_name} onChange={(event) => update("full_name", event.target.value)} />
          </Field>
          {pharmacyTypes.has(form.participant_type) && (
            <Field label="Name of Farmacy">
              <input className="enroll-input" required value={form.pharmacy_name} onChange={(event) => update("pharmacy_name", event.target.value)} />
            </Field>
          )}
          <Field label="Country">
            <input
              className="enroll-input"
              required
              list="country-options"
              placeholder="Select Country"
              value={countryQuery}
              onChange={(event) => updateCountry(event.target.value)}
            />
            <datalist id="country-options">
              {countries.map((country) => <option key={country.iso_code} value={country.label || `${country.name} (${country.country_code})`} />)}
            </datalist>
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
                />
              </Field>
            </>
          )}
        </div>

        <label className="mt-5 flex items-center justify-center gap-3 text-base italic">
          <input
            type="checkbox"
            className="h-5 w-5 accent-white"
            checked={form.accepted_terms}
            onChange={(event) => update("accepted_terms", event.target.checked)}
          />
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
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-lg font-semibold tracking-wide text-white">
      {label}
      <div className="mt-2">{children}</div>
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
