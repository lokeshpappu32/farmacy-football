import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { timeLeft } from "../utils/datetime";

export default function CountdownTimer({ target }) {
  const [left, setLeft] = useState(timeLeft(target));

  useEffect(() => {
    const timer = setInterval(() => setLeft(timeLeft(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="grid grid-cols-4 gap-2">
      {["days", "hours", "minutes", "seconds"].map((key) => (
        <motion.div key={key} layout className="rounded-xl border border-gold/20 bg-black/30 p-3 text-center shadow-glow">
          <div className="text-2xl font-black text-gold">{String(left[key]).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/60">{key}</div>
        </motion.div>
      ))}
    </div>
  );
}
