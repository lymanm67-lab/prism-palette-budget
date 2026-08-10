import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { money, pct } from '@/lib/retirement/investmentTracker';
import {
  ASSET_CLASSES, ASSET_TYPES, KNOWN_TIAA_FUNDS, UNCLASSIFIED, deriveHolding, share,
  type PortfolioAccount, type PositionRow,
} from '@/lib/investment/portfolio';

interface Props {
  account: PortfolioAccount;
  positions: PositionRow[];
  groupTotal: number;
  classTotal: number;
  onSave: (input: Partial<PositionRow> & { account_id: string; name: string }) => Promise<unknown>;
  onDelete: (id: string) => void;
  onAddKnownFunds?: () => void;
  labels?: { group: string; class: string };
}

type Draft = Partial<PositionRow> & { name: string };

const EMPTY: Draft = {
  name: '',
  ticker: '',
  asset_type: 'Mutual Fund',
  asset_class: '',
  current_value: 0,
};

export function PositionsPanel({
  account, positions, groupTotal, classTotal, onSave, onDelete, onAddKnownFunds, labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const num = (v: unknown) => (v === '' || v == null ? null : Number(v));

  const edit = (p: PositionRow) => {
    setDraft({ ...p });
    setOpen(true);
  };

  const submit = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...draft,
        account_id: account.id,
        name: draft.name.trim(),
        ticker: draft.ticker || null,
        asset_class: draft.asset_class || null,
        quantity: num(draft.quantity),
        average_cost: num(draft.average_cost),
        current_price: num(draft.current_price),
        current_value: Number(draft.current_value ?? 0),
        cost_basis: num(draft.cost_basis),
        contributions: Number(draft.contributions ?? 0),
        withdrawals: Number(draft.withdrawals ?? 0),
        dividends: Number(draft.dividends ?? 0),
        interest: Number(draft.interest ?? 0),
        monthly_contribution: Number(draft.monthly_contribution ?? 0),
        reported_return: num(draft.reported_return),
        purchased_at: draft.purchased_at || null,
        notes: draft.notes || null,
      });
      setOpen(false);
      setDraft(EMPTY);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Draft, label: string, type = 'number') => (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input
        type={type}
        step="0.0001"
        value={(draft[key] as string | number | undefined) ?? ''}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        className="h-8 text-xs"
      />
    </div>
  );

  return (
    <div className="space-y-2">
      {positions.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No individual investments recorded for this account yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="text-left py-1 pr-2">Investment</th>
                <th className="text-left pr-2">Type</th>
                <th className="text-left pr-2">Asset class</th>
                <th className="text-right pr-2">Units</th>
                <th className="text-right pr-2">Price</th>
                <th className="text-right pr-2">Value</th>
                <th className="text-right pr-2">Gain / loss</th>
                <th className="text-right pr-2">Reported return</th>
                <th className="text-right pr-2">% {labels?.group ?? 'account group'}</th>
                <th className="text-right pr-2">% {labels?.class ?? 'portfolio'}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const d = deriveHolding(p);
                const value = Number(p.current_value || 0);
                return (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="py-1 pr-2">
                      <span className="font-medium">{p.name}</span>
                      {p.ticker ? <span className="text-muted-foreground"> · {p.ticker}</span> : null}
                      {value === 0 ? (
                        <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">
                          $0 · history kept
                        </Badge>
                      ) : null}
                    </td>
                    <td className="pr-2">{p.asset_type}</td>
                    <td className="pr-2">
                      {p.asset_class ?? <span className="text-muted-foreground">{UNCLASSIFIED}</span>}
                    </td>
                    <td className="text-right pr-2">{p.quantity ?? '—'}</td>
                    <td className="text-right pr-2">{p.current_price != null ? money(Number(p.current_price), 2) : '—'}</td>
                    <td className="text-right pr-2 font-medium">{money(value, 2)}</td>
                    <td className="text-right pr-2">
                      {d.gainDollars == null ? (
                        '—'
                      ) : (
                        <span className={d.gainDollars >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                          {money(d.gainDollars, 2)} ({pct(d.gainPct, 1)})
                        </span>
                      )}
                    </td>
                    <td className="text-right pr-2">{pct(p.reported_return, 2)}</td>
                    <td className="text-right pr-2">{pct(share(value, groupTotal), 1)}</td>
                    <td className="text-right pr-2">{pct(share(value, classTotal), 1)}</td>
                    <td className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => edit(p)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraft(EMPTY); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-[11px]">
              <Plus className="h-3 w-3 mr-1" /> Add investment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {draft.id ? 'Edit investment' : 'Add investment'} · {account.name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px]">Investment name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              {field('ticker', 'Ticker', 'text')}
              <div className="space-y-1">
                <Label className="text-[11px]">Asset type</Label>
                <Select
                  value={draft.asset_type ?? 'Other'}
                  onValueChange={(v) => setDraft((d) => ({ ...d, asset_type: v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Asset class</Label>
                <Select
                  value={draft.asset_class || 'unclassified'}
                  onValueChange={(v) => setDraft((d) => ({ ...d, asset_class: v === 'unclassified' ? '' : v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unclassified" className="text-xs">{UNCLASSIFIED}</SelectItem>
                    {ASSET_CLASSES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {field('current_value', 'Current value')}
              {field('quantity', 'Quantity / units')}
              {field('average_cost', 'Average cost')}
              {field('current_price', 'Current price')}
              {field('cost_basis', 'Cost basis (informational)')}
              {field('contributions', 'Contributions')}
              {field('withdrawals', 'Withdrawals')}
              {field('dividends', 'Dividends')}
              {field('interest', 'Interest')}
              {field('monthly_contribution', 'Monthly contribution')}
              {field('reported_return', 'Reported return %')}
              {field('purchased_at', 'Date purchased', 'date')}
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-[11px]">Notes</Label>
                <Textarea
                  value={draft.notes ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Cost basis is stored as informational data only. Personal rate of return comes from the
              institution — it is never derived by subtracting basis from value.
            </p>
            <DialogFooter>
              <Button size="sm" onClick={submit} disabled={saving || !draft.name.trim()}>
                {saving ? 'Saving…' : 'Save investment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {onAddKnownFunds ? (
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onAddKnownFunds}>
            Add known TIAA funds ({KNOWN_TIAA_FUNDS.length}) at $0
          </Button>
        ) : null}
      </div>
    </div>
  );
}
