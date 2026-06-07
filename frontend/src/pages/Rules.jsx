import { useLanguage } from "../context/LanguageContext";

const rules = [
  ["rules.enrollmentTitle", "Enrollment", "rules.enrollmentCopy", "+100 points automatically after registration."],
  ["rules.participationTitle", "Participation", "rules.participationCopy", "+50 points for submitting a match choice."],
  ["rules.correctTitle", "Correct choice", "rules.correctCopy", "+50 points when the selected team or Draw choice matches the final result."],
  ["rules.editTitle", "Edit window", "rules.editCopy", "Choices can be modified until match start time."],
  ["rules.wrongTitle", "Wrong choice", "rules.wrongCopy", "No points are deducted."],
  ["rules.cancelledTitle", "Cancelled match", "rules.cancelledCopy", "Participation points are retained if a match is cancelled."],
];

export default function Rules() {
  const { t } = useLanguage();
  return (
    <div className="glass rounded-3xl p-6">
      <h1 className="text-3xl font-black">{t("navigation.pointsSystem", "Points System")}</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rules.map(([titleKey, title, copyKey, copy]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <h2 className="text-xl font-black text-gold">{t(titleKey, title)}</h2>
            <p className="mt-2 text-white/68">{t(copyKey, copy)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
