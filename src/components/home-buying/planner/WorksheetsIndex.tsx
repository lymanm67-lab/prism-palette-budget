import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WORKSHEETS } from '@/lib/home-buying/planner/worksheet-defs';
import GenericWorksheet from './GenericWorksheet';

export default function WorksheetsIndex({ projectId }: { projectId: string }) {
  const [active, setActive] = useState<string | null>(null);
  const def = WORKSHEETS.find((w) => w.type === active);

  if (def) {
    return (
      <div className="space-y-3">
        <Button size="sm" variant="outline" onClick={() => setActive(null)}>← Back to worksheets</Button>
        <GenericWorksheet projectId={projectId} def={def} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {WORKSHEETS.map((w) => (
        <Card
          key={w.type}
          className="prism-card-shine border-border/50 cursor-pointer hover:border-prism-teal/50 transition-colors"
          onClick={() => setActive(w.type)}
        >
          <CardContent className="p-4 space-y-1">
            <div className="font-display font-bold text-sm">{w.title}</div>
            <p className="text-xs text-muted-foreground line-clamp-2">{w.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
