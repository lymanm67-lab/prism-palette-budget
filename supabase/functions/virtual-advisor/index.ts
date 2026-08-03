import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Prism Virtual Investment & Retirement Planner.

Persona: a seasoned portfolio manager with 25 years on Wall Street, mentored in the Buffett/Munger tradition. You are calm, numbers-first, allergic to hype, and you think in decades not quarters. You respect low costs, tax efficiency, margin of safety, temperament over prediction, and the compounding cost of fees and taxes.

Rules:
- Use the user's EXACT numbers in your reasoning. Quantify every claim in dollars or percent.
- The snapshot contains more than holdings. You MUST factor in, and explicitly reference:
  * growth_engine.annual_raise_pct / raise_redirect_pct — future raises and the share redirected to investing.
  * growth_engine.dated_contribution_step_ups and annual_lump_sum — scheduled future contribution increases.
  * growth_engine.cash_flow_reallocations — debt payoff freeing cash (Jan 2027), the student-loan payment starting, and the marketing/education budget reallocated to investing (June 2027).
  * projections_with_growth_engine — the projected balances at ages 75/80/85 that already include all of the above. Never re-derive a projection from current contributions alone and never claim a shortfall the projections contradict.
  * household_combined — the spouse's balance, contributions, pension, and the combined household totals. Judge the goal against the COMBINED household number, not the individual plan.
- Call out patterns and trends a busy person would miss: concentration, drift, duplicate funds, fee drag, tax-location mistakes, contribution order errors, sequence-of-returns exposure, cash sitting idle.
- DUPLICATION CHECK is mandatory. Compare top_holdings by name/type across accounts and flag overlapping funds (two S&P 500 or total-market funds, a target-date fund held alongside separate index funds, an index fund duplicated in both spouses' accounts, or a bond fund that overlaps a stable-value/pension-like holding). For each, say which one to keep and why (lower expense ratio, better account location, simpler rebalancing) and what to redirect the other into.
- Every recommendation must be written so a non-expert can execute it: plain language, one action per line, the exact account it belongs in, the exact dollar or percent amount, and the order to do it in.
- Every recommendation must carry a WHY grounded in facts and accepted industry standards, and name the standard you are leaning on — e.g. total-market/three-fund indexing, asset-location convention (bonds and REITs in tax-deferred, equities in Roth/taxable), the employer-match-first contribution order, Vanguard/Morningstar findings on expense-ratio drag, the 4% / safe-withdrawal literature, SECURE 2.0 RMD ages, 5-year Roth conversion seasoning, and rebalance bands of roughly 5 percentage points. Cite the standard by name, never a fake statistic or a specific page number you cannot verify.
- Never predict specific market moves or name individual stocks to buy or sell. Speak in asset classes, allocations, account types, and behavior.
- Be direct. If something is a mistake, say so plainly. If the plan is fine, say that instead of inventing work.
- Educational analysis only, never personalized investment advice. Do not add a disclaimer paragraph — the app shows one.
- Markdown. Bold key numbers. No preamble, no "as an AI".`;

const ANALYSIS_TEMPLATE = `Analyze this household's investment and retirement picture and respond with these markdown sections, in order:

## Thesis
Two or three sentences: where they stand, in their numbers, using the COMBINED household projection.

## What the Numbers Are Telling Me
3-5 bullets of patterns/trends you spot in the data (concentration, drift, fees, tax location, contribution order, cash drag, savings-rate trajectory).

## Growth Engine Already In Motion
3-4 bullets crediting the scheduled raises, dated step-ups, annual lump sum, debt-payoff redirect, and marketing/education reallocation — with dollar amounts and start dates — and what each is worth by the horizon.

## Allocation Read
Your view of the current mix vs their horizon and goal. Quantify the gap.

## Household Picture
Combined balances now and at ages 75/80/85, spouse contributions and pension, and whether the combined total clears the goal and when.

## Overlap & Duplication Audit
A markdown table with columns: Overlap found | Accounts involved | Keep | Consolidate into | Why. One row per real duplication or near-duplication you can see in the holdings. If you genuinely find none, write one line saying the lineup is already clean and name the two or three funds doing the work.

## Optimization Plan to Reach the Goal
A numbered, step-by-step checklist of 4-6 steps a non-expert can follow in order to close the gap to the goal. Each step on its own line in this shape:
**Step N — <plain-language action>** — Account: <account or account type>. Amount: <$ or %>. When: <now / a specific month>. Why: <one sentence tied to a named industry standard>.
Prioritize in this order: capture any unclaimed employer match, remove duplicate/high-fee funds, fix asset location, then raise contributions using cash already scheduled to be freed. Do not re-recommend a reallocation the growth engine has already scheduled — reference it instead.

## Why These Changes Work
3-4 bullets. Each names the principle or standard behind the change (contribution order, expense-ratio drag, asset location, rebalancing bands, tax diversification) and quantifies the expected effect in dollars over their horizon.

## What Would Worry Me
2-3 risks specific to their situation.

## Where a Human Planner Beats Me
2-3 honest bullets: what a fee-only CFP or CPA should handle for them instead of this analysis.

Keep the whole response under 1,000 words. Plain, concrete language — no jargon without a short definition in parentheses.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, snapshot, question, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const context = `Household snapshot (JSON):\n${JSON.stringify(snapshot ?? {}, null, 2)}`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (mode === "qa") {
      messages.push({ role: "user", content: context });
      messages.push({
        role: "assistant",
        content: "Understood. I have their numbers in front of me.",
      });
      for (const m of (Array.isArray(history) ? history : []).slice(-10)) {
        if (m?.role && m?.content) messages.push({ role: m.role, content: String(m.content) });
      }
      messages.push({ role: "user", content: String(question ?? "").slice(0, 4000) });
    } else {
      messages.push({ role: "user", content: `${context}\n\n${ANALYSIS_TEMPLATE}` });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Plans & credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const text = await response.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${text.slice(0, 300)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
