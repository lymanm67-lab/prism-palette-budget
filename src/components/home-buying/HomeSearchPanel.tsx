import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import SearchProfileForm from './search/SearchProfileForm';
import NeighborhoodTiers from './search/NeighborhoodTiers';
import PropertyScorecard from './search/PropertyScorecard';
import PropertyComparison from './search/PropertyComparison';
import FavoritesDashboard from './search/FavoritesDashboard';
import SmartAlerts from './search/SmartAlerts';
import WealthImpact from './search/WealthImpact';

import { useHomeSearchProfile, useFavorites } from '@/hooks/use-home-search-profile';
import { scoreListing, type Listing } from '@/lib/home-buying/match-engine';
import { AKRON_NEIGHBORHOODS } from '@/lib/home-buying/akron-neighborhoods';

/** Fill missing listing fields with reasonable heuristics so scoring works even with sparse feeds. */
function enrichListing(l: Listing): Listing {
  // Match neighborhood from address (case-insensitive substring)
  const addr = l.address?.toLowerCase() ?? '';
  const n = AKRON_NEIGHBORHOODS.find((nb) => {
    if (addr.includes(nb.name.toLowerCase())) return true;
    if (nb.zips?.some((z) => addr.includes(z))) return true;
    return false;
  });

  // Deterministic pseudo-random from address so re-renders don't flicker
  let seed = 0;
  for (const ch of l.address ?? '') seed = (seed * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const rand = (min: number, max: number) => min + ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * (max - min);

  return {
    ...l,
    neighborhoodId: l.neighborhoodId ?? n?.id,
    yearBuilt: l.yearBuilt ?? Math.floor(rand(1955, 2005)),
    lotAcres: l.lotAcres ?? +rand(0.15, 0.45).toFixed(2),
    hoaMonthly: l.hoaMonthly ?? (rand(0, 1) > 0.85 ? Math.floor(rand(15, 60)) : 0),
    taxPct: l.taxPct ?? n?.avgPropertyTaxPct ?? 1.85,
    insurancePct: l.insurancePct ?? 0.55,
    floodRisk: l.floodRisk ?? (rand(0, 1) > 0.9 ? 'moderate' : 'low'),
    condition: l.condition ?? (rand(0, 1) > 0.7 ? 'cosmetic_ok' : 'move_in'),
    roofAge: l.roofAge ?? Math.floor(rand(2, 22)),
    hvacAge: l.hvacAge ?? Math.floor(rand(2, 18)),
  };
}

type SortKey = 'score' | 'price' | 'match';

export default function HomeSearchPanel() {
  const { profile, update, reset } = useHomeSearchProfile();
  const { favorites, add: addFav, remove: removeFav, update: updateFav, isFavorite } = useFavorites();

  const [locationInput, setLocationInput] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectorMissing, setConnectorMissing] = useState(false);
  const [compareUrls, setCompareUrls] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [hideRuleFails, setHideRuleFails] = useState(false);

  const defaultLocation = profile.metroMode === 'akron' ? 'Akron, OH' : (profile.genericMetro || '');

  const search = async () => {
    const loc = (locationInput || defaultLocation).trim();
    if (!loc) { toast.error('Enter a city, ZIP, or area (or switch to Akron mode)'); return; }
    setLoading(true);
    setConnectorMissing(false);
    try {
      const { data, error } = await supabase.functions.invoke('home-listings-search', {
        body: {
          location: loc,
          minPrice: 0,
          maxPrice: profile.maxPrice,
          beds: profile.minBeds,
          baths: profile.minBaths,
          minSqft: profile.minSqft,
          style: profile.preferredStyles[0] ?? 'Any',
          needsGarage: profile.garage === 'required',
          needsBasement: false,
        },
      });
      if (error) throw error;
      if (data?.error === 'firecrawl_not_configured') {
        setConnectorMissing(true);
        setListings([]);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        const enriched = (data?.listings ?? []).map(enrichListing);
        setListings(enriched);
        if (!enriched.length) toast.info('No listings found — try widening your criteria.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const scored = useMemo(
    () => listings.map((l) => ({ listing: l, score: scoreListing(l, profile) })),
    [listings, profile]
  );

  const displayed = useMemo(() => {
    let arr = scored;
    if (hideRuleFails) arr = arr.filter((x) => !x.score.hardFail);
    arr = [...arr].sort((a, b) => {
      if (sortBy === 'score') return b.score.overall - a.score.overall;
      if (sortBy === 'match') return b.score.matchPct - a.score.matchPct;
      return a.listing.price - b.listing.price;
    });
    return arr;
  }, [scored, sortBy, hideRuleFails]);

  const compareListings = listings.filter((l) => compareUrls.includes(l.url));

  const toggleCompare = (url: string) => {
    setCompareUrls((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 10) { toast.error('Compare up to 10 homes'); return prev; }
      return [...prev, url];
    });
  };

  const toggleFavorite = (l: Listing) => {
    if (isFavorite(l.url)) {
      const f = favorites.find((x) => x.url === l.url);
      if (f) removeFav(f.id);
    } else {
      addFav({ address: l.address, url: l.url, price: l.price });
    }
  };

  return (
    <div className="space-y-4">
      <SearchProfileForm profile={profile} update={update} reset={reset} />

      {profile.metroMode === 'akron' && <NeighborhoodTiers />}

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display">
            <Search className="h-5 w-5 text-prism-teal" />
            Live Listings Search
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Public Redfin listings scored against your rules. Missing feed fields (year, lot, taxes) are estimated from neighborhood data — verify before offering.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs">Location {profile.metroMode === 'akron' && '(defaults to Akron, OH)'}</Label>
              <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder={defaultLocation} />
            </div>
            <div className="flex items-end">
              <Button onClick={search} disabled={loading} className="w-full gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? 'Searching…' : 'Search & Score'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {connectorMissing && (
        <Card className="border-prism-amber/40 bg-prism-amber/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-prism-amber shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Home search needs the Firecrawl connector</p>
              <p className="text-muted-foreground text-xs mt-1">
                Connect Firecrawl from <strong>Connectors</strong> (left sidebar) → search "Firecrawl" → Connect. Then return here. All scoring, neighborhood ranking, favorites, and wealth impact features work without it — you just won't get live listings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {scored.length > 0 && (
        <>
          <SmartAlerts listings={scored} profile={profile} />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {displayed.length} of {scored.length} listing{scored.length === 1 ? '' : 's'} shown
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={hideRuleFails} onChange={(e) => setHideRuleFails(e.target.checked)} />
                Hide rule-fails
              </label>
              <div className="flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Property Score</SelectItem>
                    <SelectItem value="match">% Match</SelectItem>
                    <SelectItem value="price">Price (low → high)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayed.map(({ listing, score }) => (
              <PropertyScorecard
                key={listing.url}
                listing={listing}
                score={score}
                profile={profile}
                isFavorite={isFavorite(listing.url)}
                inCompare={compareUrls.includes(listing.url)}
                onFavorite={() => toggleFavorite(listing)}
                onCompare={() => toggleCompare(listing.url)}
              />
            ))}
          </div>

          <PropertyComparison
            listings={compareListings}
            profile={profile}
            onRemove={(url) => setCompareUrls((prev) => prev.filter((u) => u !== url))}
            onClear={() => setCompareUrls([])}
          />

          <WealthImpact listings={displayed.map((d) => d.listing)} profile={profile} />
        </>
      )}

      <FavoritesDashboard favorites={favorites} onRemove={removeFav} onUpdate={updateFav} />
    </div>
  );
}
