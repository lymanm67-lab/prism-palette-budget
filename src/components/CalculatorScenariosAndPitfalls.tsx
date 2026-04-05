import { useState } from 'react';
import { AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Volume2, Pause, Play, Square, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/hooks/use-tts';
import { cn } from '@/lib/utils';

interface CalculatorScenariosAndPitfallsProps {
  scenarios: { title: string; description: string }[];
  pitfalls: { title: string; description: string }[];
  tips?: { title: string; description: string }[];
}

export default function CalculatorScenariosAndPitfalls({ scenarios, pitfalls, tips }: CalculatorScenariosAndPitfallsProps) {
  const [expanded, setExpanded] = useState(false);
  const { speak, pause, resume, stop, isSpeaking, isPaused } = useTTS();

  const generateTTSScript = () => {
    const scenariosText = scenarios.map(s => `Real-World Scenario: ${s.title}. ${s.description}`).join('. ');
    const pitfallsText = pitfalls.map(p => `Pitfall to Avoid: ${p.title}. ${p.description}`).join('. ');
    const tipsText = tips?.length ? tips.map(t => `Optimization Tip: ${t.title}. ${t.description}`).join('. ') : '';
    return `Scenarios and Pitfalls to Avoid. ${scenariosText}. ${pitfallsText}.${tipsText ? ` Tips to Optimize. ${tipsText}` : ''}`;
  };

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-3 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-prism-amber" />
          Scenarios, Pitfalls & Tips
        </span>
        <div className="flex items-center gap-1">
          {expanded && (
            <>
              {!isSpeaking && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(generateTTSScript());
                  }}
                  title="Listen"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {isSpeaking && !isPaused && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    pause();
                  }}
                  title="Pause"
                >
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              )}
              {isSpeaking && isPaused && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    resume();
                  }}
                  title="Resume"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              {isSpeaking && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    stop();
                  }}
                  title="Stop"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
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

          {/* Tips to Optimize */}
          {tips && tips.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-prism-lime" /> Tips to Optimize
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {tips.map((t, i) => (
                  <div key={i} className="rounded-lg bg-prism-lime/5 border border-prism-lime/20 p-2.5 space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
