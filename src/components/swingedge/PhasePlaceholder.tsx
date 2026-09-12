import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import HowToUse from '@/components/swingedge/HowToUse';

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
 * proven before they are called finished.
 */
export default function PhasePlaceholder({ title, phase, purpose, willInclude, gate, howTo, howToTips }: Props) {
  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this screen will do</CardTitle>
            <CardDescription>Scope is fixed so it cannot quietly grow.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {willInclude.map((item) => (
                <li key={item} className="flex gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-prism-teal" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it proves it works</CardTitle>
            <CardDescription>These checks must pass before this phase is called done.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {gate.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

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
