// Nightly Coach dispatcher.
// Runs as service role via pg_cron. Loops all households and runs the
// leak-detection logic + flags households needing a paycheck plan.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Cron auth: require shared secret header (cron passes via apikey)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") || req.headers.get("apikey");
  if (cronSecret && provided !== cronSecret && provided !== Deno.env.get("SUPABASE_ANON_KEY")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary = {
    started_at: new Date().toISOString(),
    households_scanned: 0,
    leaks_inserted: 0,
    paycheck_plans_built: 0,
    errors: [] as string[],
  };

  try {
    const { data: households, error: hhErr } = await supabase
      .from("households")
      .select("id");
    if (hhErr) throw hhErr;

    for (const hh of (households || [])) {
      summary.households_scanned++;
      const householdId = hh.id;

      try {
        // 1. Lightweight leak scan: fees + zombie subscriptions
        const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
        const { data: txns } = await supabase
          .from("transactions")
          .select("amount, merchant, date, account_id")
          .eq("household_id", householdId)
          .gte("date", ninetyDaysAgo)
          .is("deleted_at", null)
          .limit(2000);

        const feePatterns = [
          { type: "overdraft", regex: /overdraft|nsf|insufficient/i, risk: "high", title: "Overdraft fee", fix: "Enable overdraft protection or shift due dates to after payday." },
          { type: "late_fee", regex: /late\s*fee|past\s*due/i, risk: "high", title: "Late fee", fix: "Move this bill onto autopay with a 3-day reminder." },
          { type: "atm_fee", regex: /atm\s*fee|atm\s*surcharge|out[- ]of[- ]network/i, risk: "low", title: "ATM fee", fix: "Use in-network ATMs or cash-back at checkout." },
          { type: "interest_charge", regex: /interest\s*charge|finance\s*charge/i, risk: "high", title: "Interest charge", fix: "Pay statement balance in full; consider a payoff sprint." },
        ];

        const feeBuckets = new Map<string, { count: number; total: number; example: string }>();
        for (const t of (txns || [])) {
          if (Number(t.amount) >= 0 || !t.merchant) continue;
          for (const p of feePatterns) {
            if (p.regex.test(t.merchant)) {
              const key = p.type;
              const b = feeBuckets.get(key) || { count: 0, total: 0, example: p.title };
              b.count++;
              b.total += Math.abs(Number(t.amount));
              feeBuckets.set(key, b);
            }
          }
        }

        // Insert one leak per fee bucket — upsert by checking existing open leak for same type
        for (const [type, b] of feeBuckets.entries()) {
          if (b.count < 2 && b.total < 25) continue;
          const monthly = Math.round((b.total / 3) * 100) / 100;
          const annual = Math.round(monthly * 12 * 100) / 100;
          const { data: existing } = await supabase
            .from("money_leaks")
            .select("id")
            .eq("household_id", householdId)
            .eq("leak_type", type)
            .eq("status", "open")
            .maybeSingle();
          if (existing) continue;
          const pmeta = feePatterns.find(p => p.type === type)!;
          await supabase.from("money_leaks").insert({
            household_id: householdId,
            leak_type: type,
            title: `${pmeta.title} — ${b.count} hit${b.count === 1 ? '' : 's'} in 90 days`,
            monthly_cost: monthly,
            annual_cost: annual,
            three_year_cost: Math.round(annual * 3 * 100) / 100,
            risk_level: pmeta.risk,
            recommended_fix: pmeta.fix,
            suggested_redirect: "ef",
            status: "open",
          });
          summary.leaks_inserted++;
        }

        // 2. Build a paycheck plan if none exists for the next 7 days
        const sevenDaysOut = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        const { data: existingPlans } = await supabase
          .from("paycheck_deployments")
          .select("id")
          .eq("household_id", householdId)
          .gte("pay_date", today)
          .lte("pay_date", sevenDaysOut)
          .limit(1);
        if ((existingPlans?.length ?? 0) === 0) {
          // Trigger paycheck-deploy via internal HTTP (service role)
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/paycheck-deploy`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ household_id: householdId, persist: true }),
            });
            summary.paycheck_plans_built++;
          } catch (e) {
            console.error("paycheck-deploy call failed", e);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.errors.push(`${householdId}: ${msg}`);
        console.error(`Household ${householdId}:`, msg);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...summary, finished_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coach-nightly fatal", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown", ...summary }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
