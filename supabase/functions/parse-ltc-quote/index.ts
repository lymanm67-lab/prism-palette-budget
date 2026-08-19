import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_CHARS = 18 * 1024 * 1024; // ~13MB binary as base64

const SYSTEM_PROMPT =
  "You are a long-term care insurance analyst. Read the attached carrier quote or illustration and extract its terms. " +
  'Return ONLY valid JSON, no markdown: {"carrier":string,"product":string,"quote_date":string|null,"agent":string|null,' +
  '"startingMonthlyBenefit":number,"benefitPeriodMonths":number,"poolEach":number,"inflationPct":number,' +
  '"inflationCompound":boolean,"inflationLifetime":boolean,"homeCarePct":number,"assistedLivingPct":number,' +
  '"nursingPct":number,"cashBenefitPct":number,"eliminationDays":number,"partnershipQualified":boolean,' +
  '"sharedCare":boolean,"premiumWaiver":boolean,"jointApplicantDiscount":boolean,' +
  '"premiumLyman":number|null,"premiumKateri":number|null,"combinedMonthlyPremium":number,' +
  '"notes":string,"confidence":"high"|"medium"|"low"}. ' +
  "All premiums are MONTHLY dollars: if the quote shows annual, quarterly or semi-annual modal premiums, convert to monthly. " +
  "premiumLyman is the male/primary applicant, premiumKateri the female/spouse applicant; use null if not itemized. " +
  "combinedMonthlyPremium is the household total monthly premium. poolEach is the initial policy limit (maximum benefit) per person. " +
  "Copy printed values exactly and never invent numbers; use 0 for a benefit that is absent and reasonable defaults only for booleans. " +
  "Put anything notable (riders, discounts, underwriting class) in notes, under 400 characters.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const fileName = typeof body?.fileName === "string" ? body.fileName : "quote.pdf";
    const mime = typeof body?.mimeType === "string" ? body.mimeType : "application/pdf";
    if (!dataUrl.startsWith("data:")) return json({ error: "dataUrl is required" }, 400);
    if (dataUrl.length > MAX_CHARS) return json({ error: "File is too large to parse (12MB max)" }, 400);

    const contentBlock = mime.startsWith("image/")
      ? { type: "image_url", image_url: { url: dataUrl } }
      : { type: "file", file: { filename: fileName, file_data: dataUrl } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract the long-term care policy terms from this quote ("${fileName}").` },
              contentBlock,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (response.status === 429) return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add credits." }, 402);
      console.error("gateway error", response.status, detail.slice(0, 500));
      return json({ error: "Could not read the quote" }, 502);
    }

    const ai = await response.json();
    const raw: string = ai?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "The quote could not be read" }, 422);
      parsed = JSON.parse(match[0]);
    }

    return json({ parsed });
  } catch (e) {
    console.error("parse-ltc-quote", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
