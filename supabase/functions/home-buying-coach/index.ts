import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

// ---------- Types ----------
interface Answers {
  state: string;
  city?: string;
  income: number;
  monthlyDebt: number;
  debtCreditCards?: number;
  debtAutoLoans?: number;
  debtStudentLoans?: number;
  debtPersonal?: number;
  debtChildAlimony?: number;
  debtOther?: number;
  savings: number;
  giftFunds?: number;
  coBorrowerIncome?: number;
  targetPrice: number;
  timelineMonths: number;
  firstTime: "yes" | "no";
  creditRange: string;
  veteranStatus: "yes" | "no";
  employment: string;
  incomeType?: string;
  propertyType?: string;
  planToStay?: string;
  derogatories24mo?: "yes" | "no";
  ownerOccupy?: "yes" | "no";
  familyPlans?: string;
}

// ---------- Mortgage math (mirrors src/lib/home-buying/mortgage-math.ts) ----------
function calcPITI(price: number, downPct: number, ratePct: number, termYears: number, opts: { taxPct?: number; insPct?: number; pmiPct?: number; hoa?: number } = {}) {
  const loanAmount = price * (1 - downPct / 100);
  const downPayment = price - loanAmount;
  const r = ratePct / 100 / 12;
  const n = termYears * 12;
  const pi = r === 0 ? loanAmount / n : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const tax = ((opts.taxPct ?? 1.0) / 100 * price) / 12;
  const ins = ((opts.insPct ?? 0.5) / 100 * price) / 12;
  const pmi = downPct < 20 ? ((opts.pmiPct ?? 0.5) / 100 * loanAmount) / 12 : 0;
  const hoa = opts.hoa ?? 0;
  return { loanAmount, downPayment, pi, tax, ins, pmi, hoa, piti: pi + tax + ins + pmi + hoa };
}

function ficoFromRange(range: string): number {
  if (range.startsWith("<")) return 600;
  const m = /(\d{3})/.exec(range);
  return m ? parseInt(m[1], 10) + 20 : 700;
}

function estimateRate(fico: number, base = 7.0): number {
  if (fico >= 760) return base - 0.5;
  if (fico >= 740) return base - 0.3;
  if (fico >= 720) return base - 0.1;
  if (fico >= 700) return base;
  if (fico >= 680) return base + 0.25;
  if (fico >= 660) return base + 0.6;
  if (fico >= 640) return base + 1.0;
  if (fico >= 620) return base + 1.5;
  return base + 2.2;
}

// ---------- Loan types (subset) ----------
const LOAN_TYPES = [
  { id: "fha", name: "FHA", minDown: 3.5, minFico: 580, maxDti: 50, bestFor: "First-time buyers, lower credit, smaller down payment" },
  { id: "conventional", name: "Conventional", minDown: 3, minFico: 620, maxDti: 45, bestFor: "Solid credit, 5–20% down" },
  { id: "va", name: "VA", minDown: 0, minFico: 580, maxDti: 50, bestFor: "Veterans, active duty, surviving spouses" },
  { id: "usda", name: "USDA", minDown: 0, minFico: 640, maxDti: 46, bestFor: "Rural & some suburban areas, income-capped" },
  { id: "homeready", name: "HomeReady", minDown: 3, minFico: 620, maxDti: 50, bestFor: "≤80% AMI income, reduced PMI" },
  { id: "homepossible", name: "Home Possible", minDown: 3, minFico: 660, maxDti: 45, bestFor: "Very low-to-moderate income" },
  { id: "jumbo", name: "Jumbo", minDown: 10, minFico: 700, maxDti: 43, bestFor: "Loans above ~$766k conforming limit" },
];

