import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

export default function Toast({ message, tone = "gold", onClose }) {
  return (
    <AnimatePresence>
      {message && (
        <div className="fixed left-0 right-0 top-20 z-50 flex justify-center px-4 pointer-events-none">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-glow ${
              tone === "error" ? "border-ember/50 bg-ember/20" : "border-gold/50 bg-gold/20"
            }`}
          >
            <span className="min-w-0 flex-1">{message}</span>
            <button
              type="button"
              className="relative z-10 rounded-full bg-black/20 p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClose?.();
              }}
              aria-label="Close message"
            >
              <FiX />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
