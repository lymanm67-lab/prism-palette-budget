import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock } from 'lucide-react';
import {
  monthlySavings,
  upcomingRenewalRisks,
  useSaveFreedCashSource,
  type FreedCashSource,
} from '@/hooks/use-freed-cash';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function RenewalWatch({ sources }: { sources: FreedCashSource[] }) {
  const save = useSaveFreedCashSource();
  const [selectedId, setSelectedId] = useState<string>('');
  const [renewalDate, setRenewalDate] = useState('');
  const [renewalAmount, setRenewalAmount] = useState('');

  const risks = useMemo(() => upcomingRenewalRisks(sources, 90), [sources]);
  const atRisk = sources.filter((s) => s.reactivation_risk === 'high' && s.status === 'verified');

  const saveRenewal = async () => {
    if (!selectedId) return;
    await save.mutateAsync({
      id: selectedId,
      next_renewal_date: renewalDate || null,
      renewal_amount: renewalAmount ? Number(renewalAmount) : null,
    });
    setSelectedId('');
    setRenewalDate('');
    setRenewalAmount('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Renewals & pause endings (next 90 days)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Savings that could quietly reverse. Review each before the date arrives.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {risks.length === 0 && (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No renewals or pause endings scheduled in the next 90 days.
            </p>
          )}
          {risks.map(({ source, label, date }) => (
            <div
              key={`${source.id}-${label}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{source.name}</span>
                  <Badge variant="secondary">{label}</Badge>
                  <Badge variant="outline">{date}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmt(monthlySavings(source))}/mo at stake
                  {source.renewal_amount != null
                    ? ` · renews at ${fmt(Number(source.renewal_amount))}`
                    : ''}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => save.mutate({ id: source.id, status: 'reversed' })}>
                Mark reversed
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Set a renewal date</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Source</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a freed cash source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rw-date">Next renewal</Label>
            <Input id="rw-date" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rw-amt">Renewal amount</Label>
            <Input
              id="rw-amt"
              type="number"
              step="0.01"
              value={renewalAmount}
              onChange={(e) => setRenewalAmount(e.target.value)}
            />
          </div>
          <div className="sm:col-span-4">
            <Button size="sm" onClick={saveRenewal} disabled={!selectedId || save.isPending}>
              Save renewal
            </Button>
          </div>
        </CardContent>
      </Card>

      {atRisk.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">High reactivation risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {atRisk.map((s) => (
              <p key={s.id} className="text-muted-foreground">
                <span className="font-medium text-foreground">{s.name}</span> — {fmt(monthlySavings(s))}/mo could
                return. Keep this dollar unassigned until the risk drops.
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
