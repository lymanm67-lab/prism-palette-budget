// SwingEdge — paste in the Thinkorswim order table.
//
// Nothing is inferred: a value missing from the paste stays blank and the row is
// marked incomplete, so the portfolio risk snapshot only counts real numbers.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, ClipboardPaste, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from '@/hooks/use-toast';
import { parseBrokerOrders, type ParsedOrderRow } from '@/lib/swingedge/brokerOrderPaste';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/swingedge/portfolioRiskSnapshot';

const STATUSES: OrderStatus[] = ['WAIT_COND', 'WAIT_TRG', 'WORKING', 'FILLED', 'CLOSED'];

const EXAMPLE = `XLE, WAIT COND, 40, 88.50, 86.25, 93.00
SMH FILLED 10 250.10 240.00 270.00
QQQ 12 480.25 470.00 500.75`;

const money = (v: number | null) => (v === null ? '—' : v.toFixed(2));

interface SavedRow {
  id: string;
  symbol: string;
  status: string;
  shares: number | null;
  entry_price: number | null;
  stop_price: number | null;
  target_price: number | null;
}

export default function BrokerOrders() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ParsedOrderRow[]>([]);
  const [skipped, setSkipped] = useState<{ line: number; raw: string; reason: string }[]>([]);

  const saved = useQuery({
    queryKey: ['se-broker-orders', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_broker_orders')
        .select('id, symbol, status, shares, entry_price, stop_price, target_price')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('symbol');
      if (error) throw error;
      return (data ?? []) as unknown as SavedRow[];
    },
  });

  const readable = useMemo(() => rows.filter((r) => r.missing.length === 0), [rows]);

  const insert = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error('No household selected yet.');
      const payload = readable.map((r) => ({
        household_id: householdId,
        symbol: r.symbol,
        status: r.status,
        shares: r.shares,
        entry_price: r.entry,
        stop_price: r.stop,
        target_price: r.target,
      }));
      const { error } = await supabase.from('se_broker_orders').insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => {
      toast({ title: `${n} order${n === 1 ? '' : 's'} saved`, description: 'Your portfolio risk snapshot now includes them.' });
      setText('');
      setRows([]);
      setSkipped([]);
      qc.invalidateQueries({ queryKey: ['se-broker-orders'] });
      qc.invalidateQueries({ queryKey: ['se-risk-broker'] });
    },
    onError: (e: Error) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('se_broker_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['se-broker-orders'] });
      qc.invalidateQueries({ queryKey: ['se-risk-broker'] });
    },
  });

  const parse = () => {
    const out = parseBrokerOrders(text);
    setRows(out.rows);
    setSkipped(out.skipped);
    if (out.rows.length === 0) {
      toast({ title: 'Nothing readable yet', description: 'Each line needs a ticker plus its prices.', variant: 'destructive' });
    }
  };

  const setStatus = (line: number, status: OrderStatus) =>
    setRows((prev) => prev.map((r) => (r.line === line ? { ...r, status } : r)));

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Enter your Thinkorswim orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Copy the rows from your paperMoney order table and paste them below. One order per line: ticker, status,
          shares, entry, stop, target.
        </p>
      </div>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ClipboardPaste className="h-4 w-4 text-prism-teal" />
            Paste your orders
          </CardTitle>
          <CardDescription>Commas, tabs or spaces all work. Blank values stay blank — nothing is guessed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="paste" className="text-xs">Order rows</Label>
          <Textarea
            id="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={EXAMPLE}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button onClick={parse} disabled={!text.trim()}>Read these rows</Button>
            <Button variant="ghost" onClick={() => setText(EXAMPLE)}>Use the example</Button>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="prism-card-shine border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Check before saving</CardTitle>
            <CardDescription>
              {readable.length} of {rows.length} rows are complete. Incomplete rows are not saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Stop</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead>Missing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.line}>
                      <TableCell className="font-semibold">{r.symbol}</TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={(v) => setStatus(r.line, v as OrderStatus)}>
                          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">{r.shares ?? '—'}</TableCell>
                      <TableCell className="text-right">{money(r.entry)}</TableCell>
                      <TableCell className="text-right">{money(r.stop)}</TableCell>
                      <TableCell className="text-right">{money(r.target)}</TableCell>
                      <TableCell>
                        {r.missing.length === 0
                          ? <Badge variant="secondary" className="bg-prism-teal/15 text-prism-teal">Complete</Badge>
                          : <Badge variant="outline" className="text-xs">{r.missing.join(', ')}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {skipped.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs space-y-1">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 text-prism-amber" />
                  Lines that could not be read
                </p>
                {skipped.map((s) => (
                  <p key={s.line} className="text-muted-foreground">Line {s.line}: {s.reason} — “{s.raw}”</p>
                ))}
              </div>
            )}

            <Button onClick={() => insert.mutate()} disabled={readable.length === 0 || insert.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              Save {readable.length} order{readable.length === 1 ? '' : 's'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Saved orders</CardTitle>
          <CardDescription>These feed the Active, Pending and Maximum risk numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          {(saved.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Stop</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(saved.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.symbol}</TableCell>
                      <TableCell className="text-xs">{ORDER_STATUS_LABEL[r.status as OrderStatus] ?? r.status}</TableCell>
                      <TableCell className="text-right">{r.shares ?? '—'}</TableCell>
                      <TableCell className="text-right">{money(r.entry_price)}</TableCell>
                      <TableCell className="text-right">{money(r.stop_price)}</TableCell>
                      <TableCell className="text-right">{money(r.target_price)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)} aria-label={`Remove ${r.symbol}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
