import LanguageTranslator from "./LanguageTranslator";
import { useLanguage } from "../context/LanguageContext";
import { isEgyptCountry } from "../utils/branding";

const clientLogos = [
  { src: "/images/client-logos/amarox.png", alt: "Amarox" },
  { src: "/images/client-logos/annora.png", alt: "Annora" },
  { src: "/images/client-logos/camber.png", alt: "Camber" },
  { src: "/images/client-logos/makn3.png", alt: "Makn3" },
  { src: "/images/client-logos/seven-pharma.png", alt: "Seven Pharma" },
];

export default function AppFooter({ compact = false, showClientLogos = false, showTranslator = true }) {
  const { currentCountry, t } = useLanguage();
  const showLogoStrip = showClientLogos && !isEgyptCountry(currentCountry);
  return (
    <div className={`relative z-10 mt-auto ${compact ? "pt-2" : "pt-8"}`}>
      {showTranslator && <LanguageTranslator />}
      {showLogoStrip && (
        <div className="mx-auto mb-2 w-[calc(100%-1rem)] max-w-4xl rounded-lg border border-white/20 bg-white px-5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,.22)] sm:w-[calc(100%-2rem)] sm:px-8">
          <div className="grid grid-cols-5 items-center justify-items-center gap-x-5 gap-y-2 sm:gap-x-10 md:gap-x-12">
            {clientLogos.map((logo) => (
              <div key={logo.src} className="flex h-7 w-full min-w-0 max-w-[46px] items-center justify-center sm:h-10 sm:max-w-[88px] md:max-w-[104px]">
                <img src={logo.src} alt={logo.alt} className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mx-auto max-w-7xl px-4 pb-1 text-center text-[8px] font-medium leading-tight text-[#ffffff4d]">
        {t("footer.disclaimer", "Disclaimer: By participating, you acknowledge and accept the applicable Terms, Conditions, and platform policies.")}
      </p>
      <footer className={`border-t border-white/10 bg-black/45 px-4 text-center text-xs font-semibold text-white md:text-sm ${compact ? "py-1.5" : "py-4"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <span>{t("footer.copyright", "Copyright © 2026 Hetero. All rights reserved.")}</span>
        </div>
      </footer>
    </div>
  );
}
