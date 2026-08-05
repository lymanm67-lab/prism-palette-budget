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
    const image = typeof body?.image === "string" ? body.image : "";
    const note = typeof body?.note === "string" ? body.note.slice(0, 400) : "";
    const description = typeof body?.description === "string" ? body.description.slice(0, 600) : "";
    const hasImage = image.startsWith("data:image/") || image.startsWith("http");
    if (!hasImage && !description.trim()) {
      return json({ error: "A meal photo or description is required" }, 400);
    }


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
          {
            role: "system",
            content:
              "You are a registered-dietitian-grade food analyst. Estimate the nutrition of the described or photographed meal using standard USDA nutritional values. " +
              "Identify each food item, estimate its portion (oz, cups, pieces) and its calories/protein/carbs/fiber/fat. " +
              'Return ONLY valid JSON, no markdown: {"name":string,"meal_type":"breakfast"|"lunch"|"dinner"|"snack","confidence":"high"|"medium"|"low",' +
              '"items":[{"label":string,"portion":string,"calories":number,"protein_g":number,"carbs_g":number,"fiber_g":number,"fat_g":number}],' +
              '"totals":{"calories":number,"protein_g":number,"carbs_g":number,"fiber_g":number,"fat_g":number},"notes":string}. ' +
              "Totals must equal the sum of items. Keep notes under 200 characters. If the input is not food, return items as an empty array and explain in notes.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: hasImage
                  ? note
                    ? `Analyze this meal photo and estimate calories and macros. User context: ${note}`
                    : "Analyze this meal photo and estimate calories and macros."
                  : `Estimate calories and macros for this meal described by the user: ${description}`,
              },
              ...(hasImage ? [{ type: "image_url", image_url: { url: image } }] : []),
            ],
          },

        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add credits." }, 402);
      const detail = await response.text();
      console.error("AI gateway error", response.status, detail);
      return json({ error: "Could not analyze the photo" }, 502);
    }

    const data = await response.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    let parsed: any = null;
    try {
      parsed = JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
    } catch (_e) {
      console.error("Unparseable AI response", cleaned.slice(0, 500));
      return json({ error: "The analysis came back unreadable. Try another photo." }, 502);
    }

    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
    };
    const items = Array.isArray(parsed?.items)
      ? parsed.items.slice(0, 20).map((i: any) => ({
          label: String(i?.label ?? "Item").slice(0, 80),
          portion: String(i?.portion ?? "").slice(0, 40),
          calories: num(i?.calories),
          protein_g: num(i?.protein_g),
          carbs_g: num(i?.carbs_g),
          fiber_g: num(i?.fiber_g),
          fat_g: num(i?.fat_g),
        }))
      : [];

    const sum = (k: "calories" | "protein_g" | "carbs_g" | "fiber_g" | "fat_g") =>
      Math.round(items.reduce((s: number, i: any) => s + i[k], 0) * 10) / 10;

    const mealType = ["breakfast", "lunch", "dinner", "snack"].includes(parsed?.meal_type)
      ? parsed.meal_type
      : "lunch";

    return json({
      name: String(parsed?.name ?? "Scanned meal").slice(0, 120),
      meal_type: mealType,
      confidence: ["high", "medium", "low"].includes(parsed?.confidence) ? parsed.confidence : "medium",
      items,
      totals: {
        calories: items.length ? sum("calories") : num(parsed?.totals?.calories),
        protein_g: items.length ? sum("protein_g") : num(parsed?.totals?.protein_g),
        carbs_g: items.length ? sum("carbs_g") : num(parsed?.totals?.carbs_g),
        fiber_g: items.length ? sum("fiber_g") : num(parsed?.totals?.fiber_g),
        fat_g: items.length ? sum("fat_g") : num(parsed?.totals?.fat_g),
      },
      notes: String(parsed?.notes ?? "").slice(0, 300),
    });
  } catch (e) {
    console.error("analyze-meal-photo error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
