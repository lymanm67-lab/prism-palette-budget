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

function buildRedfinUrl(f: Filters): string {
  // Redfin's URL format: /city/<state-code>/<city-name>/filter/...
  // Easier: use the search redirect via /stingray/api/gis-search? but that's private.
  // Best safe public approach: build the city search slug via the public "search" path.
  const slug = encodeURIComponent(f.location.trim());
  const filters: string[] = [];
  if (f.minPrice) filters.push(`min-price=${Math.round(f.minPrice / 1000)}k`);
  if (f.maxPrice) filters.push(`max-price=${Math.round(f.maxPrice / 1000)}k`);
  if (f.beds) filters.push(`min-beds=${f.beds}`);
  if (f.baths) filters.push(`min-baths=${f.baths}`);
  if (f.minSqft) filters.push(`min-sqft=${f.minSqft}-sqft`);
  if (f.needsGarage) filters.push(`has-garage`);
  if (f.needsBasement) filters.push(`has-basement`);
  const filterPart = filters.length ? `/filter/${filters.join(",")}` : "";
  return `https://www.redfin.com/search/${slug}${filterPart}`;
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

    const url = buildRedfinUrl(filters);
    console.log("Scraping:", url);

    const fcRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        waitFor: 1500,
        formats: [{
          type: "json",
          prompt: "Extract up to 20 home listings from this real estate search page. For each: address, price (as number, no $ or commas), beds (number), baths (number), sqft (number), style (e.g. Ranch, Colonial, if visible), url (full URL to the listing page).",
          schema: {
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
          },
        }],
      }),
    });

    const fc = await fcRes.json();
    if (!fcRes.ok) {
      console.error("Firecrawl error", fcRes.status, fc);
      return new Response(JSON.stringify({ error: fc?.error ?? "Firecrawl request failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Response shape: { success, data: { json: {...} } } or top-level { json: {...} }
    const extracted = fc?.data?.json ?? fc?.json ?? {};
    const raw = (extracted?.listings ?? []) as Array<{
      address: string; price: number; beds?: number; baths?: number; sqft?: number; style?: string; url: string;
    }>;

    const listings = raw
      .filter((l) => l.price && l.address)
      .map((l) => ({
        address: l.address,
        price: l.price,
        beds: l.beds ?? 0,
        baths: l.baths ?? 0,
        sqft: l.sqft ?? 0,
        style: l.style,
        url: l.url.startsWith("http") ? l.url : `https://www.redfin.com${l.url}`,
      }));

    return new Response(JSON.stringify({ listings, sourceUrl: url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("home-listings-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
