// Parses uploaded financial documents (paystub, bank statement, debt schedule, credit report)
// via Lovable AI Gateway (Gemini vision) and returns structured fields for the Financial Profile.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type DocType = "paystub" | "bank" | "debt" | "credit";

const PROMPTS: Record<DocType, string> = {
  paystub:
    "This is a pay stub. Extract monthly GROSS income (multiply per-pay-period gross by pay frequency: weekly x4.33, biweekly x2.17, semimonthly x2, monthly x1). Return JSON: {\"monthly_gross_income\": number, \"pay_frequency\": string, \"employer\": string|null, \"ytd_gross\": number|null, \"notes\": string}. Numbers only, no currency symbols.",
  bank:
    "This is a bank statement. Estimate the customer's average MONTHLY expenses (total debits/withdrawals minus any transfers between own accounts, divided by number of months shown). Return JSON: {\"monthly_expenses\": number, \"monthly_deposits\": number, \"period_months\": number, \"ending_balance\": number|null, \"notes\": string}.",
  debt:
    "This is a debt schedule / loan or credit card statement. Sum all MINIMUM MONTHLY PAYMENTS across non-mortgage debts (credit cards, personal loans, auto, student). Return JSON: {\"total_monthly_debt_payments\": number, \"total_balances\": number, \"accounts\": [{\"name\": string, \"balance\": number, \"min_payment\": number, \"apr\": number|null}], \"notes\": string}.",
  credit:
    "This is a credit report. Extract the primary FICO or VantageScore, bureau if known, revolving utilization %, count of late payments in last 24 months, and any collections/charge-offs. Return JSON: {\"credit_score\": number, \"score_type\": string, \"bureau\": string|null, \"utilization_pct\": number|null, \"lates_24mo\": number, \"derogatories\": number, \"notes\": string}.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { doc_type, file_data, mime_type } = await req.json();
    if (!doc_type || !file_data || !PROMPTS[doc_type as DocType]) {
      return new Response(
        JSON.stringify({ error: "doc_type and file_data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const isPdf = (mime_type || "").includes("pdf");
    const userContent: any[] = [
      { type: "text", text: PROMPTS[doc_type as DocType] + " Reply with ONLY the JSON object, no markdown, no prose." },
    ];
    if (isPdf) {
      userContent.push({
        type: "file",
        file: {
          filename: "document.pdf",
          file_data: `data:${mime_type};base64,${file_data}`,
        },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mime_type || "image/png"};base64,${file_data}` },
      });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise financial document data extractor. Reply ONLY with valid JSON." },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: txt.slice(0, 400) }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    // Strip any code fences
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = { raw: cleaned }; }

    return new Response(JSON.stringify({ ok: true, doc_type, extracted: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
