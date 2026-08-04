import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MhStat } from '@/components/medical-housing/MhFields';
import ThvRecordManager, { type ThvField } from '@/components/tiny-home-village/ThvRecordManager';
import { cn } from '@/lib/utils';
import { useThvDocuments, useThvUpsert } from '@/hooks/use-tiny-home-village';
import { DOCUMENT_TYPES, DOCUMENT_TAGS, DOCUMENT_STATUSES } from '@/lib/legacy/tinyHomeVillage';

const FIELDS: ThvField[] = [
  { key: 'title', label: 'Document title', type: 'text' },
  { key: 'doc_type', label: 'Document type', type: 'select', options: DOCUMENT_TYPES },
  { key: 'status', label: 'Status', type: 'select', options: DOCUMENT_STATUSES },
  { key: 'external_url', label: 'Link (cloud drive or portal)', type: 'text', span: 2 },
  { key: 'notes', label: 'Notes', type: 'textarea', span: 3 },
];

export default function VillageDocumentsTab() {
  const { data: docs = [] } = useThvDocuments();
  const upsert = useThvUpsert('thv_documents');

  const finals = docs.filter((d) => ['Final', 'Signed'].includes(d.status)).length;
  const drafts = docs.filter((d) => d.status === 'Draft').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Documents tracked" value={String(docs.length)} />
        <MhStat label="Final or signed" value={String(finals)} tone="good" />
        <MhStat label="Still in draft" value={String(drafts)} tone={drafts ? 'warn' : 'neutral'} />
        <MhStat label="Document types covered" value={`${new Set(docs.map((d) => d.doc_type)).size} / ${DOCUMENT_TYPES.length}`} />
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          This is a household-private index of village records — feasibility studies, zoning correspondence, bids,
          grant applications, resident policies, and impact reports. Store files in your household document vault or a
          secure drive and link them here. Never record resident names or case details in this library.
        </CardContent>
      </Card>

      <ThvRecordManager
        table="thv_documents"
        rows={docs}
        fields={FIELDS}
        titleKey="title"
        addLabel="Add document"
        defaults={{ title: 'New document', doc_type: 'Feasibility studies', status: 'Draft', tags: [] }}
        badgeKey="status"
        subtitle={(r) => [r.doc_type, (r.tags ?? []).join(', ')].filter(Boolean).join(' · ')}
        emptyText="No village documents indexed yet."
        renderExtra={(row) => {
          const tags: string[] = row.tags ?? [];
          const toggle = (t: string) =>
            upsert.mutate({
              id: row.id,
              tags: tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t],
            });
          return (
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {DOCUMENT_TAGS.map((t) => (
                  <button key={t} onClick={() => toggle(t)}>
                    <Badge
                      variant={tags.includes(t) ? 'default' : 'outline'}
                      className={cn('cursor-pointer text-[10px]', tags.includes(t) && 'bg-prism-teal/80')}
                    >
                      {t}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
