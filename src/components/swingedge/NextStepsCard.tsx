import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface NextStep {
  /** What the person should do next, in plain words. */
  label: string;
  /** Where that step happens. */
  to: string;
  /** Button text. */
  cta: string;
}

interface Props {
  /** One sentence framing what has just been finished on this page. */
  summary: string;
  steps: NextStep[];
  title?: string;
  className?: string;
}

/**
 * Shared "What to do next" card so no trading page ends without telling the
 * person where the workflow continues.
 */
export default function NextStepsCard({ summary, steps, title = 'What to do next', className }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{summary}</p>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.to + s.cta} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="flex-1 text-muted-foreground">{s.label}</span>
              <Button asChild size="sm" variant="outline">
                <Link to={s.to}>
                  {s.cta} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
