const SPANISH_COUNTRY_NAMES = new Set([
  "chile",
  "colombia",
  "costa rica",
  "dominican republic",
  "el salvador",
  "guatemala",
  "honduras",
  "mexico",
  "nicaragua",
  "panama",
  "peru",
]);

const FRENCH_COUNTRY_NAMES = new Set([
  "cameroon",
  "cote d'ivoire",
  "côte d'ivoire",
  "ivory coast",
  "senegal",
]);

const RUSSIAN_COUNTRY_NAMES = new Set([
  "ukraine",
  "kazakhstan",
  "uzbekistan",
  "kyrgyzstan",
]);

const SPANISH_COUNTRY_CODES = new Set(["CL", "CO", "CR", "DO", "SV", "GT", "HN", "MX", "NI", "PA", "PE"]);
const FRENCH_COUNTRY_CODES = new Set(["CM", "CI", "SN"]);
const RUSSIAN_COUNTRY_CODES = new Set(["UA", "KZ", "UZ", "KG"]);

export function normalizeCountryName(country) {
  return String(country || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function countryUsesSpanish(country) {
  return SPANISH_COUNTRY_NAMES.has(normalizeCountryName(country));
}

export function countryUsesFrench(country) {
  return FRENCH_COUNTRY_NAMES.has(normalizeCountryName(country));
}

export function countryUsesRussian(country) {
  return RUSSIAN_COUNTRY_NAMES.has(normalizeCountryName(country));
}

export function countryCodeUsesSpanish(code) {
  return SPANISH_COUNTRY_CODES.has(String(code || "").trim().toUpperCase());
}

export function countryCodeUsesFrench(code) {
  return FRENCH_COUNTRY_CODES.has(String(code || "").trim().toUpperCase());
}

export function countryCodeUsesRussian(code) {
  return RUSSIAN_COUNTRY_CODES.has(String(code || "").trim().toUpperCase());
}

export function languageForCountry(country) {
  if (countryUsesSpanish(country)) return "es";
  if (countryUsesFrench(country)) return "fr";
  if (countryUsesRussian(country)) return "ru";
  return "";
}

export function languageForCountryCode(code) {
  if (countryCodeUsesSpanish(code)) return "es";
  if (countryCodeUsesFrench(code)) return "fr";
  if (countryCodeUsesRussian(code)) return "ru";
  return "";
}

export function browserPrefersSpanish() {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((language) => String(language || "").toLowerCase().startsWith("es"));
}

export function browserPreferredCampaignLanguage() {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (languages.some((language) => String(language || "").toLowerCase().startsWith("es"))) return "es";
  if (languages.some((language) => String(language || "").toLowerCase().startsWith("fr"))) return "fr";
  if (languages.some((language) => String(language || "").toLowerCase().startsWith("ru"))) return "ru";
  return "";
}

export function rememberSelectedCountry(country) {
  if (!country) return;
  localStorage.setItem("ff_selected_country", country);
  window.dispatchEvent(new CustomEvent("ff-country-selected", { detail: { country } }));
}
