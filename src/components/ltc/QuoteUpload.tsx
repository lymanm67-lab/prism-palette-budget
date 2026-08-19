import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Sparkles, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLtcDocumentMutations } from '@/hooks/use-ltc-plan';
import type { LtcPolicy, LtcState } from '@/lib/ltc/model';
import { Field, NumField, Note } from './shared';

const MAX_BYTES = 12 * 1024 * 1024;

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback);

function toDraft(parsed: Record<string, any>): LtcPolicy {
  return {
    id: `upload-${Date.now()}`,
    carrier: String(parsed.carrier || 'Uploaded quote'),
    product: String(parsed.product || 'Quote on file'),
    startingMonthlyBenefit: num(parsed.startingMonthlyBenefit, 2500),
    benefitPeriodMonths: num(parsed.benefitPeriodMonths, 36),
    poolEach: num(parsed.poolEach, num(parsed.startingMonthlyBenefit, 2500) * num(parsed.benefitPeriodMonths, 36)),
    inflationPct: num(parsed.inflationPct, 3),
    inflationCompound: bool(parsed.inflationCompound, true),
    inflationLifetime: bool(parsed.inflationLifetime, true),
    homeCarePct: num(parsed.homeCarePct, 100),
    assistedLivingPct: num(parsed.assistedLivingPct, 100),
    nursingPct: num(parsed.nursingPct, 100),
    cashBenefitPct: num(parsed.cashBenefitPct, 0),
    eliminationDays: num(parsed.eliminationDays, 90),
    partnershipQualified: bool(parsed.partnershipQualified),
    sharedCare: bool(parsed.sharedCare),
    premiumWaiver: bool(parsed.premiumWaiver),
    jointApplicantDiscount: bool(parsed.jointApplicantDiscount),
    premiumLyman: parsed.premiumLyman == null ? undefined : num(parsed.premiumLyman),
    premiumKateri: parsed.premiumKateri == null ? undefined : num(parsed.premiumKateri),
    combinedMonthlyPremium:
      num(parsed.combinedMonthlyPremium) ||
      num(parsed.premiumLyman) + num(parsed.premiumKateri),
    notes: parsed.notes ? String(parsed.notes) : undefined,
  };
}

