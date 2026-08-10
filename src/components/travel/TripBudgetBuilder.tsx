import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useTripBudgetLines } from '@/hooks/use-travel-fund';
import { TRIP_BUDGET_CATEGORIES, TravelTrip, money2, monthName } from '@/lib/travel/travelFund';

export function TripBudgetBuilder({ trips }: { trips: TravelTrip[] }) {
  const [tripId, setTripId] = useState<string>(trips[0]?.id ?? '');
  const active = trips.find((t) => t.id === tripId) ?? trips[0];
  const { lines, upsert, remove } = useTripBudgetLines(active?.id);
  const [draft, setDraft] = useState({ category: 'Airfare', budget_amount: '', classification: 'personal' });

  const totals = useMemo(() => {
    const budget = lines.reduce((s, l) => s + Number(l.budget_amount || 0), 0);
    const actual = lines.reduce((s, l) => s + Number(l.actual_amount || 0), 0);
    return { budget, actual, variance: budget - actual };
  }, [lines]);

  if (!active) {
    return (
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        Add a trip first to build its budget.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Trip budget builder</CardTitle>
            <Select value={active.id} onValueChange={setTripId}>
              <SelectTrigger className="w-[260px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.destination} — {monthName(t.travel_month)} {t.travel_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="w-[190px]">
              <Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIP_BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input
              className="w-[130px] h-9" type="number" placeholder="Budget $"
              value={draft.budget_amount}
              onChange={(e) => setDraft((d) => ({ ...d, budget_amount: e.target.value }))}
            />
            <Select value={draft.classification} onValueChange={(v) => setDraft((d) => ({ ...d, classification: v }))}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm" className="h-9"
              onClick={() => {
                upsert.mutate({
                  category: draft.category,
                  budget_amount: Number(draft.budget_amount) || 0,
                  classification: draft.classification,
                });
                setDraft({ category: 'Airfare', budget_amount: '', classification: 'personal' });
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add line
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Class</TableHead>
                  <TableHead className="text-xs text-right">Budget</TableHead>
                  <TableHead className="text-xs text-right">Actual</TableHead>
                  <TableHead className="text-xs text-right">Variance</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-6">
                    No budget lines yet.
                  </TableCell></TableRow>
                )}
                {lines.map((l) => {
                  const variance = Number(l.budget_amount || 0) - Number(l.actual_amount || 0);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs font-medium">{l.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{l.classification}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number" className="h-8 w-24 ml-auto text-right text-xs"
                          defaultValue={Number(l.budget_amount)}
                          onBlur={(e) => upsert.mutate({ id: l.id, budget_amount: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number" className="h-8 w-24 ml-auto text-right text-xs"
                          defaultValue={Number(l.actual_amount)}
                          onBlur={(e) => upsert.mutate({ id: l.id, actual_amount: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell className={`text-xs text-right tabular-nums ${variance < 0 ? 'text-prism-rose' : 'text-prism-lime'}`}>
                        {money2(variance)}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove.mutate(l.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {lines.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="text-xs font-semibold">Total</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-semibold">{money2(totals.budget)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-semibold">{money2(totals.actual)}</TableCell>
                    <TableCell className={`text-xs text-right tabular-nums font-semibold ${totals.variance < 0 ? 'text-prism-rose' : 'text-prism-lime'}`}>
                      {money2(totals.variance)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
