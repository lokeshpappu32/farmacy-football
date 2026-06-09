import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../i18n";
import {
  browserPreferredCampaignLanguage,
  languageForCountry,
  languageForCountryCode,
} from "../utils/language";
import { LANGUAGE_OVERRIDE_KEY, TARGET_LANGUAGE_KEY } from "../utils/translations";

const LanguageContext = createContext({
  language: "en",
  targetLanguage: "",
  currentCountry: "",
  translationEligible: false,
  switchLanguage: () => {},
  t: (_key, fallback) => fallback,
  tList: (_key, fallback) => fallback,
});

function readParticipantCountry() {
  try {
    const participant = JSON.parse(localStorage.getItem("ff_participant") || "null");
    return participant?.country || "";
  } catch {
    return "";
  }
}

function storedTargetLanguage() {
  const storedCountry = localStorage.getItem("ff_selected_country") || readParticipantCountry();
  return languageForCountry(storedCountry) || localStorage.getItem(TARGET_LANGUAGE_KEY) || "";
}

function rememberTargetLanguage(language) {
  if (language && language !== "en") localStorage.setItem(TARGET_LANGUAGE_KEY, language);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_OVERRIDE_KEY) || "en");
  const [targetLanguage, setTargetLanguage] = useState(() => storedTargetLanguage() || browserPreferredCampaignLanguage());
  const [currentCountry, setCurrentCountry] = useState(() => localStorage.getItem("ff_selected_country") || readParticipantCountry() || "");

  useEffect(() => {
    const storedTarget = storedTargetLanguage();
    if (storedTarget) {
      setTargetLanguage(storedTarget);
      rememberTargetLanguage(storedTarget);
      if (!localStorage.getItem(LANGUAGE_OVERRIDE_KEY)) setLanguage(storedTarget);
      return undefined;
    }

    const browserLanguage = browserPreferredCampaignLanguage();
    if (browserLanguage) {
      setTargetLanguage(browserLanguage);
      rememberTargetLanguage(browserLanguage);
      if (!localStorage.getItem(LANGUAGE_OVERRIDE_KEY)) setLanguage(browserLanguage);
      return undefined;
    }

    let cancelled = false;
    fetch("https://ipapi.co/json/", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.country_name) setCurrentCountry(data.country_name);
        const detectedLanguage = languageForCountry(data.country_name) || languageForCountryCode(data.country);
        if (!detectedLanguage) return;
        setTargetLanguage(detectedLanguage);
        rememberTargetLanguage(detectedLanguage);
        if (!localStorage.getItem(LANGUAGE_OVERRIDE_KEY)) setLanguage(detectedLanguage);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onCountrySelected = (event) => {
      const selectedCountry = event.detail?.country || "";
      if (selectedCountry) setCurrentCountry(selectedCountry);
      const selectedLanguage = languageForCountry(selectedCountry);
      if (!selectedLanguage) return;
      setTargetLanguage(selectedLanguage);
      rememberTargetLanguage(selectedLanguage);
      if (!localStorage.getItem(LANGUAGE_OVERRIDE_KEY)) setLanguage(selectedLanguage);
    };
    window.addEventListener("ff-country-selected", onCountrySelected);
    return () => window.removeEventListener("ff-country-selected", onCountrySelected);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language || "en";
    i18n.changeLanguage(language || "en");
  }, [language]);

  const switchLanguage = useCallback(() => {
    const nextLanguage = language === "en" ? targetLanguage || "es" : "en";
    localStorage.setItem(LANGUAGE_OVERRIDE_KEY, nextLanguage);
    setLanguage(nextLanguage);
  }, [language, targetLanguage]);

  const value = useMemo(
    () => ({
      language,
      targetLanguage,
      currentCountry,
      translationEligible: Boolean(targetLanguage) || language !== "en",
      switchLanguage,
      t: (key, fallback, values = {}) => i18n.t(key, { lng: language, defaultValue: fallback, ...values }),
      tList: (key, fallback) => {
        const value = i18n.t(key, { lng: language, defaultValue: fallback, returnObjects: true });
        return Array.isArray(value) ? value : fallback;
      },
    }),
    [currentCountry, language, switchLanguage, targetLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
