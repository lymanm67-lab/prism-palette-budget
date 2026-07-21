import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFamilyConstitution, useUpsertConstitution, useDraftConstitutionSection } from '@/hooks/use-financial-os';
import { Sparkles, Download } from 'lucide-react';

const SECTIONS: Array<{ key: string; label: string; description: string }> = [
  { key: 'mission', label: 'Family Mission', description: 'Why we exist as a family.' },
  { key: 'values', label: 'Core Values', description: 'Non-negotiables that shape decisions.' },
  { key: 'faith', label: 'Faith / Spiritual Principles', description: 'Faith foundations that guide us.' },
  { key: 'financial', label: 'Financial Principles', description: 'How we handle money as a family.' },
  { key: 'investment', label: 'Investment Philosophy', description: 'How we grow wealth.' },
  { key: 'giving', label: 'Giving Philosophy', description: 'How we support others.' },
  { key: 'business', label: 'Business Philosophy', description: 'How family businesses operate.' },
  { key: 'education', label: 'Education Philosophy', description: 'Lifelong learning approach.' },
  { key: 'marriage', label: 'Marriage Philosophy', description: 'Expectations within marriages.' },
  { key: 'decision_rules', label: 'Decision Rules', description: 'Who decides what, and when.' },
  { key: 'trustee_expectations', label: 'Trustee Expectations', description: 'Duties of the trustees.' },
  { key: 'summit_agenda', label: 'Annual Family Wealth Summit', description: 'What we discuss each year.' },
  { key: 'legacy_letter', label: 'Legacy Letter', description: 'A personal letter to future generations.' },
  { key: 'ethical_will', label: 'Ethical Will', description: 'Values and lessons — separate from a legal will.' },
];

export function FamilyConstitutionWizard() {
  const { data: existing } = useFamilyConstitution();
  const upsert = useUpsertConstitution();
  const draft = useDraftConstitutionSection();

  const [familyName, setFamilyName] = useState('Our Family');
  const [sections, setSections] = useState<Record<string, string>>({});
  const [id, setId] = useState<string | undefined>();

  useEffect(() => {
    if (existing) {
      setId(existing.id);
      setFamilyName(existing.family_name || 'Our Family');
      setSections(existing.sections || {});
    }
  }, [existing]);

  const draftSection = async (key: string) => {
    const value = await draft.mutateAsync({ section: key, family_name: familyName, existing: sections[key] });
    if (value) setSections(s => ({ ...s, [key]: value }));
  };

  const save = async (published = false) => {
    await upsert.mutateAsync({
      id, family_name: familyName, sections,
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
    });
  };

  const exportPdf = () => {
    // Simple print-to-PDF via browser print
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${familyName} Family Constitution</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111}h1{text-align:center;font-size:2rem}h2{border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:2rem}p{white-space:pre-wrap}</style>
      </head><body>
      <h1>${familyName} Family Constitution</h1>
      <p style="text-align:center;font-style:italic;color:#666">Published ${new Date().toLocaleDateString()}</p>
      ${SECTIONS.map(s => sections[s.key] ? `<h2>${s.label}</h2><p>${sections[s.key]}</p>` : '').join('')}
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Family Constitution</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Family name</Label>
            <Input value={familyName} onChange={e => setFamilyName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save(false)} disabled={upsert.isPending}>Save draft</Button>
            <Button size="sm" variant="secondary" onClick={() => save(true)} disabled={upsert.isPending}>Publish</Button>
            <Button size="sm" variant="outline" onClick={exportPdf}><Download className="h-3 w-3 mr-1" /> Export</Button>
          </div>
        </CardContent>
      </Card>

      {SECTIONS.map(s => (
        <Card key={s.key}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{s.label}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => draftSection(s.key)} disabled={draft.isPending}>
                <Sparkles className="h-3 w-3 mr-1" />
                {draft.isPending ? 'Drafting…' : 'AI draft'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sections[s.key] || ''}
              onChange={e => setSections(x => ({ ...x, [s.key]: e.target.value }))}
              className="min-h-[120px]"
              placeholder={`Write your ${s.label.toLowerCase()}, or click "AI draft" for a starting point…`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
