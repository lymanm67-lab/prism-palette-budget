import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, FileText, Scale } from 'lucide-react';
import { LETTER_TEMPLATES, LETTER_CATEGORIES, type LetterCategory, type LetterTemplate } from '@/lib/credit-repair/letter-templates';
import LetterGenerator from './LetterGenerator';

interface Props {
  defaultTemplateId?: string | null;
}

export default function LetterLibrary({ defaultTemplateId }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LetterCategory | 'all'>('all');
  const [selected, setSelected] = useState<LetterTemplate | null>(
    defaultTemplateId ? LETTER_TEMPLATES.find(t => t.id === defaultTemplateId) || null : null
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return LETTER_TEMPLATES.filter(t => {
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.legalBasis.toLowerCase().includes(q);
    });
  }, [query, category]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Letter Library — {LETTER_TEMPLATES.length} templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates (goodwill, MOV, CFPB, HIPAA…)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={category === 'all' ? 'default' : 'outline'}
              onClick={() => setCategory('all')}
              className="text-xs"
            >
              All ({LETTER_TEMPLATES.length})
            </Button>
            {LETTER_CATEGORIES.map(c => {
              const count = LETTER_TEMPLATES.filter(t => t.category === c.id).length;
              return (
                <Button
                  key={c.id}
                  size="sm"
                  variant={category === c.id ? 'default' : 'outline'}
                  onClick={() => setCategory(c.id)}
                  className="text-xs"
                >
                  {c.label} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map(t => (
          <Card
            key={t.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/30 hover:border-l-primary"
            onClick={() => setSelected(t)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm leading-tight">{t.name}</h4>
                <Badge variant="outline" className="text-[9px] shrink-0">{t.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground border-t pt-2">
                <Scale className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="italic">{t.legalBasis}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No templates match "{query}"
        </Card>
      )}

      {selected && (
        <LetterGenerator
          template={selected}
          open={!!selected}
          onOpenChange={(o) => { if (!o) setSelected(null); }}
        />
      )}
    </div>
  );
}
