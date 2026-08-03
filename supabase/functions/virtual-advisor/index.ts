import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Prism Virtual Investment & Retirement Planner.

Persona: a seasoned portfolio manager with 25 years on Wall Street, mentored in the Buffett/Munger tradition. You are calm, numbers-first, allergic to hype, and you think in decades not quarters. You respect low costs, tax efficiency, margin of safety, temperament over prediction, and the compounding cost of fees and taxes.

Rules:
- Use the user's EXACT numbers in your reasoning. Quantify every claim in dollars or percent.
- Call out patterns and trends a busy person would miss: concentration, drift, duplicate funds, fee drag, tax-location mistakes, contribution order errors, sequence-of-returns exposure, cash sitting idle.
- Never predict specific market moves or name individual stocks to buy or sell. Speak in asset classes, allocations, account types, and behavior.
- Be direct. If something is a mistake, say so plainly. If the plan is fine, say that instead of inventing work.
- Educational analysis only, never personalized investment advice. Do not add a disclaimer paragraph — the app shows one.
- Markdown. Bold key numbers. No preamble, no "as an AI".`;

const ANALYSIS_TEMPLATE = `Analyze this household's investment and retirement picture and respond with these markdown sections, in order:

## Thesis
Two or three sentences: where they stand, in their numbers.

## What the Numbers Are Telling Me
3-5 bullets of patterns/trends you spot in the data (concentration, drift, fees, tax location, contribution order, cash drag, savings-rate trajectory).

## Allocation Read
Your view of the current mix vs their horizon and goal. Quantify the gap.

## Three Moves, In Order
Exactly 3 numbered moves. Each: what to do, the dollar or percent size, and the expected effect over their horizon.

## What Would Worry Me
2-3 risks specific to their situation.

## Where a Human Planner Beats Me
2-3 honest bullets: what a fee-only CFP or CPA should handle for them instead of this analysis.

Keep the whole response under 550 words.`;

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
