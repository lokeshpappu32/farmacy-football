import { useLanguage } from "../context/LanguageContext";
import { isEgyptCountry } from "../utils/branding";

export default function BrandHeaderLogos({ className = "", logoClassName = "" }) {
  const { currentCountry } = useLanguage();
  const showElixir = isEgyptCountry(currentCountry);

  return (
    <div className={`flex items-center justify-center gap-3 sm:gap-4 ${className}`}>
      <img src="/hetero-logo.png" alt="Hetero" className={`object-contain mix-blend-screen ${logoClassName}`} />
      {showElixir && (
        <img src="/images/client-logos/elixir.png" alt="ELIXIR" className={`object-contain ${logoClassName}`} />
      )}
    </div>
  );
}

export function SplitBrandHeaderLogos({ className = "", logoClassName = "" }) {
  const { currentCountry } = useLanguage();
  const showElixir = isEgyptCountry(currentCountry);

  return (
    <div className={`pointer-events-none flex items-start ${showElixir ? "justify-between" : "justify-end"} ${className}`}>
      <img src="/hetero-logo.png" alt="Hetero" className={`object-contain mix-blend-screen ${logoClassName}`} />
      {showElixir && (
        <img src="/images/client-logos/elixir.png" alt="ELIXIR" className={`object-contain ${logoClassName}`} />
      )}
    </div>
  );
}