export function QuoteUpload({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { add } = useLtcDocumentMutations();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<LtcPolicy | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [quoteDate, setQuoteDate] = useState<string | null>(null);
  const [agent, setAgent] = useState<string | null>(null);

  const setD = (p: Partial<LtcPolicy>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const onPick = (f: File | null) => {
    if (f && f.size > MAX_BYTES) { toast.error('File is too large (12MB max)'); return; }
    setFile(f);
    setDraft(null);
    setConfidence(null);
  };

  const readQuote = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('Could not read the file'));
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('parse-ltc-quote', {
        body: { dataUrl, fileName: file.name, mimeType: file.type || 'application/pdf' },
      });
      if (error) throw error;
      const parsed = (data as any)?.parsed;
      if (!parsed) throw new Error('The quote could not be read');
      setDraft(toDraft(parsed));
      setConfidence(parsed.confidence ?? null);
      setQuoteDate(parsed.quote_date ?? null);
      setAgent(parsed.agent ?? null);
      toast.success('Quote read — review the figures below');
    } catch (e: any) {
      toast.error(e?.message || 'Could not read the quote');
    } finally {
      setBusy(false);
    }
  };

  const addToComparison = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      patch({ policies: [...state.policies, draft] });
      if (file) {
        await add.mutateAsync({
          category: 'quote',
          carrier: draft.carrier,
          product: draft.product,
          agent,
          quote_date: quoteDate,
          monthly_premium: draft.combinedMonthlyPremium,
          monthly_benefit: draft.startingMonthlyBenefit,
          inflation_pct: draft.inflationPct,
          notes: draft.notes ?? null,
          file,
        });
      }
      toast.success(`${draft.carrier} added to the comparison. Click Save to keep it.`);
      setDraft(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      toast.error(e?.message || 'Could not file the quote');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="glass-card print:hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4 text-prism-amber" /> Upload a carrier quote
        </CardTitle>
        <Note>
          Drop in a PDF or photo of an LTC illustration. The terms are read for you, you confirm them, and the plan
          joins the comparison table with the file stored in your document vault.
        </Note>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="max-w-sm"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <Button size="sm" onClick={readQuote} disabled={!file || busy}>
            {busy && !draft ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            Read quote
          </Button>
          {confidence && (
            <Badge variant="outline" className="text-[10px]">Read confidence: {confidence}</Badge>
          )}
        </div>

        {draft && (
          <div className="space-y-4 rounded-lg border border-border/60 bg-card/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Confirm the extracted terms
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Carrier">
                <Input value={draft.carrier} onChange={(e) => setD({ carrier: e.target.value })} />
              </Field>
              <Field label="Product">
                <Input value={draft.product} onChange={(e) => setD({ product: e.target.value })} />
              </Field>
              <Field label="Quote date">
                <Input type="date" value={quoteDate ?? ''} onChange={(e) => setQuoteDate(e.target.value || null)} />
              </Field>
              <Field label="Agent">
                <Input value={agent ?? ''} onChange={(e) => setAgent(e.target.value || null)} />
              </Field>
              <Field label="Starting monthly benefit ($)">
                <NumField value={draft.startingMonthlyBenefit} onChange={(n) => setD({ startingMonthlyBenefit: n })} />
              </Field>
              <Field label="Benefit period (months)">
                <NumField value={draft.benefitPeriodMonths} onChange={(n) => setD({ benefitPeriodMonths: n })} />
              </Field>
              <Field label="Initial pool each ($)">
                <NumField value={draft.poolEach} onChange={(n) => setD({ poolEach: n })} />
              </Field>
              <Field label="Inflation rider (%)">
                <NumField step="0.1" value={draft.inflationPct} onChange={(n) => setD({ inflationPct: n })} />
              </Field>
              <Field label="Premium — Lyman ($/mo)">
                <NumField step="0.01" value={draft.premiumLyman ?? 0} onChange={(n) => setD({ premiumLyman: n })} />
              </Field>
              <Field label="Premium — Kateri ($/mo)">
                <NumField step="0.01" value={draft.premiumKateri ?? 0} onChange={(n) => setD({ premiumKateri: n })} />
              </Field>
              <Field label="Combined premium ($/mo)">
                <NumField step="0.01" value={draft.combinedMonthlyPremium} onChange={(n) => setD({ combinedMonthlyPremium: n })} />
              </Field>
              <Field label="Elimination period (days)">
                <NumField value={draft.eliminationDays} onChange={(n) => setD({ eliminationDays: n })} />
              </Field>
              <Field label="Home care (%)">
                <NumField value={draft.homeCarePct} onChange={(n) => setD({ homeCarePct: n })} />
              </Field>
              <Field label="Assisted living (%)">
                <NumField value={draft.assistedLivingPct} onChange={(n) => setD({ assistedLivingPct: n })} />
              </Field>
              <Field label="Nursing (%)">
                <NumField value={draft.nursingPct} onChange={(n) => setD({ nursingPct: n })} />
              </Field>
              <Field label="Cash benefit (%)">
                <NumField value={draft.cashBenefitPct} onChange={(n) => setD({ cashBenefitPct: n })} />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([
                ['inflationCompound', 'Compound inflation'],
                ['inflationLifetime', 'Inflation for life'],
                ['partnershipQualified', 'Partnership qualified'],
                ['sharedCare', 'Shared care rider'],
                ['premiumWaiver', 'Spouse premium waiver'],
                ['jointApplicantDiscount', 'Joint applicant discount'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
                  <span className="text-xs">{label}</span>
                  <Switch checked={!!draft[key]} onCheckedChange={(v) => setD({ [key]: v } as Partial<LtcPolicy>)} />
                </label>
              ))}
            </div>

            <Field label="Notes">
              <Input value={draft.notes ?? ''} onChange={(e) => setD({ notes: e.target.value })} />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={addToComparison} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Add to comparison
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                <X className="h-3.5 w-3.5 mr-1" /> Discard
              </Button>
              <Note>Premiums are monthly. Annual or quarterly modal premiums are converted for you — check them anyway.</Note>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
