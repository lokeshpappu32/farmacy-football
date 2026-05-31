import { useEffect, useState } from "react";

const brokenImages = new Set();

const TEAM_FLAG_CODES = {
  afghanistan: "af",
  albania: "al",
  argentina: "ar",
  australia: "au",
  austria: "at",
  bahrain: "bh",
  bangladesh: "bd",
  belgium: "be",
  "bosnia and herzegovina": "ba",
  brazil: "br",
  cambodia: "kh",
  cameroon: "cm",
  canada: "ca",
  "cape verde islands": "cv",
  "cape verde": "cv",
  chile: "cl",
  china: "cn",
  colombia: "co",
  croatia: "hr",
  "congo dr": "cd",
  "cote d ivoire": "ci",
  curacao: "cw",
  "czech republic": "cz",
  czechia: "cz",
  denmark: "dk",
  "dr congo": "cd",
  ecuador: "ec",
  egypt: "eg",
  england: "gb-eng",
  ethiopia: "et",
  france: "fr",
  germany: "de",
  ghana: "gh",
  greece: "gr",
  haiti: "ht",
  "hong kong": "hk",
  india: "in",
  indonesia: "id",
  iran: "ir",
  iraq: "iq",
  ireland: "ie",
  italy: "it",
  "ivory coast": "ci",
  japan: "jp",
  jordan: "jo",
  kenya: "ke",
  kuwait: "kw",
  lebanon: "lb",
  malaysia: "my",
  mexico: "mx",
  morocco: "ma",
  myanmar: "mm",
  nepal: "np",
  netherlands: "nl",
  "new zealand": "nz",
  nigeria: "ng",
  norway: "no",
  oman: "om",
  pakistan: "pk",
  panama: "pa",
  paraguay: "py",
  philippines: "ph",
  portugal: "pt",
  qatar: "qa",
  russia: "ru",
  "saudi arabia": "sa",
  scotland: "gb-sct",
  senegal: "sn",
  singapore: "sg",
  "south africa": "za",
  "south korea": "kr",
  spain: "es",
  "sri lanka": "lk",
  sweden: "se",
  switzerland: "ch",
  taiwan: "tw",
  tanzania: "tz",
  thailand: "th",
  tunisia: "tn",
  turkey: "tr",
  uganda: "ug",
  ukraine: "ua",
  "united arab emirates": "ae",
  "united kingdom": "gb",
  uruguay: "uy",
  usmnt: "us",
  usa: "us",
  "united states": "us",
  "united states of america": "us",
  uzbekistan: "uz",
  vietnam: "vn",
  zambia: "zm",
  zimbabwe: "zw",
};

function normalizeTeamName(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function flagFromName(name) {
  const normalized = normalizeTeamName(name);
  const code = TEAM_FLAG_CODES[normalized];
  return code ? `https://flagcdn.com/${code}.svg` : null;
}

export default function TeamLogo({ src, fallbackSrc, name, compact = false, size = "default", showName = true }) {
  const resolvedFallback = fallbackSrc || flagFromName(name);
  const [currentSrc, setCurrentSrc] = useState(src);
  const isSmall = size === "sm";
  const logoSizeClass = isSmall ? "h-9 w-9" : compact ? "h-12 w-12" : "h-20 w-20";
  const nameClass = isSmall || compact ? "text-xs" : "text-sm";
  const initialsClass = isSmall ? "text-xs" : compact ? "text-sm" : "text-xl";
  const isFlag = currentSrc && (currentSrc === resolvedFallback || currentSrc.includes("flagcdn.com"));

  useEffect(() => {
    if (src && !brokenImages.has(src)) {
      setCurrentSrc(src);
      return;
    }
    setCurrentSrc(resolvedFallback && !brokenImages.has(resolvedFallback) ? resolvedFallback : null);
  }, [src, resolvedFallback]);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`flex ${logoSizeClass} items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white shadow-glow ${isFlag ? "p-0" : isSmall ? "p-1" : compact ? "p-2" : "p-3"}`}>
        {currentSrc ? (
          <img
            src={currentSrc}
            alt={name}
            className={isFlag ? "h-full w-full rounded-full object-cover" : "max-h-full max-w-full object-contain"}
            onError={() => {
              brokenImages.add(currentSrc);
              if (resolvedFallback && currentSrc !== resolvedFallback && !brokenImages.has(resolvedFallback)) {
                setCurrentSrc(resolvedFallback);
              } else {
                setCurrentSrc(null);
              }
            }}
          />
        ) : (
          <span className={`${initialsClass} font-black text-pitch`}>{name?.slice(0, 2)}</span>
        )}
      </div>
      {showName && <span className={`${nameClass} font-bold leading-tight`}>{name}</span>}
    </div>
  );
}
