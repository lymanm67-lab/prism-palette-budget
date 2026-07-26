import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Sparkles } from 'lucide-react';
import { loadMortgageFico, qualifyingFico, eligiblePrograms, BUREAU_MODEL } from '@/lib/home-buying/mortgage-fico';

interface ReadinessHeroProps {
  checklistPct: number;
  metrics: { label: string; value: string; pct: number; color: string }[];
}

export default function ReadinessHero({ checklistPct, metrics }: ReadinessHeroProps) {
  const overall = Math.round(
    (checklistPct + metrics.reduce((s, m) => s + m.pct, 0)) / (metrics.length + 1)
  );
  const scores = loadMortgageFico();
  const qualifying = qualifyingFico(scores);
  const programs = qualifying !== null ? eligiblePrograms(qualifying) : [];


  return (
    <Card className="prism-card-shine border-border/50 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-prism-teal to-prism-amber">
              <Home className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Overall Readiness</p>
              <p className="font-display text-4xl font-extrabold prism-gradient-text">{overall}%</p>
              {overall >= 80 && (
                <p className="text-xs text-prism-teal flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3" /> You're in great shape
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
            {[{ label: 'Checklist', value: `${Math.round(checklistPct)}%`, pct: checklistPct, color: 'from-prism-teal to-prism-sky' }, ...metrics.map((m) => ({ ...m, color: `from-${m.color} to-${m.color}` }))].slice(0, 5).map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border/40 bg-card/40 p-3"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">{m.label}</p>
                <p className="font-display text-lg font-bold">{m.value}</p>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-prism-teal to-prism-amber" style={{ width: `${Math.min(100, m.pct)}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
