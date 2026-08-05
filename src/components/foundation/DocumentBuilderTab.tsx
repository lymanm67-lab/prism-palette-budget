// Guided Foundation Operating Document builder:
// Dashboard -> Mission -> Board -> Policies -> Programs -> Funding -> Compliance -> Word / PDF
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, FileType2, Printer, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useFdnSettings, useFdnPillars, useFdnInitiatives } from '@/hooks/use-foundation';
import {
  useFdnGovernance,
  useFdnCompliance,
  useFdnGifts,
  useFdnInvestments,
} from '@/hooks/use-foundation-ops';
import { useFdnReadinessState } from '@/hooks/use-foundation-readiness';
import {
  DOC_STEPS,
  POLICY_LIBRARY,
  buildFoundationDocument,
  documentTitle,
  exportFoundationDocx,
  printFoundationDocument,
  type DocBuilderState,
  type DocStepKey,
} from '@/lib/legacy/foundationDocument';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number(n) || 0,
  );

function StepStat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-md border border-border/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
        {ok && <Check className="h-3.5 w-3.5 text-prism-lime" />}
        {value}
      </p>
    </div>
  );
}

export default function DocumentBuilderTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [step, setStep] = useState<DocStepKey>('review');
  const [busy, setBusy] = useState(false);

  const settings = useFdnSettings();
  const pillars = useFdnPillars();
  const initiatives = useFdnInitiatives();
  const governance = useFdnGovernance();
  const compliance = useFdnCompliance();
  const gifts = useFdnGifts();
  const investments = useFdnInvestments();
  const { state, patch, isSaving } = useFdnReadinessState();

  const builder: DocBuilderState = (state.docBuilder ?? {}) as DocBuilderState;
  const adopted = builder.adoptedPolicies ?? [];

  const [preparedBy, setPreparedBy] = useState(builder.preparedBy ?? '');
  const [adoptionDate, setAdoptionDate] = useState(builder.adoptionDate ?? '');
  const [notes, setNotes] = useState(builder.notes ?? '');

  const data = {
    settings: settings.data ?? null,
    pillars: (pillars.data ?? []) as any[],
    initiatives: (initiatives.data ?? []) as any[],
    governance: (governance.data ?? []) as any[],
    compliance: (compliance.data ?? []) as any[],
    gifts: (gifts.data ?? []) as any[],
    investments: (investments.data ?? []) as any[],
    builder: { ...builder, preparedBy, adoptionDate, notes },
  };

  const sections = useMemo(() => buildFoundationDocument(data as any), [JSON.stringify(data)]);
  const title = documentTitle(settings.data ?? null);

  const idx = DOC_STEPS.findIndex((s) => s.key === step);
  const current = DOC_STEPS[idx];
  const endowment = data.investments.reduce((t, i) => t + Number(i.market_value ?? 0), 0);
  const giftsTotal = data.gifts.reduce((t, g) => t + Number(g.amount ?? 0), 0);

  const togglePolicy = (id: string) => {
    const next = adopted.includes(id) ? adopted.filter((x) => x !== id) : [...adopted, id];
    patch({ docBuilder: { ...builder, adoptedPolicies: next } });
  };

  const saveMeta = () =>
    patch({ docBuilder: { ...builder, preparedBy, adoptionDate, notes } });

  const goWord = async () => {
    setBusy(true);
    try {
      await exportFoundationDocx(sections, title);
      toast.success('Word document downloaded');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not build the Word file');
    } finally {
      setBusy(false);
    }
  };

  const goPdf = () => {
    const ok = printFoundationDocument(sections, title);
    if (!ok) toast.error('Allow pop-ups for this site to generate the PDF.');
    else toast.success('Choose "Save as PDF" in the print dialog.');
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-prism-amber/30">
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Foundation Document Builder</p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Walk the eight steps below. Each step pulls from records you already keep in this module, so the finished
            Word or PDF document always matches your live data.
          </p>
          <Progress value={((idx + 1) / DOC_STEPS.length) * 100} className="mt-4 h-2" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DOC_STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  s.key === step
                    ? 'border-prism-amber bg-prism-amber/15 font-medium text-prism-amber'
                    : i < idx
                      ? 'border-prism-lime/40 text-muted-foreground'
                      : 'border-border/60 text-muted-foreground'
                }`}
              >
                {i + 1}. {s.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Step {idx + 1} — {current.label}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{current.blurb}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'review' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StepStat label="Foundation name" value={data.settings?.foundation_name ?? '—'} ok={!!data.settings?.foundation_name} />
                <StepStat label="Directors & officers" value={String(data.governance.filter((g) => g.record_type !== 'committee').length)} ok={data.governance.length > 0} />
                <StepStat label="Pillars" value={String(data.pillars.length)} ok={data.pillars.length > 0} />
                <StepStat label="Initiatives" value={String(data.initiatives.length)} ok={data.initiatives.length > 0} />
                <StepStat label="Endowment value" value={money(endowment)} ok={endowment > 0} />
                <StepStat label="Gifts recorded" value={money(giftsTotal)} ok={giftsTotal > 0} />
                <StepStat label="Compliance items" value={String(data.compliance.length)} ok={data.compliance.length > 0} />
                <StepStat label="Policies adopted" value={`${adopted.length} of ${POLICY_LIBRARY.length}`} ok={adopted.length > 0} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="preparedBy">Prepared by</Label>
                  <Input id="preparedBy" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} onBlur={saveMeta} placeholder="Name and title" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adoptionDate">Board adoption date</Label>
                  <Input id="adoptionDate" type="date" value={adoptionDate} onChange={(e) => setAdoptionDate(e.target.value)} onBlur={saveMeta} />
                </div>
              </div>
            </>
          )}

          {step === 'mission' && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Mission</p>
                <p className="mt-1">{data.settings?.mission ?? 'Not set yet.'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Vision</p>
                <p className="mt-1">{data.settings?.vision ?? 'Not set yet.'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Core values</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(data.settings?.core_values ?? []).map((v: string) => (
                    <Badge key={v} variant="secondary">
                      {v}
                    </Badge>
                  ))}
                  {(data.settings?.core_values ?? []).length === 0 && <span className="text-muted-foreground">None entered.</span>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Legacy statement</p>
                <p className="mt-1">{data.settings?.legacy_statement ?? 'Not set yet.'}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.('mission')}>
                Edit in Mission & Values <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {step === 'board' && (
            <div className="space-y-3">
              {data.governance.length === 0 && <p className="text-sm text-muted-foreground">No board records yet.</p>}
              {data.governance.map((g) => (
                <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[g.role, g.committee].filter(Boolean).join(' · ') || g.record_type}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {g.is_independent && <Badge variant="secondary">Independent</Badge>}
                    <Badge variant="outline">{g.status ?? 'active'}</Badge>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.('governance')}>
                Edit in Governance <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {step === 'policies' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Check each policy the board has adopted. Unchecked policies print as “Pending” so the board can see what
                is still outstanding.
              </p>
              {POLICY_LIBRARY.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-border/50 p-3">
                  <Checkbox checked={adopted.includes(p.id)} onCheckedChange={() => togglePolicy(p.id)} />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.summary}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {step === 'programs' && (
            <div className="space-y-3">
              {data.pillars.map((p) => (
                <div key={p.id} className="rounded-md border border-border/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.name}</p>
                    <span className="text-xs text-muted-foreground">{money(Number(p.annual_budget ?? 0))}/yr</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{(p.focus_areas ?? []).join(' · ') || p.description}</p>
                </div>
              ))}
              {data.initiatives.length > 0 && (
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Initiatives</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {data.initiatives.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3">
                        <span>{i.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {money(Number(i.spent ?? 0))} of {money(Number(i.budget ?? 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.('pillars')}>
                  Edit pillars <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.('grants')}>
                  Grants <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {step === 'funding' && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <StepStat label="Gifts recorded" value={money(giftsTotal)} />
                <StepStat label="Endowment value" value={money(endowment)} />
                <StepStat label="Endowment target" value={money(Number(data.settings?.endowment_target ?? 0))} />
              </div>
              {data.investments.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-md border border-border/50 p-3 text-sm">
                  <span>
                    {i.name} <span className="text-xs text-muted-foreground">· {i.asset_class}</span>
                  </span>
                  <span>{money(Number(i.market_value ?? 0))}</span>
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.('funding')}>
                  Funding & donors <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.('investments')}>
                  Endowment <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {step === 'compliance' && (
            <div className="space-y-2">
              {data.compliance.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3">
                  <div>
                    <p className="text-sm">{c.item}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.authority, c.frequency].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Badge variant={c.status === 'complete' || c.status === 'filed' ? 'default' : 'outline'}>
                    {c.status ?? 'not_started'}
                  </Badge>
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.('compliance')}>
                Edit compliance calendar <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {step === 'generate' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="docNotes">Board notes to include (optional)</Label>
                <Textarea id="docNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveMeta} placeholder="Resolutions, open items, or context for the board packet." />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={!!builder.includeSignature}
                  onCheckedChange={(v) => patch({ docBuilder: { ...builder, includeSignature: !!v } })}
                />
                Include a certification and signature page
              </label>

              <div className="rounded-md border border-border/50 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Document outline</p>
                <ol className="mt-2 space-y-1 text-sm">
                  {sections.map((s) => (
                    <li key={s.heading} className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.heading}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={goWord} disabled={busy} className="gap-1.5">
                  <FileType2 className="h-4 w-4" />
                  {busy ? 'Building…' : 'Download Word (.docx)'}
                </Button>
                <Button variant="outline" onClick={goPdf} className="gap-1.5">
                  <Printer className="h-4 w-4" />
                  Generate PDF
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF opens a print-ready view — choose “Save as PDF” in the print dialog.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <Button
              variant="ghost"
              size="sm"
              disabled={idx === 0}
              className="gap-1"
              onClick={() => setStep(DOC_STEPS[Math.max(0, idx - 1)].key)}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">{isSaving ? 'Saving…' : ''}</span>
            <Button
              size="sm"
              disabled={idx === DOC_STEPS.length - 1}
              className="gap-1"
              onClick={() => setStep(DOC_STEPS[Math.min(DOC_STEPS.length - 1, idx + 1)].key)}
            >
              Next: {DOC_STEPS[Math.min(DOC_STEPS.length - 1, idx + 1)].label} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Educational planning only. Not legal, tax, accounting, or investment advice. Have counsel and a CPA review every
        generated document before the board adopts it.
      </p>
    </div>
  );
}
