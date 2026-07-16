import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Heart, X, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import type { FavoriteEntry } from '@/hooks/use-home-search-profile';
import { fmt$ } from '@/lib/home-buying/mortgage-math';

interface Props {
  favorites: FavoriteEntry[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FavoriteEntry>) => void;
}

export default function FavoritesDashboard({ favorites, onRemove, onUpdate }: Props) {
  if (favorites.length === 0) {
    return (
      <Card className="prism-card-shine border-border/50 border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Save listings from the search results to build your shortlist.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...favorites].sort((a, b) => a.rank - b.rank);
  const move = (id: string, delta: number) => {
    const idx = sorted.findIndex((f) => f.id === id);
    const swap = sorted[idx + delta];
    if (!swap) return;
    onUpdate(id, { rank: swap.rank });
    onUpdate(swap.id, { rank: sorted[idx].rank });
  };

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <Heart className="h-5 w-5 text-prism-amber fill-prism-amber" />
          Favorites Dashboard ({favorites.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">Rank, annotate, and track showings, offers, and closing for each saved property.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((f, i) => (
          <div key={f.id} className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button onClick={() => move(f.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-prism-teal disabled:opacity-30">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => move(f.id, 1)} disabled={i === sorted.length - 1} className="text-muted-foreground hover:text-prism-teal disabled:opacity-30">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="font-display text-lg font-bold prism-gradient-text w-6">#{i + 1}</div>
                <div>
                  <div className="font-medium text-sm">{f.address}</div>
                  <div className="text-xs text-muted-foreground">{fmt$(f.price)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-prism-teal">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => onRemove(f.id)} className="text-muted-foreground hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <Label className="text-[10px]">Showing Date</Label>
                <Input type="date" className="h-8 text-xs" value={f.showingDate ?? ''} onChange={(e) => onUpdate(f.id, { showingDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Offer Amount</Label>
                <Input type="number" className="h-8 text-xs" value={f.offerAmount ?? ''} onChange={(e) => onUpdate(f.id, { offerAmount: e.target.value ? +e.target.value : undefined })} placeholder="—" />
              </div>
              <div>
                <Label className="text-[10px]">Offer Status</Label>
                <Select value={f.offerStatus ?? 'none'} onValueChange={(v) => onUpdate(f.id, { offerStatus: v as FavoriteEntry['offerStatus'] })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Closing Date</Label>
                <Input type="date" className="h-8 text-xs" value={f.closingDate ?? ''} onChange={(e) => onUpdate(f.id, { closingDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <Label className="text-[10px]">Notes</Label>
                <Input className="h-8 text-xs" value={f.notes} onChange={(e) => onUpdate(f.id, { notes: e.target.value })} placeholder="Kitchen needs paint, big backyard…" />
              </div>
              <div>
                <Label className="text-[10px]">Inspection Notes</Label>
                <Input className="h-8 text-xs" value={f.inspectionNotes ?? ''} onChange={(e) => onUpdate(f.id, { inspectionNotes: e.target.value })} placeholder="Roof 8 yrs, HVAC 4 yrs, minor mold" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
