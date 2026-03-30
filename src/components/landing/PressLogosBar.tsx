import { motion } from 'framer-motion';

const PRESS_LOGOS = [
  { name: 'NerdWallet', opacity: 0.5 },
  { name: 'PCMag', opacity: 0.5 },
  { name: 'The Verge', opacity: 0.5 },
  { name: 'Wirecutter', opacity: 0.5 },
  { name: 'Forbes', opacity: 0.5 },
];

const PressLogosBar = () => {
  return (
    <section className="relative py-8 sm:py-12 border-b border-white/5">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/30 mb-6"
        >
          Trusted by finance-forward professionals
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {PRESS_LOGOS.map((logo, i) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-2 text-white/25 hover:text-white/40 transition-colors duration-300"
            >
              <div className="flex items-center justify-center h-8 px-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <span className="text-sm font-bold tracking-tight whitespace-nowrap">{logo.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-5 text-[10px] text-white/20"
        >
          Review submissions in progress — launching Q2 2026
        </motion.p>
      </div>
    </section>
  );
};

export default PressLogosBar;