// ---------- State DPA (subset surfaced by state code) ----------
const STATE_DPA: Record<string, Array<{ name: string; agency: string; max: string; ficoMin?: number; url: string }>> = {
  FL: [
    { name: "Florida Assist", agency: "Florida Housing", max: "Up to $10k", ficoMin: 640, url: "https://www.floridahousing.org/programs/homebuyer-overview-page" },
    { name: "Hometown Heroes", agency: "Florida Housing", max: "Up to 5% (max $35k)", url: "https://www.floridahousing.org/hometownheroes" },
  ],
  CA: [
    { name: "CalHFA MyHome", agency: "CalHFA", max: "Up to 3.5% of price", ficoMin: 660, url: "https://www.calhfa.ca.gov/homebuyer/" },
    { name: "Forgivable Equity Builder", agency: "CalHFA", max: "Up to 10%", url: "https://www.calhfa.ca.gov/homebuyer/programs/feb.htm" },
  ],
  TX: [
    { name: "My First Texas Home", agency: "TDHCA", max: "Up to 5% DPA", ficoMin: 620, url: "https://www.tdhca.state.tx.us/homeownership/fthb/" },
    { name: "TSAHC Home Sweet Texas", agency: "TSAHC", max: "Up to 5% grant", url: "https://www.tsahc.org/" },
  ],
  NY: [{ name: "Achieving the Dream", agency: "SONYMA", max: "Up to $15k DPA", url: "https://hcr.ny.gov/sonyma" }],
  IL: [
    { name: "IHDAccess Forgivable", agency: "IHDA", max: "4% (max $6k)", ficoMin: 640, url: "https://www.ihda.org/homeownership/" },
    { name: "Smart Buy (student loan payoff)", agency: "IHDA", max: "Up to $40k", url: "https://www.ihda.org/homeownership/smartbuy/" },
  ],
};

const FEDERAL_PROGRAMS = [
  { name: "FHA Loan", note: "3.5% down with 580+ FICO" },
  { name: "VA Loan", note: "0% down, no PMI (eligible veterans)" },
  { name: "USDA Rural Loan", note: "0% down, rural & some suburban areas" },
  { name: "HomeReady (Fannie Mae)", note: "3% down, ≤80% AMI" },
  { name: "Home Possible (Freddie Mac)", note: "3% down, low-to-moderate income" },
  { name: "Good Neighbor Next Door", note: "50% off list price for teachers/police/fire/EMT in revitalization areas" },
];

// ---------- Deterministic context ----------
function buildContext(a: Answers) {
  const fico = ficoFromRange(a.creditRange);
  const isVet = a.veteranStatus === "yes";
  const totalIncome = (a.income || 0) + (a.coBorrowerIncome || 0);
  const totalCash = (a.savings || 0) + (a.giftFunds || 0);

  // Affordability via 28/36 rule
  const maxHousing28 = totalIncome * 0.28;
  const maxTotalDebt36 = totalIncome * 0.36;
  const maxHousingAfterDebt = Math.max(0, maxTotalDebt36 - (a.monthlyDebt || 0));
  const maxAffordableMonthly = Math.min(maxHousing28, maxHousingAfterDebt);

  // Back into a price assuming 5% down, FICO-based rate, 30yr, 1.5% tax+ins, 0.5% PMI
  const ratePct = estimateRate(fico);
  function pricePITI(price: number, downPct: number) {
    return calcPITI(price, downPct, ratePct, 30, { taxPct: 1.0, insPct: 0.5, pmiPct: 0.5 }).piti;
  }
  function priceForPITI(targetPITI: number, downPct: number): number {
    let lo = 50000, hi = 2000000;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (pricePITI(mid, downPct) > targetPITI) hi = mid;
      else lo = mid;
    }
    return Math.round((lo + hi) / 2 / 1000) * 1000;
  }

  const conservativePrice = priceForPITI(maxAffordableMonthly * 0.85, 10);
  const targetPriceMax = priceForPITI(maxAffordableMonthly, 5);
  const stretchPrice = priceForPITI(maxAffordableMonthly * 1.1, 3.5);

  // Scenarios at user's target price
  const scenarios = [
    { id: "fha-3.5", label: "FHA — 3.5% down", down: 3.5, term: 30 },
    { id: "conv-5", label: "Conventional — 5% down", down: 5, term: 30 },
    { id: "conv-20", label: "Conventional — 20% down", down: 20, term: 30 },
  ].map((s) => {
    const m = calcPITI(a.targetPrice, s.down, ratePct, s.term, { taxPct: 1.0, insPct: 0.5, pmiPct: 0.5 });
    const closing = a.targetPrice * 0.03;
    const cashToClose = m.downPayment + closing;
    const dti = totalIncome > 0 ? ((m.piti + (a.monthlyDebt || 0)) / totalIncome) * 100 : 0;
    return {
      label: s.label,
      down: s.down,
      downPayment: Math.round(m.downPayment),
      piti: Math.round(m.piti),
      cashToClose: Math.round(cashToClose),
      dti: Math.round(dti * 10) / 10,
      gap: Math.round(Math.max(0, cashToClose - totalCash)),
    };
  });

  // Calculators
  const downPaymentGap5 = Math.max(0, a.targetPrice * 0.05 - totalCash);
  const closingCosts = Math.round(a.targetPrice * 0.03);
  const hiddenAnnual = Math.round(a.targetPrice * 0.01) + 200 * 12 + 0; // 1% maintenance + ~$200/mo utility uplift
  const creditMonthlyImpact = Math.round((estimateRate(620) - estimateRate(fico)) / 100 / 12 * (a.targetPrice * 0.95));

  // Loan matches
  const minDtiPossible = totalIncome > 0 ? ((a.monthlyDebt || 0) / totalIncome) * 100 : 100;
  const loanMatches = LOAN_TYPES
    .filter((l) => fico >= l.minFico && minDtiPossible <= l.maxDti)
    .filter((l) => (l.id === "va" ? isVet : true))
    .filter((l) => (l.id === "jumbo" ? a.targetPrice > 766000 : true))
    .map((l) => ({ ...l, qualifies: true }));

  // State programs filtered by FICO
  const statePrograms = (STATE_DPA[a.state] ?? []).filter((p) => !p.ficoMin || fico >= p.ficoMin);

  return {
    fico, ratePct, totalIncome, totalCash, isVet,
    maxAffordableMonthly: Math.round(maxAffordableMonthly),
    affordability: { conservativePrice, targetPriceMax, stretchPrice },
    scenarios, downPaymentGap5, closingCosts, hiddenAnnual, creditMonthlyImpact,
    loanMatches, statePrograms,
  };
}

