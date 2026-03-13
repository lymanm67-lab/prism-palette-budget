import { useState } from 'react';
import { AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorScenariosAndPitfallsProps {
  scenarios: { title: string; description: string }[];
  pitfalls: { title: string; description: string }[];
}

export default function CalculatorScenariosAndPitfalls({ scenarios, pitfalls }: CalculatorScenariosAndPitfallsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-3 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-prism-amber" />
          Scenarios & Pitfalls to Avoid
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-4">
          {/* Scenarios */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-prism-teal" /> Real-World Scenarios
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {scenarios.map((s, i) => (
                <div key={i} className="rounded-lg bg-prism-teal/5 border border-prism-teal/20 p-2.5 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pitfalls */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Pitfalls to Avoid
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {pitfalls.map((p, i) => (
                <div key={i} className="rounded-lg bg-destructive/5 border border-destructive/20 p-2.5 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
