import { normalizeCountryName } from "./language";

export function isEgyptCountry(country) {
  return normalizeCountryName(country) === "egypt";
}
