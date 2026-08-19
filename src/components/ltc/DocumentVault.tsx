import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Upload, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DOC_CATEGORIES, combinedPremium, benefitAtAge, careCostAtAge, reviewWarnings, type LtcState,
} from '@/lib/ltc/model';
import {
  useLtcDocuments, useLtcDocumentMutations, ltcSignedUrl, type LtcDocument,
} from '@/hooks/use-ltc-plan';
import { money, money2, Note, Field, NumField } from './shared';

export function DocumentVault({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const { data: docs = [] } = useLtcDocuments();
  const { add, remove } = useLtcDocumentMutations();
  const [form, setForm] = useState<Partial<LtcDocument> & { file?: File | null }>({
    category: DOC_CATEGORIES[0], quote_date: new Date().toISOString().slice(0, 10),
  });

  const h = state.household;
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const warnings = reviewWarnings(state);
  const log = [...state.reviewLog].sort((a, b) => b.date.localeCompare(a.date));

  const submit = async () => {
    if (!form.category) return;
    try {
      await add.mutateAsync(form);
      toast.success('Document saved to the LTC vault');
      setForm({ category: DOC_CATEGORIES[0], quote_date: new Date().toISOString().slice(0, 10) });
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  const open = async (doc: LtcDocument) => {
    if (!doc.file_path) return;
    try { window.open(await ltcSignedUrl(doc.file_path), '_blank'); }
    catch (e: any) { toast.error(e.message || 'Could not open file'); }
  };

  const logThisYear = () => {
    if (!policy) return;
    patch({
      reviewLog: [...state.reviewLog, {
        date: new Date().toISOString().slice(0, 10),
        premium: combinedPremium(policy),
        benefit: benefitAtAge(policy, h.lymanAge, h.assumedClaimAge).monthlyBenefit,
        careCost: careCostAtAge(h, h.lymanAge, h.assumedClaimAge),
      }],
    });
    toast.success('Annual review snapshot recorded — remember to save the plan');
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4 text-prism-teal" /> Add quote, contract or notice</CardTitle>
          <Note>Files are stored privately and only your household can open them.</Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Field label="Category">
            <Select value={form.category || ''} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Carrier"><Input value={form.carrier || ''} onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))} /></Field>
          <Field label="Product"><Input value={form.product || ''} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))} /></Field>
          <Field label="Agent"><Input value={form.agent || ''} onChange={(e) => setForm((f) => ({ ...f, agent: e.target.value }))} /></Field>
          <Field label="Quote date"><Input type="date" value={form.quote_date || ''} onChange={(e) => setForm((f) => ({ ...f, quote_date: e.target.value }))} /></Field>
          <Field label="Monthly premium"><NumField value={form.monthly_premium || 0} onChange={(n) => setForm((f) => ({ ...f, monthly_premium: n }))} /></Field>
          <Field label="Monthly benefit"><NumField value={form.monthly_benefit || 0} onChange={(n) => setForm((f) => ({ ...f, monthly_benefit: n }))} /></Field>
          <Field label="Inflation %"><NumField step="0.1" value={form.inflation_pct || 0} onChange={(n) => setForm((f) => ({ ...f, inflation_pct: n }))} /></Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Notes">
              <Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <Field label="File">
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
          </Field>
          <div className="lg:col-span-4">
            <Button size="sm" onClick={submit} disabled={add.isPending}>
              {add.isPending ? 'Saving…' : 'Save to vault'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">LTC Document Vault ({docs.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 && <Note>No documents yet. Upload each carrier quote as it arrives so comparisons stay honest.</Note>}
          {DOC_CATEGORIES.filter((c) => docs.some((d) => d.category === c)).map((cat) => (
            <div key={cat} className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-2">{cat}</p>
              {docs.filter((d) => d.category === cat).map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-2.5">
                  <FileText className="h-4 w-4 text-prism-teal shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {[d.carrier, d.product].filter(Boolean).join(' — ') || d.file_name || 'Document'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[
                        d.quote_date, d.agent,
                        d.monthly_premium ? `${money2(d.monthly_premium)}/mo premium` : null,
                        d.monthly_benefit ? `${money(d.monthly_benefit)}/mo benefit` : null,
                        d.inflation_pct ? `${d.inflation_pct}% inflation` : null,
                        d.notes,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {d.file_path && (
                    <Button size="icon" variant="ghost" onClick={() => open(d)} aria-label="Open document">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(d)} aria-label="Delete document">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Annual Review Checklist</CardTitle>
            <Note>Review every year: premium changes, benefit growth vs. local care cost, income share, and Partnership status.</Note>
          </div>
          <Button size="sm" variant="outline" onClick={logThisYear}>Record this year's snapshot</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {warnings.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-prism-lime/40 bg-prism-lime/5 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-prism-lime mt-0.5 shrink-0" />
              <span>No review flags. Coverage, inflation rider and premium load all sit inside strategy targets.</span>
            </div>
          )}
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                w.level === 'risk' ? 'border-destructive/40 bg-destructive/5' : 'border-prism-amber/40 bg-prism-amber/5'
              }`}
            >
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${w.level === 'risk' ? 'text-destructive' : 'text-prism-amber'}`} />
              <div>
                <p className="font-medium">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.detail}</p>
              </div>
            </div>
          ))}

          {log.length > 0 && (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Review date</th><th className="py-2">Combined premium</th>
                    <th className="py-2">Projected benefit</th><th className="py-2">Projected care cost</th><th className="py-2">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((r, i) => (
                    <tr key={`${r.date}-${i}`} className="border-b border-border/30">
                      <td className="py-2">{r.date}</td>
                      <td className="py-2 tabular-nums">{money2(r.premium)}</td>
                      <td className="py-2 tabular-nums">{money(r.benefit)}</td>
                      <td className="py-2 tabular-nums">{money(r.careCost)}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {r.careCost ? `${Math.round((r.benefit / r.careCost) * 100)}%` : '—'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
