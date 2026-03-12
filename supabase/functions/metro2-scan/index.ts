import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Metro2 compliance analysis engine. You analyze credit account data against Metro2 reporting standards used by data furnishers.

Given a list of credit accounts, identify ALL reporting inconsistencies. For each issue found, return a JSON object.

Common Metro2 violations to check:
1. INCORRECT_DELINQUENCY_DATE - Date of first delinquency missing or set after account was closed/charged-off
2. CONFLICTING_STATUS - Account status conflicts with other data (e.g., "Charge-Off" but status shows "Open")
3. DUPLICATE_REPORTING - Same account reported by both original creditor and collection agency
4. BALANCE_INCONSISTENCY - Balance exceeds credit limit, or closed account shows balance with no payment
5. LATE_AFTER_CLOSURE - Payment history shows late payments after account closure date
6. MISSING_DISPUTE_CODE - Account in dispute but no dispute code present
7. REAGED_ACCOUNT - Date opened seems inconsistent with account age/history
8. STALE_NEGATIVE - Negative item older than 7 years (should have been removed per FCRA)
9. ZERO_BALANCE_NEGATIVE - Account shows zero balance but negative status persists
10. MISSING_PAYMENT_HISTORY - Account open with balance but no payment history reported

You MUST use the suggest_findings tool to return your analysis. Return ALL findings, even low severity ones. If an account has no issues, do not include it.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { household_id } = await req.json();

    if (!household_id) throw new Error("household_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is household member via their JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await anonClient.auth.getUser(token);
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: member } = await supabase.from("household_members").select("id").eq("household_id", household_id).eq("user_id", user.id).maybeSingle();
      if (!member) return new Response(JSON.stringify({ error: "Not a household member" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch credit accounts
    const { data: accounts, error: accErr } = await supabase
      .from("credit_accounts")
      .select("*")
      .eq("household_id", household_id);

    if (accErr) throw accErr;
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ findings: [], message: "No credit accounts to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare account data for AI (strip sensitive fields)
    const sanitized = accounts.map(a => ({
      id: a.id,
      account_name: a.account_name,
      account_type: a.account_type,
      account_status: a.account_status,
      balance: a.balance,
      credit_limit: a.credit_limit,
      monthly_payment: a.monthly_payment,
      payment_history: a.payment_history,
      date_opened: a.date_opened,
      date_closed: a.date_closed,
      date_of_first_delinquency: a.date_of_first_delinquency,
      high_balance: a.high_balance,
      responsibility: a.responsibility,
      remarks_codes: a.remarks_codes,
      bureau: a.bureau,
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze these credit accounts for Metro2 compliance issues:\n\n${JSON.stringify(sanitized, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_findings",
            description: "Return Metro2 compliance findings for the analyzed credit accounts",
            parameters: {
              type: "object",
              properties: {
                findings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      credit_account_id: { type: "string", description: "UUID of the account" },
                      severity: { type: "string", enum: ["high", "medium", "low"] },
                      violation_type: { type: "string" },
                      title: { type: "string", description: "Short title of the issue" },
                      explanation: { type: "string", description: "Plain language explanation" },
                      metro2_principle: { type: "string", description: "The Metro2 reporting standard violated" },
                      recommended_action: { type: "string", description: "What the consumer should do" },
                    },
                    required: ["credit_account_id", "severity", "violation_type", "title", "explanation", "metro2_principle", "recommended_action"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["findings"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_findings" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");

    const parsed = JSON.parse(toolCall.function.arguments);
    const findings = parsed.findings || [];

    // Generate a batch ID for this scan
    const scanBatchId = crypto.randomUUID();

    // Clear previous findings for this household, then insert new ones
    await supabase.from("metro2_findings").delete().eq("household_id", household_id);

    if (findings.length > 0) {
      const rows = findings.map((f: any) => ({
        household_id,
        credit_account_id: f.credit_account_id,
        severity: f.severity,
        violation_type: f.violation_type,
        title: f.title,
        explanation: f.explanation,
        metro2_principle: f.metro2_principle,
        recommended_action: f.recommended_action,
        scan_batch_id: scanBatchId,
      }));
      const { error: insertErr } = await supabase.from("metro2_findings").insert(rows);
      if (insertErr) console.error("Insert error:", insertErr);
    }

    return new Response(JSON.stringify({ findings, scan_batch_id: scanBatchId, accounts_analyzed: accounts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("metro2-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
