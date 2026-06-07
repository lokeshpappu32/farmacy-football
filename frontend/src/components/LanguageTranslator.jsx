import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageTranslator() {
  const location = useLocation();
  const { language, targetLanguage, translationEligible, switchLanguage } = useLanguage();
  const isSuperAdminPage = location.pathname.startsWith("/super-admin");

  const label = useMemo(() => {
    if (language === "es" || language === "fr" || language === "ru") return "Translate to English";
    if (targetLanguage === "fr") return "Translate to French";
    if (targetLanguage === "ru") return "Translate to Russian";
    return "Translate to Spanish";
  }, [language, targetLanguage]);

  if (isSuperAdminPage || (!translationEligible && language === "en")) return null;

  return (
    <button type="button" onClick={switchLanguage} className="language-switch">
      {label}
    </button>
  );
}
