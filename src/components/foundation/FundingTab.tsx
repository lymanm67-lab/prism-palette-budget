import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import { useFdnGifts } from '@/hooks/use-foundation-ops';
import { useFdnSettings, useFdnPillars } from '@/hooks/use-foundation';
import { DONOR_TYPES, GIFT_TYPES, rollupFunding, currency0 } from '@/lib/legacy/foundationOps';

const empty = {
  id: '',
  donor_name: '',
  donor_type: 'individual',
  gift_type: 'cash',
  amount: 0,
  gift_date: new Date().toISOString().slice(0, 10),
  pledge_total: 0,
  pledge_balance: 0,
  is_restricted: false,
  restriction_note: '',
  acknowledged_at: '',
  receipt_sent: false,
  notes: '',
};

export default function FundingTab() {
  const { data: gifts = [] } = useFdnGifts();
  const { data: settings } = useFdnSettings();
  const { data: pillars = [] } = useFdnPillars();
  const r = rollupFunding(gifts as any[]);
  const target = Number(settings?.endowment_target ?? 0);

  const fields: FdnField[] = [
    { key: 'donor_name', label: 'Donor name' },
    { key: 'donor_type', label: 'Donor type', type: 'select', options: DONOR_TYPES.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })) },
    { key: 'gift_type', label: 'Gift type', type: 'select', options: GIFT_TYPES.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })) },
    { key: 'amount', label: 'Amount received ($)', type: 'number' },
    { key: 'gift_date', label: 'Gift date', type: 'date' },
    { key: 'pledge_total', label: 'Pledge total ($)', type: 'number' },
    { key: 'pledge_balance', label: 'Pledge balance outstanding ($)', type: 'number' },
    { key: 'acknowledged_at', label: 'Thank-you sent on', type: 'date' },
    { key: 'is_restricted', label: 'Restricted gift', type: 'switch' },
    { key: 'receipt_sent', label: 'Tax receipt sent', type: 'switch' },
    { key: 'restriction_note', label: 'Restriction / designation', full: true },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ];

  const pillarName = (id: string | null) => (pillars as any[]).find((p) => p.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gifts received</p>
            <p className="mt-1 text-2xl font-semibold text-prism-lime">{currency0(r.received)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.giftCount} gifts · {r.donorCount} donors</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pledges outstanding</p>
            <p className="mt-1 text-2xl font-semibold text-prism-amber">{currency0(r.outstanding)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currency0(r.pledged)} pledged in total</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Average gift</p>
            <p className="mt-1 text-2xl font-semibold">{currency0(r.averageGift)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {currency0(r.restricted)} restricted · {currency0(r.unrestricted)} unrestricted
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Stewardship follow-ups</p>
            <p className="mt-1 text-2xl font-semibold text-prism-rose">{r.unacknowledged + r.noReceipt}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.unacknowledged} unthanked · {r.noReceipt} missing receipts
            </p>
          </CardContent>
        </Card>
      </div>

      {target > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Raised + pledged toward endowment target</span>
              <span>
                {currency0(r.received + r.outstanding)} / {currency0(target)}
              </span>
            </div>
            <Progress value={Math.min(100, ((r.received + r.outstanding) / target) * 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>
      )}

      <FdnCrudCard
        table="fdn_gifts"
        title="Gift & pledge ledger"
        description="Every cash gift, stock transfer, QCD, DAF grant, pledge, and bequest with acknowledgement tracking."
        addLabel="Record gift"
        fields={fields}
        empty={empty}
        rows={gifts as any[]}
        requiredKey="donor_name"
        numericKeys={['amount', 'pledge_total', 'pledge_balance']}
        dateKeys={['gift_date', 'acknowledged_at']}
        renderRow={(g) => (
          <div>
            <p className="text-sm font-medium">
              {g.donor_name} — {currency0(Number(g.amount))}
            </p>
            <p className="text-xs text-muted-foreground">
              {g.gift_date} · {String(g.gift_type).replace(/_/g, ' ')} · {String(g.donor_type).replace(/_/g, ' ')}
              {g.pillar_id ? ` · ${pillarName(g.pillar_id) ?? ''}` : ''}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {g.is_restricted && <Badge variant="secondary" className="text-xs">Restricted</Badge>}
              {Number(g.pledge_balance) > 0 && (
                <Badge variant="outline" className="text-xs">
                  {currency0(Number(g.pledge_balance))} pledge open
                </Badge>
              )}
              {!g.acknowledged_at && Number(g.amount) > 0 && (
                <Badge variant="destructive" className="text-xs">Needs thank-you</Badge>
              )}
              {!g.receipt_sent && Number(g.amount) > 0 && (
                <Badge variant="outline" className="text-xs">No receipt</Badge>
              )}
            </div>
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">
        Educational planning only. Substantiation, appraisal, and deductibility rules for non-cash gifts must be
        confirmed with a CPA.
      </p>
    </div>
  );
}
