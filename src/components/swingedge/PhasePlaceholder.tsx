import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import HowToUse from '@/components/swingedge/HowToUse';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';

interface Props {
  title: string;
  phase: string;
  purpose: string;
  willInclude: string[];
  gate: string[];
  howTo?: string[];
  howToTips?: string[];
}

/**
 * Every SwingEdge page is reachable from the first release. Pages whose build
 * phase has not been reached explain exactly what they will do and what must be
 * proven before they are called finished. Sections collapse so the page stays short.
 */
export default function PhasePlaceholder({ title, phase, purpose, willInclude, gate, howTo, howToTips }: Props) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <Badge variant="outline" className="gap-1 border-prism-sky/50 text-prism-sky">
            <Lock className="h-3 w-3" />
            {phase}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{purpose}</p>
      </div>

      {howTo && howTo.length > 0 ? (
        <HowToUse
          steps={howTo}
          tips={howToTips}
          description="This is how the screen will work once it is switched on, so you can learn the routine now."
        />
      ) : null}

      <CollapsibleSection
        id={`${slug}-will-do`}
        title="What this screen will do"
        description="Scope is fixed so it cannot quietly grow."
      >
        <ul className="space-y-2 pt-1 text-sm">
          {willInclude.map((item) => (
            <li key={item} className="flex gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-prism-teal" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        id={`${slug}-gate`}
        title="How it proves it works"
        description="These checks must pass before this phase is called done."
      >
        <ul className="space-y-2 pt-1 text-sm">
          {gate.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            In the meantime, the Trading Dashboard and market data settings are fully usable on demo data.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/swingedge">Trading Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/swingedge/settings">Market data settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
