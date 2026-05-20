import { motion } from "framer-motion";

export default function StatCard({ label, value, icon: Icon }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-white/60">{label}</span>
        {Icon && <Icon className="text-gold" size={22} />}
      </div>
      <div className="text-3xl font-black">{value}</div>
    </motion.div>
  );
}
