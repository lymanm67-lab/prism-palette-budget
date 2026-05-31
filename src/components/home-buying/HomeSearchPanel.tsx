import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Search, ExternalLink, Loader2, Home, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fmt$ } from '@/lib/home-buying/mortgage-math';

interface Listing {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  url: string;
  style?: string;
  features?: string[];
}

const STYLES = ['Any', 'Ranch', 'Colonial', 'Craftsman', 'Cape Cod', 'Contemporary', 'Tudor', 'Victorian', 'Townhouse', 'Condo'];

export default function HomeSearchPanel() {
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState(200000);
  const [maxPrice, setMaxPrice] = useState(450000);
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [minSqft, setMinSqft] = useState(1200);
  const [style, setStyle] = useState('Any');
  const [needsGarage, setNeedsGarage] = useState(false);
  const [needsBasement, setNeedsBasement] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectorMissing, setConnectorMissing] = useState(false);

  const search = async () => {
    if (!location.trim()) { toast.error('Enter a city, ZIP, or area'); return; }
    setLoading(true);
    setConnectorMissing(false);
    try {
      const { data, error } = await supabase.functions.invoke('home-listings-search', {
        body: { location, minPrice, maxPrice, beds, baths, minSqft, style, needsGarage, needsBasement },
      });
      if (error) throw error;
      if (data?.error === 'firecrawl_not_configured') {
        setConnectorMissing(true);
        setListings([]);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        setListings(data?.listings ?? []);
        if (!data?.listings?.length) toast.info('No listings found — try widening your criteria.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display">
            <Search className="h-5 w-5 text-prism-teal" />
            Home Search
          </CardTitle>
          <p className="text-xs text-muted-foreground">Live results pulled from public Redfin listings. (Not a substitute for a licensed agent.)</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2"><Label className="text-xs">City, ZIP, or area</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Austin, TX or 78704" /></div>
            <div><Label className="text-xs">Min Price</Label><Input type="number" value={minPrice} onChange={(e) => setMinPrice(+e.target.value)} /></div>
            <div><Label className="text-xs">Max Price</Label><Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} /></div>
            <div><Label className="text-xs">Min Beds</Label><Input type="number" value={beds} onChange={(e) => setBeds(+e.target.value)} /></div>
            <div><Label className="text-xs">Min Baths</Label><Input type="number" value={baths} onChange={(e) => setBaths(+e.target.value)} /></div>
            <div><Label className="text-xs">Min Sqft</Label><Input type="number" value={minSqft} onChange={(e) => setMinSqft(+e.target.value)} /></div>
            <div>
              <Label className="text-xs">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm mt-5"><input type="checkbox" checked={needsGarage} onChange={(e) => setNeedsGarage(e.target.checked)} /> Garage</label>
            <label className="flex items-center gap-2 text-sm mt-5"><input type="checkbox" checked={needsBasement} onChange={(e) => setNeedsBasement(e.target.checked)} /> Basement</label>
          </div>
          <Button onClick={search} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Searching…' : 'Search Homes'}
          </Button>
        </CardContent>
      </Card>

      {connectorMissing && (
        <Card className="border-prism-amber/40 bg-prism-amber/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-prism-amber shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Home search needs the Firecrawl connector</p>
              <p className="text-muted-foreground text-xs mt-1">
                Home search uses Firecrawl to scrape public Redfin pages. Connect Firecrawl from <strong>Connectors</strong> (left sidebar) → search "Firecrawl" → Connect. Then come back here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-border/40 bg-card/40 p-3 hover:border-prism-teal/40 hover:bg-prism-teal/5 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <Home className="h-4 w-4 text-prism-teal" />
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="font-display text-lg font-bold prism-gradient-text">{fmt$(l.price)}</p>
              <p className="text-sm font-medium line-clamp-1">{l.address}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {l.beds} bd · {l.baths} ba · {l.sqft?.toLocaleString()} sqft
              </p>
              {l.style && <p className="text-xs text-muted-foreground">{l.style}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
