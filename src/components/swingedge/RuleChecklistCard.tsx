// Shows the owner's own rules checked against the plan in front of them.

import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RuleCheck } from '@/lib/swingedge/rulebook';

const Icon = ({ status }: { status: RuleCheck['status'] }) =>
  status === 'PASS' ? (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
  ) : status === 'FAIL' ? (
    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
  ) : (
    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
  );

export default function RuleChecklistCard({
  checks,
  className,
}: {
  checks: RuleCheck[];
  className?: string;
}) {
  const failing = checks.filter((c) => c.status === 'FAIL').length;

  return (
    <Card className={cn(failing > 0 && 'border-destructive/50', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your rules, checked</CardTitle>
        <CardDescription>
          {checks.length === 0
            ? 'You have not switched on any rules yet.'
            : failing === 0
              ? 'Every rule you switched on is met.'
              : `${failing} of your rules ${failing === 1 ? 'is' : 'are'} not met right now.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.key} className="flex gap-2 text-sm">
              <Icon status={c.status} />
              <span className="min-w-0">
                <span
                  className={cn(
                    'font-medium',
                    c.status === 'FAIL' && c.tone === 'STOP' && 'text-destructive',
                  )}
                >
                  {c.sentence}
                </span>
                <span className="block text-xs text-muted-foreground">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" size="sm">
          <Link to="/swingedge/rulebook">Edit my rules</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
