import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppFooter from "../components/AppFooter";
import BrandHeaderLogos from "../components/BrandHeaderLogos";
import FootballLogo from "../components/FootballLogo";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { homeForRole } from "../utils/auth";

const pharmacyOptions = [
  ["farmacy_owner", "participant.farmacyOwner", "Farmacy Owner"],
  ["farmacy_head_supervisor", "participant.farmacyHeadSupervisor", "Farmacy Head / Supervisor"],
  ["farmacy_sales_staff", "participant.farmacySalesStaff", "Farmacy Sales Staff"],
];
const heteroOptions = [
  ["hetero_representative_staff", "participant.heteroRepresentativeStaff", "Hetero Representative / Staff"],
];
const visitorOptions = [...pharmacyOptions, ...heteroOptions].map(([value]) => value);
const visitorAliases = {
  farmacy_head: "farmacy_head_supervisor",
  pharmacy_head: "farmacy_head_supervisor",
  farmacy_supervisor: "farmacy_head_supervisor",
  pharmacy_supervisor: "farmacy_head_supervisor",
  hetero_staff: "hetero_representative_staff",
  hetero_representative: "hetero_representative_staff",
  hetero_rep: "hetero_representative_staff",
  medical_rep: "hetero_representative_staff",
  representative: "hetero_representative_staff",
  staff: "hetero_representative_staff",
  rep: "hetero_representative_staff",
  mr: "hetero_representative_staff",
};

export default function Home() {
  const { language, setManualLanguage, t } = useLanguage();
  const [params] = useSearchParams();
  const [visitorType, setVisitorType] = useState("farmacy_owner");
  const navigate = useNavigate();
  const { isAuthed, role } = useAuth();
  const visitorParam = (params.get("participant_type") || "").toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const normalizedVisitorParam = visitorAliases[visitorParam] || visitorParam;
  const selectedType = visitorOptions.includes(normalizedVisitorParam) ? normalizedVisitorParam : visitorType;
  const enrollUrl = `/enroll?participant_type=${encodeURIComponent(selectedType)}`;

  useEffect(() => {
    if (isAuthed) navigate(homeForRole(role), { replace: true });
  }, [isAuthed, role, navigate]);

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-x-hidden bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.22)_100%)]" />
      <div className="absolute inset-0 bg-emerald-950/12" />

      <section className="relative z-10 mx-auto flex min-h-0 flex-1 w-full max-w-6xl flex-col items-center px-5 py-4 text-center sm:py-5">
        <HomeLanguageSelector language={language} onChange={setManualLanguage} />
        <BrandHeaderLogos className="mt-1" logoClassName="h-16 w-32 sm:h-20 sm:w-40 lg:h-24 lg:w-48" />

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-10 pt-4 sm:pb-12 sm:pt-5">
          <FootballLogo className="scale-[.82] sm:scale-90 lg:scale-100" />

          <div className="mt-6 grid w-full max-w-4xl gap-5 text-left text-xs font-semibold uppercase tracking-wide sm:mt-8 sm:text-sm lg:grid-cols-[1fr_auto_1fr] lg:text-base">
            <RoleGroup title={t("home.farmacistType", "Farmacist Type")} options={pharmacyOptions} selectedType={selectedType} onChange={setVisitorType} />
            <div className="hidden w-px bg-white/70 lg:block" />
            <RoleGroup title={t("home.heteroRepStaff", "Hetero Representative / Staff")} options={heteroOptions} selectedType={selectedType} onChange={setVisitorType} />
          </div>

          <Link
            to={enrollUrl}
            className="mt-6 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-10 py-3 text-xl font-black uppercase leading-none text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] hover:brightness-110 sm:mt-8 sm:px-12 sm:py-4 sm:text-2xl"
          >
            {t("home.enroll", "Enroll")}
          </Link>
        </div>

        <Link
          to="/login"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline sm:bottom-4 sm:text-base"
        >
          {t("enroll.adminLogin", "Login - if you are Admin")}
        </Link>
      </section>
      <AppFooter compact showClientLogos />
    </main>
  );
}

function HomeLanguageSelector({ language, onChange }) {
  const options = [
    ["en", "English"],
    ["es", "Español"],
    ["fr", "Français"],
    ["ru", "Русский"],
  ];
  return (
    <div className="mb-2 flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[11px] font-black text-white shadow-[0_10px_30px_rgba(0,0,0,.25)] backdrop-blur-sm sm:absolute sm:right-5 sm:top-5 sm:mb-0 sm:text-xs">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={`rounded-full px-2.5 py-1 transition ${
            language === value ? "bg-gold text-black" : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RoleGroup({ title, options, selectedType, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-sm">
      <h2 className="mb-5 text-center text-base font-black text-white lg:text-left">{title}</h2>
      <div className="space-y-4">
        {options.map(([value, labelKey, label]) => (
          <label key={value} className="home-role-option">
            <input
              type="radio"
              name="visitor_type"
              value={value}
              checked={selectedType === value}
              onChange={(event) => onChange(event.target.value)}
              className="home-role-radio"
            />
            <span className="home-role-mark" />
            <span className="leading-snug">{t(labelKey, label)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
