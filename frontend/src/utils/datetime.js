export function formatDateTime(value) {
  if (!value) return "TBA";
  const normalizedValue = normalizeUtcValue(value);
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value) {
  if (!value) return "TBA";
  const normalizedValue = normalizeUtcValue(value);
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export function addHours(value, hours) {
  const normalizedValue = normalizeUtcValue(value);
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + hours * 3600000);
}

function normalizeUtcValue(value) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  const hasTime = trimmed.includes("T");
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  return hasTime && !hasTimezone ? `${trimmed}Z` : trimmed;
}

export function timeLeft(target) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, total: diff };
}
