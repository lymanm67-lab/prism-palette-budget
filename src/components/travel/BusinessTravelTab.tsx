import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Briefcase, Plus, Trash2 } from 'lucide-react';
import { useTravelBusinessExpenses } from '@/hooks/use-travel-fund';
import { TravelTrip, money2, monthName } from '@/lib/travel/travelFund';

export function BusinessTravelTab({ trips }: { trips: TravelTrip[] }) {
  const { expenses, create, update, remove } = useTravelBusinessExpenses();
  const [draft, setDraft] = useState({
    trip_id: '', expense_date: new Date().toISOString().slice(0, 10), description: '',
    location: '', business_purpose: '', business_activity: '', amount: '', business_pct: '100',
    documentation: '',
  });

  const totals = useMemo(() => {
    const gross = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const business = expenses.reduce(
      (s, e) => s + Number(e.amount || 0) * (Number(e.business_pct || 0) / 100), 0,
    );
    return { gross, business, personal: gross - business };
  }, [expenses]);

  const mixedTrips = trips.filter((t) => t.trip_type === 'mixed');

  return (
    <div className="space-y-4">
      <Alert className="border-prism-orange/40 bg-prism-orange/5">
        <AlertTriangle className="h-4 w-4 text-prism-orange" />
        <AlertDescription className="text-xs">
          Personal vacation expenses are never automatically classified as business expenses. Each expense is
          classified independently — business activity during a trip does not make the whole trip deductible.
          All entries are marked <strong>CPA REVIEW REQUIRED</strong> until a CPA signs off.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total travel expenses logged" value={money2(totals.gross)} />
        <Stat label="Business portion" value={money2(totals.business)} />
        <Stat label="Personal portion" value={money2(totals.personal)} />
      </div>

      {mixedTrips.length > 0 && (
        <Card className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mixed purpose travel review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {mixedTrips.map((t) => (
              <p key={t.id} className="text-xs">
                <span className="font-medium">{t.destination}</span> — {monthName(t.travel_month)} {t.travel_year}:
                <span className="text-muted-foreground"> classify airfare, hotel, cruise, meals, transportation,
                  meetings, site visits, conferences and supplier meetings individually below.</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-prism-sky" /> Log business travel expense
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <F label="Trip">
              <Select
                value={draft.trip_id || 'none'}
                onValueChange={(v) => setDraft((d) => ({ ...d, trip_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Unlinked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unlinked</SelectItem>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.destination} {t.travel_year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Date">
              <Input className="h-9" type="date" value={draft.expense_date}
                onChange={(e) => setDraft((d) => ({ ...d, expense_date: e.target.value }))} />
            </F>
            <F label="Location">
              <Input className="h-9" value={draft.location}
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
            </F>
            <F label="Expense description">
              <Input className="h-9" value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </F>
            <F label="Amount">
              <Input className="h-9" type="number" value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} />
            </F>
            <F label="Business %">
              <Input className="h-9" type="number" min={0} max={100} value={draft.business_pct}
                onChange={(e) => setDraft((d) => ({ ...d, business_pct: e.target.value }))} />
            </F>
            <F label="Business purpose">
              <Input className="h-9" value={draft.business_purpose}
                onChange={(e) => setDraft((d) => ({ ...d, business_purpose: e.target.value }))} />
            </F>
            <F label="Business activity">
              <Input className="h-9" placeholder="Meeting, site visit, conference…" value={draft.business_activity}
                onChange={(e) => setDraft((d) => ({ ...d, business_activity: e.target.value }))} />
            </F>
            <F label="Documentation on file">
              <Input className="h-9" placeholder="Receipt, agenda, registration, mileage…"
                value={draft.documentation}
                onChange={(e) => setDraft((d) => ({ ...d, documentation: e.target.value }))} />
            </F>
          </div>
          <Button
            size="sm"
            disabled={!draft.description || !draft.amount}
            onClick={() => {
              create.mutate({
                trip_id: draft.trip_id || null,
                expense_date: draft.expense_date,
                description: draft.description,
                location: draft.location || null,
                business_purpose: draft.business_purpose || null,
                business_activity: draft.business_activity || null,
                amount: Number(draft.amount) || 0,
                business_pct: Number(draft.business_pct) || 0,
                documentation: draft.documentation || null,
              });
              setDraft((d) => ({
                ...d, description: '', amount: '', location: '', business_purpose: '',
                business_activity: '', documentation: '',
              }));
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add expense
          </Button>
        </CardContent>
      </Card>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-base">Travel tax records</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Expense</TableHead>
                <TableHead className="text-xs">Purpose / activity</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-right">Business %</TableHead>
                <TableHead className="text-xs text-right">Deductible</TableHead>
                <TableHead className="text-xs">CPA</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-xs text-center text-muted-foreground py-6">
                  No business travel expenses logged.
                </TableCell></TableRow>
              )}
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.expense_date}</TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium">{e.description}</p>
                    <p className="text-[10px] text-muted-foreground">{e.location}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.business_purpose} {e.business_activity ? `· ${e.business_activity}` : ''}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{money2(Number(e.amount))}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{Number(e.business_pct)}%</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {money2(Number(e.amount) * (Number(e.business_pct) / 100))}
                  </TableCell>
                  <TableCell>
                    {e.cpa_reviewed ? (
                      <Badge variant="outline" className="text-[10px] bg-prism-lime/15 text-prism-lime border-prism-lime/30">
                        Reviewed
                      </Badge>
                    ) : (
                      <label className="flex items-center gap-1.5 text-[10px] cursor-pointer text-prism-orange">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => update.mutate({ id: e.id, cpa_reviewed: true })}
                        />
                        CPA review required
                      </label>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove.mutate(e.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="prism-card-shine border-border/50">
      <CardContent className="p-4 space-y-0.5">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
