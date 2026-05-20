import { motion, AnimatePresence } from "framer-motion";

export default function Toast({ message, tone = "gold", onClose }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-glow ${
            tone === "error" ? "border-ember/50 bg-ember/20" : "border-gold/50 bg-gold/20"
          }`}
          onClick={onClose}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
