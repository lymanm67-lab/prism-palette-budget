import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

interface Filters {
  location: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  minSqft?: number;
  style?: string;
  needsGarage?: boolean;
  needsBasement?: boolean;
}

type Source = "redfin" | "realtor" | "homes";

interface RawListing {
  address: string;
  price: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  style?: string;
  url: string;
}

interface Listing extends RawListing {
  source: Source;
  sources?: Source[];
}

function slug(s: string) { return encodeURIComponent(s.trim()); }
function slugDash(s: string) { return s.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "-"); }

function buildRedfinUrl(f: Filters): string {
  const filters: string[] = [];
  if (f.minPrice) filters.push(`min-price=${Math.round(f.minPrice / 1000)}k`);
  if (f.maxPrice) filters.push(`max-price=${Math.round(f.maxPrice / 1000)}k`);
  if (f.beds) filters.push(`min-beds=${f.beds}`);
  if (f.baths) filters.push(`min-baths=${f.baths}`);
  if (f.minSqft) filters.push(`min-sqft=${f.minSqft}-sqft`);
  if (f.needsGarage) filters.push(`has-garage`);
  if (f.needsBasement) filters.push(`has-basement`);
  const filterPart = filters.length ? `/filter/${filters.join(",")}` : "";
  return `https://www.redfin.com/search/${slug(f.location)}${filterPart}`;
}

function buildRealtorUrl(f: Filters): string {
  // Realtor.com format: /realestateandhomes-search/<location-slug>/beds-N/baths-N/price-min-max/sqft-min
  const parts: string[] = [`https://www.realtor.com/realestateandhomes-search/${slugDash(f.location)}`];
  if (f.beds) parts.push(`beds-${f.beds}`);
  if (f.baths) parts.push(`baths-${f.baths}`);
  if (f.minPrice || f.maxPrice) {
    parts.push(`price-${f.minPrice ?? "na"}-${f.maxPrice ?? "na"}`);
  }
  if (f.minSqft) parts.push(`sqft-${f.minSqft}`);
  return parts.join("/");
}

function buildHomesUrl(f: Filters): string {
  // Homes.com format: /<location-slug>/homes-for-sale/?min_price=&max_price=&min_beds=&min_baths=
  const qs = new URLSearchParams();
  if (f.minPrice) qs.set("min_price", String(f.minPrice));
  if (f.maxPrice) qs.set("max_price", String(f.maxPrice));
  if (f.beds) qs.set("min_beds", String(f.beds));
  if (f.baths) qs.set("min_baths", String(f.baths));
  if (f.minSqft) qs.set("min_sqft", String(f.minSqft));
  const q = qs.toString();
  return `https://www.homes.com/${slugDash(f.location)}/homes-for-sale/${q ? "?" + q : ""}`;
}

const SCHEMA = {
  type: "object",
  properties: {
    listings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          address: { type: "string" },
          price: { type: "number" },
          beds: { type: "number" },
          baths: { type: "number" },
          sqft: { type: "number" },
          style: { type: "string" },
          url: { type: "string" },
        },
        required: ["address", "price", "url"],
      },
    },
  },
  required: ["listings"],
};

async function scrapeSource(source: Source, url: string, origin: string, apiKey: string): Promise<Listing[]> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        waitFor: 1500,
        formats: [{
          type: "json",
          prompt: "Extract up to 20 home listings from this real estate search page. For each: address, price (as number, no $ or commas), beds (number), baths (number), sqft (number), style (e.g. Ranch, Colonial, if visible), url (full URL to the listing page).",
          schema: SCHEMA,
        }],
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error(`[${source}] Firecrawl error`, res.status, body?.error ?? body);
      return [];
    }
    const extracted = body?.data?.json ?? body?.json ?? {};
    const raw = (extracted?.listings ?? []) as RawListing[];
    return raw
      .filter((l) => l && l.price && l.address && l.url)
      .map((l) => ({
        address: String(l.address).trim(),
        price: Number(l.price),
        beds: Number(l.beds ?? 0),
        baths: Number(l.baths ?? 0),
        sqft: Number(l.sqft ?? 0),
        style: l.style,
        url: l.url.startsWith("http") ? l.url : `${origin}${l.url}`,
        source,
      }));
  } catch (e) {
    console.error(`[${source}] scrape failed`, e);
    return [];
  }
}

function normAddress(a: string): string {
  return a.toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|boulevard|blvd|court|ct|place|pl|way|terrace|ter)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeAndDedupe(all: Listing[]): Listing[] {
  const byKey = new Map<string, Listing>();
  for (const l of all) {
    const key = normAddress(l.address);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...l, sources: [l.source] });
    } else {
      // Merge: keep the record with the most complete data, track all sources
      const sources = Array.from(new Set([...(existing.sources ?? [existing.source]), l.source]));
      const better =
        (l.sqft && !existing.sqft) || (l.beds && !existing.beds) || (l.baths && !existing.baths)
          ? { ...existing, ...l }
          : existing;
      byKey.set(key, { ...better, sources });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.price - b.price);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const filters: Filters = await req.json();
    if (!filters?.location) throw new Error("location required");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "firecrawl_not_configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redfinUrl = buildRedfinUrl(filters);
    const realtorUrl = buildRealtorUrl(filters);
    const homesUrl = buildHomesUrl(filters);
    console.log("Scraping in parallel:", { redfinUrl, realtorUrl, homesUrl });

    const [redfin, realtor, homes] = await Promise.all([
      scrapeSource("redfin", redfinUrl, "https://www.redfin.com", FIRECRAWL_API_KEY),
      scrapeSource("realtor", realtorUrl, "https://www.realtor.com", FIRECRAWL_API_KEY),
      scrapeSource("homes", homesUrl, "https://www.homes.com", FIRECRAWL_API_KEY),
    ]);

    const merged = mergeAndDedupe([...redfin, ...realtor, ...homes]);

    return new Response(
      JSON.stringify({
        listings: merged,
        sourceUrls: { redfin: redfinUrl, realtor: realtorUrl, homes: homesUrl },
        counts: { redfin: redfin.length, realtor: realtor.length, homes: homes.length, merged: merged.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("home-listings-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