// ---------- Listings fetch (Firecrawl, best-effort) ----------
async function fetchListings(state: string, city: string, maxPrice: number) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key || !city) return [];
  const loc = `${city}, ${state}`.toLowerCase().replace(/\s+/g, "-");
  const url = `https://www.redfin.com/search/${encodeURIComponent(loc)}/filter/max-price=${Math.round(maxPrice / 1000)}k`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        url, onlyMainContent: true, waitFor: 1500,
        formats: [{
          type: "json",
          prompt: "Extract up to 5 home listings: address, price (number), beds, baths, sqft, url.",
          schema: {
            type: "object",
            properties: {
              listings: {
                type: "array",
                items: {
                  type: "object",
                  properties: { address: { type: "string" }, price: { type: "number" }, beds: { type: "number" }, baths: { type: "number" }, sqft: { type: "number" }, url: { type: "string" } },
                  required: ["address", "price", "url"],
                },
              },
            },
          },
        }],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.data?.json?.listings ?? data?.json?.listings ?? [];
    return (raw as Array<{ address: string; price: number; beds?: number; baths?: number; sqft?: number; url: string }>).slice(0, 5).map((l) => ({
      ...l, url: l.url.startsWith("http") ? l.url : `https://www.redfin.com${l.url}`,
    }));
  } catch (e) {
    console.error("listings fetch failed", e);
    return [];
  }
}

