import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  browserPreferredCampaignLanguage,
  languageForCountry,
  languageForCountryCode,
} from "../utils/language";

const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";
const LANGUAGE_OVERRIDE_KEY = "ff_language_override";
const TARGET_LANGUAGE_KEY = "ff_translation_target";

function setTranslateCookie(language) {
  const value = language && language !== "en" ? `/en/${language}` : "/en/en";
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
  return languageForCountry(storedCountry);
}

function rememberTargetLanguage(language) {
  if (language && language !== "en") localStorage.setItem(TARGET_LANGUAGE_KEY, language);
}

function targetLanguage() {
  return chooseLanguageFromStoredCountry() || localStorage.getItem(TARGET_LANGUAGE_KEY) || "";
}

function loadGoogleTranslate() {
  if (document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) return;
  window.googleTranslateElementInit = () => {
    if (!window.google?.translate?.TranslateElement) return;
    window.google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "en,es,fr",
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
  const [translationEligible, setTranslationEligible] = useState(false);
  const isSuperAdminPage = location.pathname.startsWith("/super-admin");

  const label = useMemo(() => {
    if (language === "es" || language === "fr") return "Translate to English";
    const target = targetLanguage();
    if (target === "fr") return "Traduire en francais";
    return "Traducir a Espanol";
  }, [language]);

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
      setTranslationEligible(override !== "en" || Boolean(targetLanguage()));
      setLanguage(override);
      setTranslateCookie(override);
      window.setTimeout(() => applyTranslateCombo(override), 900);
      return undefined;
    }

    const storedLanguage = chooseLanguageFromStoredCountry();
    if (storedLanguage) {
      rememberTargetLanguage(storedLanguage);
      setTranslationEligible(true);
      setLanguage(storedLanguage);
      setTranslateCookie(storedLanguage);
      window.setTimeout(() => applyTranslateCombo(storedLanguage), 900);
      return undefined;
    }

    const browserLanguage = browserPreferredCampaignLanguage();
    if (browserLanguage) {
      rememberTargetLanguage(browserLanguage);
      setTranslationEligible(true);
      setLanguage(browserLanguage);
      setTranslateCookie(browserLanguage);
      window.setTimeout(() => applyTranslateCombo(browserLanguage), 900);
      return undefined;
    }

    let cancelled = false;
    fetch("https://ipapi.co/json/", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const detectedLanguage = languageForCountry(data.country_name) || languageForCountryCode(data.country);
        if (detectedLanguage) {
          rememberTargetLanguage(detectedLanguage);
          setTranslationEligible(true);
          setLanguage(detectedLanguage);
          setTranslateCookie(detectedLanguage);
          window.setTimeout(() => applyTranslateCombo(detectedLanguage), 900);
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
      const selectedLanguage = languageForCountry(event.detail?.country);
      if (selectedLanguage) {
        rememberTargetLanguage(selectedLanguage);
        setTranslationEligible(true);
        if (localStorage.getItem(LANGUAGE_OVERRIDE_KEY)) return;
        setLanguage(selectedLanguage);
        setTranslateCookie(selectedLanguage);
        window.setTimeout(() => applyTranslateCombo(selectedLanguage), 500);
      }
    };
    window.addEventListener("ff-country-selected", onCountrySelected);
    return () => window.removeEventListener("ff-country-selected", onCountrySelected);
  }, [isSuperAdminPage]);

  const switchLanguage = () => {
    const target = targetLanguage() || "es";
    const nextLanguage = language === "en" ? target : "en";
    localStorage.setItem(LANGUAGE_OVERRIDE_KEY, nextLanguage);
    setLanguage(nextLanguage);
    setTranslationEligible(true);
    setTranslateCookie(nextLanguage);
    window.setTimeout(() => window.location.reload(), 80);
  };

  if (isSuperAdminPage) {
    return <div id="google_translate_element" className="google-translate-hidden" />;
  }

  if (!translationEligible && language === "en") {
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
