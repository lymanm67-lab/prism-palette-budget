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
        </div>

        {qualifying !== null && (
          <div className="mt-5 pt-5 border-t border-border/40 flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 px-4 py-2.5 shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Qualifying Mortgage FICO</p>
              <p className="font-display text-3xl font-extrabold prism-gradient-text leading-tight">{qualifying}</p>
              <p className="text-[10px] text-muted-foreground">middle of 3 bureaus{scores.asOf ? ` · ${scores.asOf}` : ''}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['Equifax', 'TransUnion', 'Experian'] as const).map((b) =>
                typeof scores[b] === 'number' ? (
                  <div key={b} className={`rounded-md border px-3 py-2 ${scores[b] === qualifying ? 'border-prism-amber/50 bg-prism-amber/5' : 'border-border/40 bg-card/40'}`}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{b} · {BUREAU_MODEL[b]}</p>
                    <p className="font-display text-base font-bold">{scores[b]}</p>
                  </div>
                ) : null
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 lg:ml-auto">
              {programs.map((p) => (
                <span
                  key={p.program}
                  title={p.note}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${p.ok ? 'border-prism-teal/40 bg-prism-teal/10 text-prism-teal' : 'border-border/50 bg-muted/40 text-muted-foreground line-through'}`}
                >
                  {p.ok ? '✓' : '✕'} {p.program}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

