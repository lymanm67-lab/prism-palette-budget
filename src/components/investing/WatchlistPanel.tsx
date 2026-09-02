import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { ROLES, ROLE_META, money } from '@/lib/investing/roles';
import { useDeleteWatchlistItem, useRoleWatchlist, useSaveWatchlistItem } from '@/hooks/use-investing';

export function WatchlistPanel() {
  const list = useRoleWatchlist();
  const save = useSaveWatchlistItem();
  const remove = useDeleteWatchlistItem();
  const [draft, setDraft] = useState<any>({ role: 'CORE', ticker: '', thesis: '', target_price: '', trigger_note: '' });

  const rows = (list.data ?? []) as any[];

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Role watchlist</CardTitle>
        <CardDescription>
          Candidates waiting for a role opening or a better entry. Adding one here is research, not a recommendation to buy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label>Role it would fill</Label>
            <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Ticker</Label>
            <Input value={draft.ticker} onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-1">
            <Label>Target entry price</Label>
            <Input type="number" step="0.01" value={draft.target_price} onChange={(e) => setDraft({ ...draft, target_price: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>What would make this a buy</Label>
            <Input value={draft.trigger_note} onChange={(e) => setDraft({ ...draft, trigger_note: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-5">
            <Label>Thesis or catalyst</Label>
            <Textarea rows={2} value={draft.thesis} onChange={(e) => setDraft({ ...draft, thesis: e.target.value })} />
          </div>
        </div>
        <Button
          disabled={!draft.ticker || save.isPending}
          onClick={async () => {
            await save.mutateAsync({
              ...draft,
              target_price: draft.target_price === '' ? null : Number(draft.target_price),
            });
            setDraft({ role: 'CORE', ticker: '', thesis: '', target_price: '', trigger_note: '' });
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add to watchlist
        </Button>

        {rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Target entry</TableHead>
                <TableHead>Buy trigger</TableHead>
                <TableHead>Thesis</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.ticker}</TableCell>
                  <TableCell><Badge variant="outline" className={ROLE_META[r.role as keyof typeof ROLE_META]?.accent}>{r.role}</Badge></TableCell>
                  <TableCell className="text-right">{r.target_price ? money(Number(r.target_price), 2) : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.trigger_note ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.thesis ?? '—'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" aria-label="Remove watchlist item" onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
