import LanguageTranslator from "./LanguageTranslator";

export default function AppFooter({ compact = false }) {
  return (
    <div className={`relative z-10 mt-auto ${compact ? "pt-2" : "pt-8"}`}>
      <LanguageTranslator />
      <footer className={`border-t border-white/10 bg-black/45 px-4 text-center text-xs font-semibold text-white md:text-sm ${compact ? "py-2" : "py-4"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <span>Copyright © 2026 Hetero. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
