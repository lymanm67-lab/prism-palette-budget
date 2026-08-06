import { useMemo, useState } from 'react';
import { Sparkles, FileDown, FileText, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useFdnSettings, useFdnPillars, useFdnInitiatives, useFdnRoadmap, useFdnRelationships, useFdnLegacyNodes,
} from '@/hooks/use-foundation';
import {
  useFdnGovernance, useFdnCompliance, useFdnGifts, useFdnInvestments, useFdnGrants,
  useFdnSuccession, useFdnInsurance, useFdnBenchmarks, useFdnDocuments,
} from '@/hooks/use-foundation-ops';
import { useSaveBinderDoc } from '@/hooks/use-foundation-binder';
import { latestVersions, type BinderDoc } from '@/lib/legacy/foundationBinder';
import {
  BINDER_TEMPLATES, PACKETS, templatesForSection, templatesForPacket, type BinderContext, type PacketKey,
} from '@/lib/legacy/binderTemplates';
import { exportBinderWord, printBinder } from '@/lib/legacy/binderExport';

interface Props {
  section: string;
  docs: BinderDoc[];
}

export default function BinderToolbar({ section, docs }: Props) {
  const settings = useFdnSettings();
  const pillars = useFdnPillars();
  const initiatives = useFdnInitiatives();
  const roadmap = useFdnRoadmap();
  const relationships = useFdnRelationships();
  const legacyNodes = useFdnLegacyNodes();
  const governance = useFdnGovernance();
  const compliance = useFdnCompliance();
  const gifts = useFdnGifts();
  const investments = useFdnInvestments();
  const grants = useFdnGrants();
  const succession = useFdnSuccession();
  const insurance = useFdnInsurance();
  const benchmarks = useFdnBenchmarks();
  const documents = useFdnDocuments();
  const save = useSaveBinderDoc();
  const [busy, setBusy] = useState(false);

  const org = settings.data?.foundation_name || 'Dr. Lyman A. Montgomery Family Foundation';

  const ctx: BinderContext = useMemo(() => ({
    settings: settings.data ?? null,
    pillars: pillars.data ?? [],
    initiatives: initiatives.data ?? [],
    roadmap: roadmap.data ?? [],
    relationships: relationships.data ?? [],
    legacyNodes: legacyNodes.data ?? [],
    governance: governance.data ?? [],
    compliance: compliance.data ?? [],
    gifts: gifts.data ?? [],
    investments: investments.data ?? [],
    grants: grants.data ?? [],
    succession: succession.data ?? [],
    insurance: insurance.data ?? [],
    benchmarks: benchmarks.data ?? [],
    documents: documents.data ?? [],
  }), [settings.data, pillars.data, initiatives.data, roadmap.data, relationships.data, legacyNodes.data,
    governance.data, compliance.data, gifts.data, investments.data, grants.data, succession.data,
    insurance.data, benchmarks.data, documents.data]);

  const live = useMemo(() => latestVersions(docs), [docs]);
  const byCode = useMemo(() => new Map(live.map((d) => [d.doc_code, d])), [live]);

  /** Generates (or refreshes) every template document for a set of templates. */
  const generate = async (templates: typeof BINDER_TEMPLATES, label: string) => {
    setBusy(true);
    let created = 0;
    let refreshed = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < templates.length; i++) {
        const t = templates[i];
        const body = t.build(ctx);
        const existing = byCode.get(t.doc_code);
        if (existing && existing.status === 'approved') { skipped++; continue; }
        if (existing && existing.body === body) { skipped++; continue; }
        await save.mutateAsync({
          ...(existing ? { id: existing.id } : {}),
          section: t.section,
          doc_code: t.doc_code,
          title: t.title,
          purpose: t.purpose,
          body,
          tags: t.tags,
          cross_refs: t.cross_refs,
          sort_order: i,
          ...(existing ? {} : { status: 'draft' }),
        });
        existing ? refreshed++ : created++;
      }
      toast.success(`${label}: ${created} created, ${refreshed} refreshed, ${skipped} unchanged`);
    } catch (e: any) {
      toast.error(e.message ?? 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const sectionTemplates = templatesForSection(section);
  const sectionLive = live.filter((d) => d.section === section);
  const stale = sectionTemplates.filter((t) => {
    const ex = byCode.get(t.doc_code);
    return ex && ex.status !== 'approved' && ex.body !== t.build(ctx);
  }).length;
  const missing = sectionTemplates.filter((t) => !byCode.get(t.doc_code)).length;

  const packetDocs = (key: PacketKey) => {
    const codes = templatesForPacket(key).map((t) => t.doc_code);
    return codes.map((c) => byCode.get(c)).filter(Boolean) as BinderDoc[];
  };

  const exportPacket = async (key: PacketKey, kind: 'word' | 'pdf') => {
    const packet = PACKETS.find((p) => p.key === key)!;
    const list = packetDocs(key);
    if (!list.length) { toast.error('Generate the documents for this packet first.'); return; }
    if (kind === 'word') await exportBinderWord(list, org, `${key}-packet`, packet.label);
    else if (!printBinder(list, org, packet.label)) toast.error('Allow pop-ups to export the packet.');
  };

  return (
    <Card className="glass-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">This section</span>
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => generate(sectionTemplates, 'Section generated')}>
            <Sparkles className="h-4 w-4" />
            {missing ? `Generate ${missing} document${missing === 1 ? '' : 's'}` : stale ? `Refresh ${stale} out-of-date` : 'Regenerate section'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!sectionLive.length}
            onClick={() => exportBinderWord(sectionLive, org, `${section}-section`)}>
            <FileDown className="h-4 w-4" /> Word
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!sectionLive.length}
            onClick={() => { if (!printBinder(sectionLive, org)) toast.error('Allow pop-ups to export.'); }}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5" disabled={busy}
            onClick={() => generate(BINDER_TEMPLATES, 'Full binder generated')}>
            <Package className="h-4 w-4" /> Generate all 8 sections
          </Button>
        </div>

        {stale > 0 && (
          <p className="text-[11px] text-prism-amber">
            {stale} document{stale === 1 ? '' : 's'} in this section no longer match your live foundation records. Approved
            versions are never overwritten — refresh creates an updated draft.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Packets</span>
          {PACKETS.map((p) => (
            <span key={p.key} className="inline-flex items-center overflow-hidden rounded-full border border-border/50">
              <span className="px-2.5 py-1 text-xs font-medium" title={p.blurb}>{p.label}</span>
              <button className="border-l border-border/50 px-2 py-1 text-[11px] hover:bg-primary/10"
                onClick={() => exportPacket(p.key, 'word')}>Word</button>
              <button className="border-l border-border/50 px-2 py-1 text-[11px] hover:bg-primary/10"
                onClick={() => exportPacket(p.key, 'pdf')}>PDF</button>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
