import LanguageTranslator from "./LanguageTranslator";

export default function AppFooter() {
  return (
    <div className="relative z-10 mt-auto pt-8">
      <LanguageTranslator />
      <footer className="border-t border-white/10 bg-black/45 px-4 py-4 text-center text-xs font-semibold text-white md:text-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1.5">
          <span>© {new Date().getFullYear()} DeepAI Automation Technologies Pvt Ltd. All rights reserved.</span>
          <span className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-3">
            <a className="text-gold transition hover:text-white" href="https://www.deepaiautomation.com" target="_blank" rel="noreferrer">
              www.deepaiautomation.com
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
