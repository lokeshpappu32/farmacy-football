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
      className="relative flex min-h-screen flex-col overflow-x-hidden bg-cover bg-center text-white lg:h-screen lg:overflow-hidden"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.22)_100%)]" />
      <div className="absolute inset-0 bg-emerald-950/12" />

      <section className="relative z-10 mx-auto flex min-h-0 flex-1 w-full max-w-6xl flex-col items-center px-5 py-3 text-center sm:py-4 lg:py-2">
        <BrandHeaderLogos className="mt-1 lg:mt-0" logoClassName="h-16 w-32 sm:h-20 sm:w-40 lg:h-16 lg:w-32 xl:h-20 xl:w-40" />

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-8 pt-3 sm:pb-12 sm:pt-4 lg:pb-4 lg:pt-1">
          <FootballLogo className="scale-[.82] sm:scale-90 lg:scale-[.76] xl:scale-[.86]" />

          <div className="mt-6 grid w-full max-w-4xl gap-5 text-left text-xs font-semibold uppercase tracking-wide sm:mt-8 sm:text-sm lg:mt-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-4 lg:text-sm xl:mt-5 xl:text-base">
            <RoleGroup title={t("home.farmacistType", "Farmacist Type")} options={pharmacyOptions} selectedType={selectedType} onChange={setVisitorType} />
            <div className="hidden w-px bg-white/70 lg:block" />
            <RoleGroup title={t("home.heteroRepStaff", "Hetero Representative / Staff")} options={heteroOptions} selectedType={selectedType} onChange={setVisitorType} />
          </div>

          <Link
            to={enrollUrl}
            className="mt-6 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-10 py-3 text-xl font-black uppercase leading-none text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] hover:brightness-110 sm:mt-8 sm:px-12 sm:py-4 sm:text-2xl lg:mt-4 lg:px-10 lg:py-3 lg:text-xl xl:mt-6 xl:text-2xl"
          >
            {t("home.enroll", "Enroll")}
          </Link>
          <Link
            to="/login"
            className="mt-5 text-sm font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline sm:text-base lg:mt-3"
          >
            {t("enroll.adminLogin", "Login - if you are Admin")}
          </Link>
        </div>
      </section>
      <HomeLanguageSelector language={language} onChange={setManualLanguage} />
      <AppFooter compact showClientLogos showTranslator={false} />
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
    <div className="relative z-10 mx-auto mb-3 grid w-[min(92vw,360px)] grid-cols-2 gap-1.5 rounded-2xl border border-white/15 bg-black/40 p-2 text-xs font-black text-white shadow-[0_10px_30px_rgba(0,0,0,.25)] backdrop-blur-sm sm:mb-4 sm:w-[360px] sm:text-sm lg:mb-2 lg:w-[320px] lg:p-1.5 lg:text-xs xl:w-[360px] xl:p-2 xl:text-sm">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={`rounded-xl px-3 py-2 transition ${
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
