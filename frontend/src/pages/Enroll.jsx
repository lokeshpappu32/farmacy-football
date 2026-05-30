import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const fallbackCountries = [{ name: "India", iso_code: "IN", country_code: "+91", label: "India (+91)" }];
const fallbackCountry = fallbackCountries[0];
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
  const initialType = params.get("participant_type") === "medical_rep" ? "medical_rep" : "farmacist";
  const [countries, setCountries] = useState(fallbackCountries);
  const [form, setForm] = useState({
    participant_type: initialType,
    full_name: "",
    pharmacy_name: "",
    country_code: fallbackCountry.country_code,
    mobile_number: "",
    country: fallbackCountry.name,
    medical_rep_name: "",
    medical_rep_country_code: fallbackCountry.country_code,
    medical_rep_mobile_number: "",
    accepted_terms: false,
  });
  const [error, setError] = useState("");
  const [showTerms, setShowTerms] = useState(false);
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
          medical_rep_country_code: current.medical_rep_country_code || india.country_code,
        }));
      })
      .catch(() => {});
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateCountry = (isoCode) => {
    const selected = countries.find((country) => country.iso_code === isoCode) || fallbackCountry;
    setForm((current) => ({
      ...current,
      country: selected.name,
      country_code: selected.country_code,
      medical_rep_country_code: selected.country_code,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!form.accepted_terms) throw new Error("Please accept the terms and conditions.");
      await enroll(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-cover bg-center px-4 py-8 text-white"
      style={{ backgroundImage: "url('/soccer-field.webp')" }}
    >
      <div className="absolute inset-0 bg-black/54" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.44)_44%,rgba(0,0,0,0.78)_100%)]" />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <img src="/hetero-logo.png" alt="Hetero" className="absolute right-[7%] top-8 z-10 h-24 w-32 object-contain mix-blend-screen" />

      <form onSubmit={submit} className="relative z-10 mx-auto mt-16 w-full max-w-[920px] rounded-[30px] border border-white/12 bg-green-950/65 px-7 pb-8 pt-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-[3px] md:px-12">
        <FootballLogo compact={false} className="mx-auto mb-16 max-w-[420px]" />

        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          <Field label={form.participant_type === "medical_rep" ? "Name of HETERO Rep." : "Name of Farmacist"}>
            <input className="enroll-input" required value={form.full_name} onChange={(event) => update("full_name", event.target.value)} />
          </Field>
          <Field label="Name of Farmacy">
            <input className="enroll-input" required value={form.pharmacy_name} onChange={(event) => update("pharmacy_name", event.target.value)} />
          </Field>
          <Field label="Country">
            <select className="enroll-input" required value={countries.find((country) => country.name === form.country)?.iso_code || fallbackCountry.iso_code} onChange={(event) => updateCountry(event.target.value)}>
              {countries.map((country) => <option key={country.iso_code} value={country.iso_code}>{country.name}</option>)}
            </select>
          </Field>
          <Field label="Mobile Number">
            <input className="enroll-input" required value={form.mobile_number} onChange={(event) => update("mobile_number", event.target.value)} />
          </Field>
          <Field label="HETERO Rep. Name">
            <input className="enroll-input" required value={form.medical_rep_name} onChange={(event) => update("medical_rep_name", event.target.value)} />
          </Field>
          <Field label="HETERO Rep. Mobile Number">
            <input className="enroll-input" required value={form.medical_rep_mobile_number} onChange={(event) => update("medical_rep_mobile_number", event.target.value)} />
          </Field>
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
