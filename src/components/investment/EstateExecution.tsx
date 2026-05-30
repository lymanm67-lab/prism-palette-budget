import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Vault, Shield, KeyRound, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useDigitalAssets, useUpsertDigitalAsset, useDeleteDigitalAsset } from '@/hooks/use-investment-v3';
import { useInvestmentLegacy } from '@/hooks/use-investment-v2';

export function EstateExecution({ planId }: { planId?: string }) {
  const { data: assets = [] } = useDigitalAssets();
  const upsert = useUpsertDigitalAsset();
  const del = useDeleteDigitalAsset();
  const { data: legacy } = useInvestmentLegacy(planId);
  const legacyGoals = legacy ? [legacy] : [];

  const [draft, setDraft] = useState({ asset_type: 'account', name: '', provider: '', username: '', beneficiary: '', vault_location: '', has_2fa: false });

  // Beneficiary audit — derive from legacy goals
  const allBeneficiaries = legacyGoals.flatMap((g: any) => g.beneficiaries || []);
  const missingBeneficiary = assets.filter((a: any) => !a.beneficiary || a.beneficiary.trim() === '').length;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Vault className="h-5 w-5 text-primary" /> Estate Execution</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="audit">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="digital">Digital assets</TabsTrigger>
            <TabsTrigger value="trust">Trust funding</TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Audit of estate readiness across linked records.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Legacy goals</div><div className="text-xl font-bold">{legacyGoals.length}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Beneficiaries on file</div><div className="text-xl font-bold">{allBeneficiaries.length}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Digital assets logged</div><div className="text-xl font-bold">{assets.length}</div></div>
              <div className={`rounded-lg p-3 ${missingBeneficiary ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                <div className="text-xs text-muted-foreground">Missing beneficiary</div>
                <div className="text-xl font-bold">{missingBeneficiary}</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm mt-2">
              {legacyGoals.some((g: any) => g.has_will) ? <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Will on file</li> : <li className="flex gap-2 text-amber-600"><AlertTriangle className="h-4 w-4" /> No will recorded</li>}
              {legacyGoals.some((g: any) => g.has_trust) ? <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Trust on file</li> : <li className="flex gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" /> No trust recorded</li>}
              {legacyGoals.some((g: any) => g.has_poa) ? <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> POA recorded</li> : <li className="flex gap-2 text-amber-600"><AlertTriangle className="h-4 w-4" /> No POA recorded</li>}
            </ul>
          </TabsContent>

          <TabsContent value="digital" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Inventory of online accounts, crypto wallets, and credentials. Never store actual passwords here — only vault location & recovery hints.</p>
            <div className="rounded-lg border p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={draft.asset_type} onValueChange={(v) => setDraft({ ...draft, asset_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">Online account</SelectItem>
                      <SelectItem value="crypto">Crypto wallet</SelectItem>
                      <SelectItem value="domain">Domain / website</SelectItem>
                      <SelectItem value="social">Social media</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Schwab Brokerage" /></div>
                <div><Label>Provider</Label><Input value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} /></div>
                <div><Label>Username</Label><Input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} /></div>
                <div><Label>Beneficiary</Label><Input value={draft.beneficiary} onChange={(e) => setDraft({ ...draft, beneficiary: e.target.value })} /></div>
                <div><Label>Vault location</Label><Input value={draft.vault_location} onChange={(e) => setDraft({ ...draft, vault_location: e.target.value })} placeholder="1Password, safe deposit box" /></div>
              </div>
              <Button size="sm" onClick={() => { upsert.mutate(draft); setDraft({ asset_type: 'account', name: '', provider: '', username: '', beneficiary: '', vault_location: '', has_2fa: false }); }} disabled={!draft.name}>
                <Plus className="h-4 w-4 mr-1" /> Add asset
              </Button>
            </div>
            <div className="space-y-2">
              {assets.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" /> {a.name} <Badge variant="outline">{a.asset_type}</Badge></div>
                    <div className="text-xs text-muted-foreground">{a.provider} • Vault: {a.vault_location || '—'} • Beneficiary: {a.beneficiary || <span className="text-amber-600">none</span>}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {assets.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No digital assets logged yet.</div>}
            </div>
          </TabsContent>

          <TabsContent value="trust" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Trust funding requires re-titling assets into the trust name. Track progress here.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 text-muted-foreground" /> Brokerage accounts re-titled to trust</li>
              <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 text-muted-foreground" /> Real estate deeds transferred</li>
              <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 text-muted-foreground" /> Bank accounts re-titled</li>
              <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 text-muted-foreground" /> Business interests assigned</li>
              <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 text-muted-foreground" /> Beneficiary designations updated on IRAs/401(k)s</li>
            </ul>
            <p className="text-xs text-muted-foreground">Use the Legacy tab to track Will/Trust/POA status. Consult an estate attorney before re-titling.</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