const fmt$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { answers } = (await req.json()) as { answers: Answers };
    if (!answers) throw new Error("Missing answers");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const ctx = buildContext(answers);

    // Fetch listings in parallel with AI prep
    const listingsPromise = fetchListings(answers.state, answers.city || "", Math.min(ctx.affordability.targetPriceMax, answers.targetPrice));

    const systemPrompt = `You are a plain-spoken home-buying coach (not a licensed mortgage advisor). You receive PRECOMPUTED numbers — do NOT recalculate or invent figures. Use them verbatim. Produce a unified markdown report following the exact section order I give you. Keep total under 900 words, no emojis.

Sections, in order:
## Where You Stand
2–3 sentences in plain English. Reference their state, target price, credit, and DTI honestly.

## Affordability Bands
Restate the three price bands I give you (Conservative / Target / Stretch) with one-line reasoning each. Tell them which band you'd anchor to and why.

## Three Loan Scenarios at Your Target Price
A markdown table with columns: Scenario | Down Payment | Cash to Close | Monthly PITI | DTI | Gap vs. Savings. Use the rows I provide. Then a 1–2 sentence verdict on which is the best fit.

## Recommended Loan Types
For each loan in the matches list, one bullet: "**Name** — why it fits you." If VA is in the list, lead with it.

## Down-Payment Assistance Matches
- List the state programs I provided with name + max assistance + agency.
- Then list 2 of the federal programs that fit (FHA always; VA if veteran; USDA if relevant; HomeReady/Home Possible if income-constrained).
- End with: "Confirm current eligibility on each agency's website."

## Hidden Costs & Credit Impact
- Closing costs estimate
- First-year hidden costs (maintenance + utility uplift)
- One sentence on how credit-score improvement would change their monthly payment.

## Sample Listings in [City]
If listings provided, render as a bulleted list: address — price — beds/baths — link. If none, write: "No live listings could be fetched right now. Use the Home Search tab to browse."

## Your Next 3 Actions
Numbered, specific, time-bound (e.g. "Within 14 days: ..."). Tie at least one action to a tab in the app (Scenarios, Calculators, Loan Types, State Assistance, or Home Search).

End with a one-line disclaimer: "These figures are estimates. Confirm specifics with a licensed loan officer."`;

    const listings = await listingsPromise;

    const userPrompt = `USER PROFILE
- Location: ${answers.city || "—"}, ${answers.state}
- Gross monthly income: ${fmt$(answers.income)}${answers.coBorrowerIncome ? ` (+ co-borrower ${fmt$(answers.coBorrowerIncome)})` : ""}
- Total monthly debt: ${fmt$(answers.monthlyDebt)}
- Cash savings: ${fmt$(answers.savings)}${answers.giftFunds ? ` (+ gift funds ${fmt$(answers.giftFunds)})` : ""}
- Target home price: ${fmt$(answers.targetPrice)}
- Timeline: ${answers.timelineMonths} months
- Credit range: ${answers.creditRange} (estimated FICO ${ctx.fico}, estimated rate ${ctx.ratePct.toFixed(2)}%)
- First-time buyer: ${answers.firstTime} | Veteran: ${answers.veteranStatus}
- Employment: ${answers.employment}${answers.incomeType ? ` (${answers.incomeType})` : ""}
- Property type: ${answers.propertyType || "single-family"} | Owner-occupy: ${answers.ownerOccupy || "yes"} | Plan to stay: ${answers.planToStay || "3–7yr"}
- Derogatories last 24mo: ${answers.derogatories24mo || "no"}
- Lifestyle: ${answers.familyPlans || "—"}

AFFORDABILITY (28/36 rule, FICO-adjusted rate, 30yr)
- Max affordable monthly housing: ${fmt$(ctx.maxAffordableMonthly)}
- Conservative band (10% down, comfort cushion): up to ${fmt$(ctx.affordability.conservativePrice)}
- Target band (5% down, at cap): up to ${fmt$(ctx.affordability.targetPriceMax)}
- Stretch band (3.5% down, 10% over cap): up to ${fmt$(ctx.affordability.stretchPrice)}

SCENARIOS AT TARGET PRICE ${fmt$(answers.targetPrice)}
${ctx.scenarios.map((s) => `- ${s.label}: down ${fmt$(s.downPayment)} | cash-to-close ${fmt$(s.cashToClose)} | PITI ${fmt$(s.piti)}/mo | DTI ${s.dti}% | gap vs savings ${fmt$(s.gap)}`).join("\n")}

CALCULATOR OUTPUTS
- Down-payment gap to reach 5% down: ${fmt$(ctx.downPaymentGap5)}
- Estimated closing costs (3%): ${fmt$(ctx.closingCosts)}
- First-year hidden costs (1% maintenance + utility uplift): ${fmt$(ctx.hiddenAnnual)}
- Credit-improvement monthly impact (lifting from 620 baseline to current): ~${fmt$(ctx.creditMonthlyImpact)}/mo savings

LOAN TYPES YOU LIKELY QUALIFY FOR
${ctx.loanMatches.map((l) => `- ${l.name}: ${l.bestFor} (min ${l.minDown}% down, min FICO ${l.minFico})`).join("\n") || "- None match — credit or DTI is the blocker."}

STATE DPA MATCHES (${answers.state})
${ctx.statePrograms.length ? ctx.statePrograms.map((p) => `- ${p.name} (${p.agency}) — ${p.max} — ${p.url}`).join("\n") : "- No curated programs in our database for this state; direct user to their state HFA."}

FEDERAL PROGRAMS TO CONSIDER
${FEDERAL_PROGRAMS.map((p) => `- ${p.name} — ${p.note}`).join("\n")}

SAMPLE LISTINGS IN ${answers.city || "—"}
${listings.length ? listings.map((l) => `- ${l.address} — ${fmt$(l.price)} — ${l.beds || "?"}bd/${l.baths || "?"}ba${l.sqft ? ` ${l.sqft}sqft` : ""} — ${l.url}`).join("\n") : "- No live listings fetched."}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded — please try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const report = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ report, context: ctx, listings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("home-buying-coach error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
