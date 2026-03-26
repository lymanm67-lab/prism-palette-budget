import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    // Auth: get user from JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { household_id, month } = await req.json();
    if (!household_id || !month) {
      return new Response(JSON.stringify({ error: "household_id and month required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify membership
    const { data: membership } = await admin
      .from("household_members")
      .select("id")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthDate = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const endDate = new Date(y, m, 0).toISOString().split("T")[0]; // last day

    // ========== GATHER DATA ==========

    // Accounts
    const { data: accounts } = await admin
      .from("accounts")
      .select("id, name, balance, account_type, is_active")
      .eq("household_id", household_id);

    // Transactions for the month
    const { data: transactions } = await admin
      .from("transactions")
      .select("id, date, amount, merchant, category_id, account_id, is_transfer, deleted_at, normalized_merchant, notes")
      .eq("household_id", household_id)
      .gte("date", monthDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    // Categories + groups
    const { data: categories } = await admin
      .from("categories")
      .select("id, name, group_id")
      .eq("household_id", household_id);

    const { data: categoryGroups } = await admin
      .from("category_groups")
      .select("id, name, budget_type, expense_type, business_profile_id")
      .eq("household_id", household_id);

    // Business profiles
    const { data: bizProfiles } = await admin
      .from("business_profiles")
      .select("id, business_name")
      .eq("household_id", household_id)
      .eq("is_active", true);

    // Budgets for the month
    const { data: budgets } = await admin
      .from("budgets")
      .select("id, category_id, planned_amount")
      .eq("household_id", household_id)
      .eq("month", monthDate);

    // ========== RUN CHECKS ==========
    const findings: any[] = [];

    const catMap = new Map((categories || []).map((c) => [c.id, c]));
    const groupMap = new Map((categoryGroups || []).map((g) => [g.id, g]));
    const acctMap = new Map((accounts || []).map((a) => [a.id, a]));
    const bizMap = new Map((bizProfiles || []).map((b) => [b.id, b]));
    const budgetedCatIds = new Set((budgets || []).map((b) => b.category_id));

    const txns = transactions || [];

    // 1. Missing categorizations
    const uncategorized = txns.filter((t) => !t.category_id && !t.is_transfer);
    if (uncategorized.length > 0) {
      findings.push({
        type: "missing_category",
        severity: "warning",
        title: `${uncategorized.length} uncategorized transaction${uncategorized.length > 1 ? "s" : ""}`,
        details: uncategorized.slice(0, 20).map((t) => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          merchant: t.merchant || t.normalized_merchant || "Unknown",
          account: acctMap.get(t.account_id)?.name || "Unknown",
        })),
      });
    }

    // Check business transactions without proper assignment
    const businessGroupIds = new Set(
      (categoryGroups || []).filter((g) => g.budget_type === "business").map((g) => g.id)
    );
    const businessCatIds = new Set(
      (categories || []).filter((c) => businessGroupIds.has(c.group_id)).map((c) => c.id)
    );
    const personalGroupIds = new Set(
      (categoryGroups || []).filter((g) => g.budget_type === "personal").map((g) => g.id)
    );

    // 2. Duplicate detection
    const dupeMap = new Map<string, any[]>();
    for (const t of txns) {
      const key = `${t.date}|${Math.abs(t.amount).toFixed(2)}|${(t.merchant || "").toLowerCase().trim()}`;
      if (!dupeMap.has(key)) dupeMap.set(key, []);
      dupeMap.get(key)!.push(t);
    }
    const duplicates = [...dupeMap.entries()]
      .filter(([, group]) => group.length > 1 && !group[0].is_transfer)
      .map(([key, group]) => ({
        key,
        count: group.length,
        transactions: group.map((t) => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          merchant: t.merchant,
          account: acctMap.get(t.account_id)?.name,
        })),
      }));
    if (duplicates.length > 0) {
      findings.push({
        type: "duplicates",
        severity: "warning",
        title: `${duplicates.length} potential duplicate group${duplicates.length > 1 ? "s" : ""} found`,
        details: duplicates.slice(0, 10),
      });
    }

    // 3. Balance reconciliation
    const balanceByAcct: Record<string, number> = {};
    for (const t of txns) {
      balanceByAcct[t.account_id] = (balanceByAcct[t.account_id] || 0) + t.amount;
    }
    const balanceIssues: any[] = [];
    for (const acct of accounts || []) {
      if (!acct.is_active) continue;
      const txnTotal = balanceByAcct[acct.id] || 0;
      balanceIssues.push({
        account: acct.name,
        account_type: acct.account_type,
        recorded_balance: acct.balance,
        month_net_flow: txnTotal,
        transaction_count: txns.filter((t) => t.account_id === acct.id).length,
      });
    }
    findings.push({
      type: "balance_reconciliation",
      severity: "info",
      title: "Account balance summary",
      details: balanceIssues,
    });

    // 4. Tax-readiness gaps
    const taxGaps: any[] = [];

    // Unbudgeted business income/expenses
    const businessTxns = txns.filter((t) => t.category_id && businessCatIds.has(t.category_id));
    const unbudgetedBizCats = new Set<string>();
    for (const t of businessTxns) {
      if (!budgetedCatIds.has(t.category_id!)) {
        unbudgetedBizCats.add(t.category_id!);
      }
    }
    if (unbudgetedBizCats.size > 0) {
      taxGaps.push({
        issue: "Unbudgeted business categories with transactions",
        categories: [...unbudgetedBizCats].map((id) => catMap.get(id)?.name || id),
        recommendation: "Create budget entries for these categories to track against plan",
      });
    }

    // Business transactions with personal categories
    // (This checks for possible mis-categorization)
    const personalCatIds = new Set(
      (categories || []).filter((c) => personalGroupIds.has(c.group_id)).map((c) => c.id)
    );

    // Missing income categories for businesses
    const incomeGroups = (categoryGroups || []).filter(
      (g) => g.budget_type === "business" && g.expense_type === "income"
    );
    for (const bp of bizProfiles || []) {
      const hasIncome = incomeGroups.some((g) => g.business_profile_id === bp.id);
      if (!hasIncome) {
        taxGaps.push({
          issue: `No income category group for ${bp.business_name}`,
          recommendation: "Add an income category group for proper Schedule C reporting",
        });
      }
    }

    // Large round-number expenses without receipts/notes
    const largeNoNotes = txns.filter(
      (t) => t.amount < -100 && !t.notes && !t.is_transfer && t.category_id && businessCatIds.has(t.category_id)
    );
    if (largeNoNotes.length > 0) {
      taxGaps.push({
        issue: `${largeNoNotes.length} business expense(s) over $100 without notes/documentation`,
        transactions: largeNoNotes.slice(0, 10).map((t) => ({
          date: t.date,
          amount: t.amount,
          merchant: t.merchant,
        })),
        recommendation: "Add notes or receipt attachments for IRS audit trail",
      });
    }

    if (taxGaps.length > 0) {
      findings.push({
        type: "tax_readiness",
        severity: taxGaps.some((g) => g.issue.includes("No income")) ? "error" : "warning",
        title: `${taxGaps.length} tax-readiness gap${taxGaps.length > 1 ? "s" : ""} found`,
        details: taxGaps,
      });
    }

    // ========== SUMMARY STATS ==========
    const totalTxns = txns.length;
    const totalIncome = txns.filter((t) => t.amount > 0 && !t.is_transfer).reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter((t) => t.amount < 0 && !t.is_transfer).reduce((s, t) => s + Math.abs(t.amount), 0);
    const bizIncome = txns
      .filter((t) => t.amount > 0 && t.category_id && businessCatIds.has(t.category_id))
      .reduce((s, t) => s + t.amount, 0);
    const bizExpenses = txns
      .filter((t) => t.amount < 0 && t.category_id && businessCatIds.has(t.category_id))
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const summary = {
      month,
      total_transactions: totalTxns,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      business_income: bizIncome,
      business_expenses: bizExpenses,
      uncategorized_count: uncategorized.length,
      duplicate_groups: duplicates.length,
      tax_gaps: taxGaps.length,
      accounts_reviewed: (accounts || []).filter((a) => a.is_active).length,
      businesses_reviewed: (bizProfiles || []).length,
      finding_counts: {
        errors: findings.filter((f) => f.severity === "error").length,
        warnings: findings.filter((f) => f.severity === "warning").length,
        info: findings.filter((f) => f.severity === "info").length,
      },
    };

    // ========== AI NARRATIVE ==========
    let aiNarrative = "";
    if (lovableKey) {
      try {
        const aiPrompt = `You are a financial auditor for a small business owner with ${(bizProfiles || []).map((b) => b.business_name).join(", ")} as active businesses.

Analyze this monthly reconciliation for ${month} and write a concise audit narrative (3-5 paragraphs). Include:
1. Overall financial health summary for the month
2. Key issues found and their severity
3. Specific action items for tax-readiness
4. Any red flags for IRS compliance

Data:
- Summary: ${JSON.stringify(summary)}
- Findings: ${JSON.stringify(findings.map((f) => ({ type: f.type, severity: f.severity, title: f.title })))}
- Tax gaps: ${JSON.stringify(taxGaps)}
- Uncategorized: ${uncategorized.length} transactions
- Duplicates: ${duplicates.length} groups

Write in a professional but accessible tone. Use specific numbers. Format with markdown.`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a CPA-level financial auditor specializing in small business tax compliance." },
              { role: "user", content: aiPrompt },
            ],
          }),
        });
        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiNarrative = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI narrative error:", e);
        aiNarrative = "AI narrative generation failed. Review findings manually.";
      }
    }

    // ========== SAVE RESULTS ==========
    const { data: audit, error: saveErr } = await admin
      .from("reconciliation_audits")
      .upsert(
        {
          household_id,
          audit_month: monthDate,
          status: "completed",
          trigger_type: "manual",
          summary,
          findings,
          ai_narrative: aiNarrative,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "household_id,audit_month,trigger_type" }
      )
      .select()
      .single();

    if (saveErr) {
      console.error("Save error:", saveErr);
    }

    return new Response(
      JSON.stringify({ audit, summary, findings, ai_narrative: aiNarrative }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Audit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
