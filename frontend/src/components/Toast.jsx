import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";

export default function Toast({ message, tone = "gold", onClose }) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {message && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className={`w-full max-w-md rounded-2xl border p-6 text-center text-white shadow-2xl ${
              tone === "error" ? "border-ember/50 bg-[#1b0808]" : "border-gold/45 bg-[#07120d]"
            }`}
          >
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-full bg-white/10 p-2 text-xl leading-none text-white/80 transition hover:bg-white/20 hover:text-white"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClose?.();
                }}
                aria-label="Close message"
              >
                <FiX />
              </button>
            </div>
            <p className="px-2 pb-4 pt-2 text-lg font-semibold leading-7">{message}</p>
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-8 py-3 font-black uppercase text-white"
              onClick={onClose}
            >
              {t("common.close", "Close")}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
