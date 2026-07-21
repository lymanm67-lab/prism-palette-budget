import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useFamilyTrust, useUpsertTrust } from '@/hooks/use-financial-os';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function TrustDashboard() {
  const { data: trust } = useFamilyTrust();
  const save = useUpsertTrust();
  const [form, setForm] = useState<any>({
    name: 'Montgomery Family Legacy Trust',
    trust_type: 'revocable_living',
    current_assets: 0,
    funding_target: 1000000,
    life_insurance_funding: 0,
    annual_contribution: 0,
    trustee: '',
    successor_trustee: '',
    readiness_score: 0,
  });

  useEffect(() => { if (trust) setForm(trust); }, [trust]);

  const fundingPct = form.funding_target > 0 ? Math.min(100, ((form.current_assets + form.life_insurance_funding) / form.funding_target) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Trust Overview</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label className="text-xs">Trust name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Trust type</Label>
              <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.trust_type} onChange={e => setForm({ ...form, trust_type: e.target.value })}>
                <option value="revocable_living">Revocable Living</option>
                <option value="irrevocable">Irrevocable</option>
                <option value="dynasty">Dynasty</option>
                <option value="charitable_remainder">Charitable Remainder</option>
                <option value="ilit">ILIT</option>
              </select>
            </div>
            <div><Label className="text-xs">Current assets ($)</Label><Input type="number" value={form.current_assets} onChange={e => setForm({ ...form, current_assets: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Funding target ($)</Label><Input type="number" value={form.funding_target} onChange={e => setForm({ ...form, funding_target: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Life insurance funding ($)</Label><Input type="number" value={form.life_insurance_funding} onChange={e => setForm({ ...form, life_insurance_funding: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Annual contribution ($)</Label><Input type="number" value={form.annual_contribution} onChange={e => setForm({ ...form, annual_contribution: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Trustee</Label><Input value={form.trustee || ''} onChange={e => setForm({ ...form, trustee: e.target.value })} /></div>
            <div><Label className="text-xs">Successor trustee</Label><Input value={form.successor_trustee || ''} onChange={e => setForm({ ...form, successor_trustee: e.target.value })} /></div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Funding progress</span>
              <span className="font-mono">{fundingPct.toFixed(0)}%</span>
            </div>
            <Progress value={fundingPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {fmt(form.current_assets + form.life_insurance_funding)} of {fmt(form.funding_target)}
            </p>
          </div>

          <Button onClick={() => save.mutate({ ...form })} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save trust'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
