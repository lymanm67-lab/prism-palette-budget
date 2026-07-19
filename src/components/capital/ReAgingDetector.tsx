import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInMonths, format } from 'date-fns';

/**
 * Re-aging: a furnisher illegally resetting the Date of First Delinquency (DoFD).
 * Under FCRA § 605(c), the DoFD determines when a negative item drops off (7yr).
 * Signs: reported DoFD differs from actual DoFD, or a stale account suddenly
 * shows a recent DoFD, or DoFD moves later after being reported.
 */
export default function ReAgingDetector() {
  const { accounts } = useCreditAccounts();
  const [savingId, setSavingId] = useState<string | null>(null);

  const analyzed = useMemo(() => {
    return accounts
      .filter(a => a.account_status && /charge|collection|late|delin/i.test(a.account_status))
      .map(a => {
        const actual = (a as any).date_of_first_delinquency as string | null;
        const reported = (a as any).reported_first_delinquency as string | null;
        const suspected = (a as any).reaging_suspected as boolean | undefined;
        let flag: null | { kind: string; detail: string } = null;
        if (actual && reported) {
          const diff = differenceInMonths(new Date(reported), new Date(actual));
          if (Math.abs(diff) >= 6) flag = { kind: 'DoFD Mismatch', detail: `Reported DoFD is ${diff > 0 ? diff + ' months later' : Math.abs(diff) + ' months earlier'} than actual` };
        }
        if (!flag && reported && a.date_opened) {
          const monthsOpen = differenceInMonths(new Date(reported), new Date(a.date_opened));
          if (monthsOpen < 3) flag = { kind: 'Suspicious DoFD', detail: 'Reported DoFD is very close to account open date' };
        }
        return { account: a, actual, reported, suspected: !!suspected, flag };
      });
  }, [accounts]);

  const flagged = analyzed.filter(x => x.flag || x.suspected);

  const markSuspected = async (id: string, val: boolean) => {
    setSavingId(id);
    const { error } = await (supabase as any).from('credit_accounts')
      .update({ reaging_suspected: val }).eq('id', id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(val ? 'Flagged for dispute' : 'Cleared');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          Re-Aging Detector (FCRA § 605)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Detects furnishers illegally resetting the Date of First Delinquency to keep negative items on your report past the 7-year limit.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyzed.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No collection or charge-off accounts to analyze. Import a credit report to enable detection.
          </p>
        )}
        {analyzed.map(({ account, actual, reported, suspected, flag }) => (
          <div key={account.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{account.account_name}</div>
                <div className="text-xs text-muted-foreground">
                  {account.bureau} · {account.account_status} · Opened {account.date_opened || '—'}
                </div>
              </div>
              {flag && <Badge className="bg-amber-500/15 text-amber-600"><AlertTriangle className="h-3 w-3 mr-1" />{flag.kind}</Badge>}
              {!flag && suspected && <Badge className="bg-amber-500/15 text-amber-600">Manually flagged</Badge>}
              {!flag && !suspected && <Badge className="bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Actual DoFD:</span> {actual ? format(new Date(actual), 'MMM d, yyyy') : '—'}</div>
              <div><span className="text-muted-foreground">Reported DoFD:</span> {reported ? format(new Date(reported), 'MMM d, yyyy') : '—'}</div>
            </div>
            {flag && <p className="text-xs text-amber-700 dark:text-amber-400">{flag.detail}</p>}
            <div className="flex gap-2">
              {!suspected ? (
                <Button size="sm" variant="outline" onClick={() => markSuspected(account.id, true)} disabled={savingId === account.id}>
                  Flag for Dispute
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => markSuspected(account.id, false)} disabled={savingId === account.id}>
                  Clear Flag
                </Button>
              )}
            </div>
          </div>
        ))}
        {flagged.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {flagged.length} account(s) flagged. Create a dispute citing <strong>FCRA § 605(c)</strong> (re-aging violation) — the negative item must be deleted if the actual DoFD can't be verified.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
