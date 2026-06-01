import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppFooter from "../components/AppFooter";
import FootballLogo from "../components/FootballLogo";
import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../utils/auth";

const pharmacyOptions = [
  ["farmacy_owner", "Farmacy Owner"],
  ["farmacy_head_supervisor", "Farmacy Head / Supervisor"],
  ["farmacy_sales_staff", "Farmacy Sales Staff"],
];
const heteroOptions = [
  ["hetero_representative_staff", "Hetero Representative / Staff"],
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
      className="relative min-h-screen overflow-hidden bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.22)_100%)]" />
      <div className="absolute inset-0 bg-emerald-950/12" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-5 py-10 text-center">
        <img
          src="/hetero-logo.png"
          alt="Hetero"
          className="mt-2 h-24 w-40 object-contain mix-blend-screen sm:h-32 sm:w-52"
        />

        <div className="flex flex-1 flex-col items-center justify-center pb-20 pt-10 sm:pb-24">
          <FootballLogo />

          <div className="mt-14 grid w-full max-w-4xl gap-8 text-left text-sm font-semibold uppercase tracking-wide sm:text-base lg:grid-cols-[1fr_auto_1fr] lg:text-lg">
            <RoleGroup title="Farmacist Type" options={pharmacyOptions} selectedType={selectedType} onChange={setVisitorType} />
            <div className="hidden w-px bg-white/70 lg:block" />
            <RoleGroup title="Hetero Representative / Staff" options={heteroOptions} selectedType={selectedType} onChange={setVisitorType} />
          </div>

          <Link
            to={enrollUrl}
            className="mt-10 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-12 py-4 text-2xl font-black uppercase leading-none text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] hover:brightness-110"
          >
            Enroll
          </Link>
        </div>

        <Link
          to="/login"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-base font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline"
        >
          Login - if you are Admin
        </Link>
      </section>
      <AppFooter />
    </main>
  );
}

function RoleGroup({ title, options, selectedType, onChange }) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <h2 className="mb-5 text-center text-base font-black text-white lg:text-left">{title}</h2>
      <div className="space-y-4">
        {options.map(([value, label]) => (
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
            <span className="leading-snug">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
