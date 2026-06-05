import LanguageTranslator from "./LanguageTranslator";
import { useLanguage } from "../context/LanguageContext";

const clientLogos = [
  { src: "/images/client-logos/amarox.png", alt: "Amarox" },
  { src: "/images/client-logos/annora.png", alt: "Annora" },
  { src: "/images/client-logos/camber.png", alt: "Camber" },
  { src: "/images/client-logos/makn3.png", alt: "Makn3" },
  { src: "/images/client-logos/seven-pharma.png", alt: "Seven Pharma" },
];

export default function AppFooter({ compact = false, showClientLogos = false }) {
  const { t } = useLanguage();
  return (
    <div className={`relative z-10 mt-auto ${compact ? "pt-2" : "pt-8"}`}>
      <LanguageTranslator />
      {showClientLogos && (
        <div className="mx-auto mb-2 w-[calc(100%-1rem)] max-w-4xl rounded-lg border border-white/10 bg-black/35 px-4 py-2 backdrop-blur-sm sm:w-[calc(100%-2rem)] sm:px-6">
          <div className="grid grid-cols-5 items-center justify-items-center gap-3 sm:gap-6">
            {clientLogos.map((logo) => (
              <div key={logo.src} className="flex h-8 min-w-0 items-center justify-center sm:h-10">
                <img src={logo.src} alt={logo.alt} className="max-h-full max-w-[72px] object-contain sm:max-w-[96px]" />
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mx-auto max-w-7xl px-4 pb-1 text-center text-[8px] font-medium leading-tight text-[#ffffff4d]">
        {t("footer.disclaimer", "Disclaimer: By participating, you acknowledge and accept the applicable Terms, Conditions, and platform policies.")}
      </p>
      <footer className={`border-t border-white/10 bg-black/45 px-4 text-center text-xs font-semibold text-white md:text-sm ${compact ? "py-2" : "py-4"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <span>{t("footer.copyright", "Copyright © 2026 Hetero. All rights reserved.")}</span>
        </div>
      </footer>
    </div>
  );
}
