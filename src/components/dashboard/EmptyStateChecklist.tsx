import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Tags, PiggyBank, ArrowRight, Sparkles } from 'lucide-react';

/**
 * Empty-state 3-step checklist shown on Dashboard when no accounts exist.
 * Guides new users: Connect → Categorize → Budget.
 */
export function EmptyStateChecklist() {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Building2,
      title: 'Connect accounts',
      desc: 'Add bank or credit accounts to see your real balance.',
      cta: 'Add account',
      to: '/accounts',
    },
    {
      icon: Tags,
      title: 'Categorize transactions',
      desc: 'Review the auto-tagged transactions so reports stay accurate.',
      cta: 'Open transactions',
      to: '/transactions',
    },
    {
      icon: PiggyBank,
      title: 'Set a budget',
      desc: 'Pick a method (zero-based, 60/20/10/10, or conscious spending).',
      cta: 'Build budget',
      to: '/budgets',
    },
  ];

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Get started in 3 steps
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Finish these to unlock Safe-to-Spend, forecasts, and insights.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="flex flex-col rounded-lg border border-border bg-card/60 p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </div>
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{s.title}</span>
                </div>
                <p className="text-xs text-muted-foreground flex-1 mb-3">{s.desc}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={() => navigate(s.to)}
                >
                  {s.cta} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
