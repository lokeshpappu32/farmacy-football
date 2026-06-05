import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";
import { timeLeft } from "../utils/datetime";

export default function CountdownTimer({ target }) {
  const [left, setLeft] = useState(timeLeft(target));
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setLeft(timeLeft(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {["days", "hours", "minutes", "seconds"].map((key) => (
        <motion.div key={key} layout className="min-w-0 overflow-hidden rounded-xl border border-gold/20 bg-black/30 px-1.5 py-3 text-center shadow-glow sm:p-3">
          <div className="text-xl font-black leading-none text-gold sm:text-2xl">{String(left[key]).padStart(2, "0")}</div>
          <div className="mt-1 truncate text-[8px] font-bold uppercase tracking-normal text-white/60 min-[390px]:text-[9px] sm:text-[10px] sm:tracking-widest">{t(`time.${key}`, key)}</div>
        </motion.div>
      ))}
    </div>
  );
}
