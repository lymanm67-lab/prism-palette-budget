import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Sparkles, Check, X, Loader2 } from 'lucide-react';
import { useAppDevCutoff, useAppDevOverrides, useDecideOverride, useCreditLog, useDeleteCreditEntry } from '@/hooks/use-app-dev-cutoff';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OverrideRequestModal } from '@/components/app-dev/OverrideRequestModal';
import { CreditLogQuickEntry } from '@/components/app-dev/CreditLogQuickEntry';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
  });
}

const fmtUsd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function statusColor(pct: number) {
  if (pct >= 100) return 'bg-prism-orange';
  if (pct >= 70) return 'bg-prism-amber';
  return 'bg-prism-teal';
}

export default function AppDevCutoffCard() {
  const cutoff = useAppDevCutoff();
  const { data: overrides } = useAppDevOverrides();
  const { data: creditLog } = useCreditLog(cutoff.periodStart);
  const { data: isAdmin } = useIsAdmin();
  const decide = useDecideOverride();
  const deleteEntry = useDeleteCreditEntry();
  const [overrideOpen, setOverrideOpen] = useState(false);

  if (!cutoff.isEnabled) return null;

  const pending = (overrides || []).filter((o) => o.status === 'pending');

  return (
    <Card className="border-prism-amber/30 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className={cn('h-5 w-5', cutoff.status === 'over' ? 'text-prism-orange' : cutoff.status === 'warn' ? 'text-prism-amber' : 'text-prism-teal')} />
              App-Dev Cutoff
              {cutoff.overrideActive && (
                <Badge variant="outline" className="border-prism-orange/40 text-prism-orange ml-1">override active</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{cutoff.message}</p>
          </div>
          <Link to="/settings?tab=app-dev" className="text-xs text-muted-foreground hover:text-foreground underline">Settings</Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spend bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Spend</span>
            <span className="font-medium">{fmtUsd(cutoff.spendUsed)} / {fmtUsd(cutoff.spendLimit)}</span>
          </div>
          <Progress value={Math.min(100, cutoff.spendPct)} className="h-2" indicatorClassName={statusColor(cutoff.spendPct)} />
        </div>

        {/* Credits bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Build credits</span>
            <span className="font-medium">{cutoff.creditsUsed.toLocaleString()} / {cutoff.creditLimit.toLocaleString()}</span>
          </div>
          <Progress value={Math.min(100, cutoff.creditPct)} className="h-2" indicatorClassName={statusColor(cutoff.creditPct)} />
        </div>

        {/* Quick log */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Log credits used
            </p>
            <p className="text-xs font-medium">
              This month: <span className="text-foreground">{cutoff.creditsUsed.toLocaleString()}</span>
              <span className="text-muted-foreground"> / {cutoff.creditLimit.toLocaleString()}</span>
            </p>
          </div>
          <CreditLogQuickEntry monthTotal={cutoff.creditsUsed} />
        </div>

        {/* Recent log */}
        {creditLog && creditLog.length > 0 && (
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {creditLog.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                <span>{e.date} · {e.credits_used} cr{e.note ? ` · ${e.note}` : ''}</span>
                <button
                  onClick={() => deleteEntry.mutate(e.id)}
                  className="hover:text-foreground"
                  aria-label="delete entry"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Over-limit action */}
        {cutoff.status === 'over' && !cutoff.overrideActive && (
          <Button variant="outline" className="w-full border-prism-orange/40" onClick={() => setOverrideOpen(true)}>
            Request emergency override
          </Button>
        )}

        {/* Admin: pending requests */}
        {isAdmin && pending.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground">Pending override requests</p>
            {pending.map((o) => (
              <div key={o.id} className="rounded-md border border-border/60 p-2 text-xs space-y-2">
                <p className="text-foreground">{o.reason}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={decide.isPending}
                    onClick={async () => {
                      await decide.mutateAsync({ id: o.id, status: 'approved' });
                      toast.success('Override approved');
                    }}
                  >
                    {decide.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    disabled={decide.isPending}
                    onClick={async () => {
                      await decide.mutateAsync({ id: o.id, status: 'denied' });
                      toast.info('Override denied');
                    }}
                  >
                    <X className="h-3 w-3 mr-1" /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <OverrideRequestModal open={overrideOpen} onOpenChange={setOverrideOpen} />
    </Card>
  );
}
