const SPANISH_COUNTRY_NAMES = new Set([
  "chile",
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

const SPANISH_COUNTRY_CODES = new Set(["CL", "CR", "DO", "SV", "GT", "HN", "MX", "NI", "PA", "PE"]);

export function normalizeCountryName(country) {
  return String(country || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function countryUsesSpanish(country) {
  return SPANISH_COUNTRY_NAMES.has(normalizeCountryName(country));
}

export function countryCodeUsesSpanish(code) {
  return SPANISH_COUNTRY_CODES.has(String(code || "").trim().toUpperCase());
}

export function browserPrefersSpanish() {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((language) => String(language || "").toLowerCase().startsWith("es"));
}

export function rememberSelectedCountry(country) {
  if (!country) return;
  localStorage.setItem("ff_selected_country", country);
  window.dispatchEvent(new CustomEvent("ff-country-selected", { detail: { country } }));
}
