// A banner that watches a plan as it is built and speaks up on its own.
// Nothing here asks an AI model: every line comes from a rule the owner wrote or
// a number measured on the screen.

import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Guardrail, GuardrailTone } from '@/lib/swingedge/guardrails';

const TONE_STYLE: Record<GuardrailTone, string> = {
  STOP: 'border-destructive/50 bg-destructive/5',
  CAUTION: 'border-prism-amber/50 bg-prism-amber/5',
  NOTE: 'border-border bg-muted/30',
};

const TONE_LABEL: Record<GuardrailTone, string> = {
  STOP: 'Stop and fix',
  CAUTION: 'Think twice',
  NOTE: 'Watch this',
};

const ToneIcon = ({ tone }: { tone: GuardrailTone }) =>
  tone === 'STOP' ? (
    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
  ) : tone === 'CAUTION' ? (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-prism-amber" />
  ) : (
    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
  );

export default function GuardrailBanner({
  guardrails,
  allClearText = 'Nothing is drifting. This plan matches the rules you wrote.',
  className,
}: {
  guardrails: Guardrail[];
  allClearText?: string;
  className?: string;
}) {
  if (guardrails.length === 0) {
    return (
      <Alert className={cn('border-prism-lime/50 bg-prism-lime/5', className)}>
        <CheckCircle2 className="h-4 w-4 text-prism-lime" />
        <AlertTitle>Mentor is watching</AlertTitle>
        <AlertDescription>{allClearText}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {guardrails.map((g) => (
        <Alert key={g.key} className={TONE_STYLE[g.tone]}>
          <div className="flex gap-2">
            <ToneIcon tone={g.tone} />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTitle className="mb-0">{g.title}</AlertTitle>
                <Badge variant="outline" className="text-[10px]">
                  {TONE_LABEL[g.tone]}
                </Badge>
              </div>
              <AlertDescription className="space-y-1">
                <p>{g.detail}</p>
                <p className="text-xs font-medium text-foreground">Do this: {g.action}</p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}
