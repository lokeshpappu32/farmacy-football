import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  browserPrefersSpanish,
  countryCodeUsesSpanish,
  countryUsesSpanish,
} from "../utils/language";

const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";
const LANGUAGE_OVERRIDE_KEY = "ff_language_override";

function setTranslateCookie(language) {
  const value = language === "es" ? "/en/es" : "/en/en";
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `googtrans=${value}; expires=${expires.toUTCString()}; path=/`;
  if (window.location.hostname.includes(".")) {
    document.cookie = `googtrans=${value}; expires=${expires.toUTCString()}; path=/; domain=.${window.location.hostname}`;
  }
}

function readParticipantCountry() {
  try {
    const participant = JSON.parse(localStorage.getItem("ff_participant") || "null");
    return participant?.country || "";
  } catch {
    return "";
  }
}

function chooseLanguageFromStoredCountry() {
  const storedCountry = localStorage.getItem("ff_selected_country") || readParticipantCountry();
  return countryUsesSpanish(storedCountry) ? "es" : "";
}

function loadGoogleTranslate() {
  if (document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) return;
  window.googleTranslateElementInit = () => {
    if (!window.google?.translate?.TranslateElement) return;
    window.google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "en,es",
        autoDisplay: false,
      },
      "google_translate_element",
    );
  };
  const script = document.createElement("script");
  script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

function applyTranslateCombo(language) {
  const combo = document.querySelector(".goog-te-combo");
  if (!combo) return false;
  combo.value = language;
  combo.dispatchEvent(new Event("change"));
  return true;
}

export default function LanguageTranslator() {
  const location = useLocation();
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_OVERRIDE_KEY) || "en");
  const [spanishEligible, setSpanishEligible] = useState(false);
  const isSuperAdminPage = location.pathname.startsWith("/super-admin");

  const label = useMemo(() => (language === "es" ? "Translate to English" : "Traducir a Espanol"), [language]);

  useEffect(() => {
    if (isSuperAdminPage) return;
    loadGoogleTranslate();
  }, [isSuperAdminPage]);

  useEffect(() => {
    if (isSuperAdminPage) {
      setTranslateCookie("en");
      window.setTimeout(() => applyTranslateCombo("en"), 400);
      return undefined;
    }
    const override = localStorage.getItem(LANGUAGE_OVERRIDE_KEY);
    if (override) {
      setSpanishEligible(override === "es" || Boolean(chooseLanguageFromStoredCountry()));
      setLanguage(override);
      setTranslateCookie(override);
      window.setTimeout(() => applyTranslateCombo(override), 900);
      return undefined;
    }

    const storedLanguage = chooseLanguageFromStoredCountry();
    if (storedLanguage) {
      setSpanishEligible(true);
      setLanguage("es");
      setTranslateCookie("es");
      window.setTimeout(() => applyTranslateCombo("es"), 900);
      return undefined;
    }

    if (browserPrefersSpanish()) {
      setSpanishEligible(true);
      setLanguage("es");
      setTranslateCookie("es");
      window.setTimeout(() => applyTranslateCombo("es"), 900);
      return undefined;
    }

    let cancelled = false;
    fetch("https://ipapi.co/json/", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (countryUsesSpanish(data.country_name) || countryCodeUsesSpanish(data.country)) {
          setSpanishEligible(true);
          setLanguage("es");
          setTranslateCookie("es");
          window.setTimeout(() => applyTranslateCombo("es"), 900);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isSuperAdminPage]);

  useEffect(() => {
    if (isSuperAdminPage) return undefined;
    const onCountrySelected = (event) => {
      if (countryUsesSpanish(event.detail?.country)) {
        setSpanishEligible(true);
        if (localStorage.getItem(LANGUAGE_OVERRIDE_KEY)) return;
        setLanguage("es");
        setTranslateCookie("es");
        window.setTimeout(() => applyTranslateCombo("es"), 500);
      }
    };
    window.addEventListener("ff-country-selected", onCountrySelected);
    return () => window.removeEventListener("ff-country-selected", onCountrySelected);
  }, [isSuperAdminPage]);

  const switchLanguage = () => {
    const nextLanguage = language === "es" ? "en" : "es";
    localStorage.setItem(LANGUAGE_OVERRIDE_KEY, nextLanguage);
    setLanguage(nextLanguage);
    setSpanishEligible(true);
    setTranslateCookie(nextLanguage);
    window.setTimeout(() => window.location.reload(), 80);
  };

  if (isSuperAdminPage) {
    return <div id="google_translate_element" className="google-translate-hidden" />;
  }

  if (!spanishEligible && language !== "es") {
    return <div id="google_translate_element" className="google-translate-hidden" />;
  }

  return (
    <>
      <div id="google_translate_element" className="google-translate-hidden" />
      <button type="button" onClick={switchLanguage} className="language-switch notranslate">
        {label}
      </button>
    </>
  );
}
