import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECTION_PROMPTS: Record<string, string> = {
  mission: "Draft a family mission statement in 3–5 sentences. Focus on faith, character, service, generational impact.",
  values: "Draft 6–8 core family values with a one-sentence explanation each. Keep language warm and specific.",
  faith: "Draft a family faith / spiritual principles section (2–3 paragraphs). Non-denominational, focused on stewardship, gratitude, and integrity.",
  financial: "Draft financial principles for the family (saving before spending, no consumer debt, tithing, investing for the long term). 5–7 principles.",
  investment: "Draft an investment philosophy: passive/index, long-term, diversified, avoid speculation. 3 short paragraphs.",
  giving: "Draft a giving philosophy: tithe percentage, causes, teaching children generosity. 2 paragraphs.",
  business: "Draft a family business philosophy: integrity, service, stewardship of employees, reinvestment. 2 paragraphs.",
  education: "Draft an education philosophy: lifelong learning, financial literacy, apprenticeships, character over credentials. 2 paragraphs.",
  marriage: "Draft a marriage philosophy: partnership, unity in finances, communication, prenuptial expectations. 2 paragraphs.",
  decision_rules: "Draft family decision rules for major financial decisions ($10k+): who decides, when spouses consult, when the family council is convened. Bullet list.",
  trustee_expectations: "Draft trustee expectations: fiduciary duty, investment discipline, distribution philosophy, annual reporting. Bullet list.",
  summit_agenda: "Draft an agenda for an annual Family Wealth Summit (half day): review net worth, review trust, teach one financial concept, hear from each family member, celebrate wins.",
  legacy_letter: "Draft a legacy letter template — a personal letter to future generations sharing life lessons, hopes, prayers. 2–3 paragraphs, first person.",
  ethical_will: "Draft an ethical will template — values, beliefs, and life lessons the writer wants to pass on (distinct from a legal will). 2–3 paragraphs.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { section, family_name, existing, values } = await req.json();
    if (!section || !SECTION_PROMPTS[section]) {
      return new Response(JSON.stringify({ error: "Invalid section" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sys = `You are helping the ${family_name || 'family'} draft their Family Constitution. Write in warm, first-person-plural voice ("We believe...", "Our family..."). Keep it usable — clear, actionable, values-driven. Not legal advice.`;
    const user = `Section to draft: ${section}
Instruction: ${SECTION_PROMPTS[section]}
${values?.length ? `\nFamily values to weave in: ${values.join(', ')}` : ''}
${existing ? `\nCurrent draft to improve:\n${existing}` : ''}

Return only the section content — no preamble, no closing.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const j = await resp.json();
    const draft = j.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ draft }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
