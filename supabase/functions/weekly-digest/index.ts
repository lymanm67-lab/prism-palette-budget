import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify cron secret to prevent unauthorized access
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all households with their members
    const { data: members, error: membersErr } = await supabase
      .from("household_members")
      .select("household_id, user_id");
    if (membersErr) throw membersErr;

    // Group by household
    const householdMap = new Map<string, string[]>();
    for (const m of members || []) {
      const list = householdMap.get(m.household_id) || [];
      list.push(m.user_id);
      householdMap.set(m.household_id, list);
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];
    const nextWeekStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    let emailsSent = 0;
    const errors: string[] = [];

    for (const [householdId, userIds] of householdMap) {
      try {
        // Fetch transactions for the past week
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, category_id, merchant, categories(name)")
          .eq("household_id", householdId)
          .gte("date", weekAgoStr)
          .lte("date", todayStr);

        // Fetch budgets for current month
        const { data: budgets } = await supabase
          .from("budgets")
          .select("planned_amount, category_id, categories(name)")
          .eq("household_id", householdId)
          .eq("month", currentMonth);

        // Fetch all transactions this month for budget comparison
        const { data: monthTransactions } = await supabase
          .from("transactions")
          .select("amount, category_id")
          .eq("household_id", householdId)
          .gte("date", currentMonth)
          .lte("date", todayStr);

        // Fetch upcoming recurring bills
        const { data: recurring } = await supabase
          .from("recurring_transactions")
          .select("amount, merchant, next_due_date, categories(name)")
          .eq("household_id", householdId)
          .eq("is_active", true)
          .gte("next_due_date", todayStr)
          .lte("next_due_date", nextWeekStr)
          .order("next_due_date");

        // Calculate spending summary
        const totalSpent = (transactions || [])
          .filter((t: any) => t.amount < 0)
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

        const totalIncome = (transactions || [])
          .filter((t: any) => t.amount > 0)
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        // Spending by category
        const categorySpending: Record<string, number> = {};
        for (const t of (transactions || [])) {
          if (t.amount < 0) {
            const name = (t as any).categories?.name || "Uncategorized";
            categorySpending[name] = (categorySpending[name] || 0) + Math.abs(t.amount);
          }
        }
        const topCategories = Object.entries(categorySpending)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);

        // Budget status
        const monthSpendingByCategory: Record<string, number> = {};
        for (const t of (monthTransactions || [])) {
          if (t.amount < 0 && t.category_id) {
            monthSpendingByCategory[t.category_id] = (monthSpendingByCategory[t.category_id] || 0) + Math.abs(t.amount);
          }
        }

        const budgetItems = (budgets || []).map((b: any) => {
          const spent = monthSpendingByCategory[b.category_id] || 0;
          const pct = b.planned_amount > 0 ? Math.round((spent / b.planned_amount) * 100) : 0;
          return {
            category: b.categories?.name || "Unknown",
            planned: b.planned_amount,
            spent,
            pct,
          };
        }).sort((a: any, b: any) => b.pct - a.pct);

        // Upcoming bills
        const upcomingBills = (recurring || []).map((r: any) => ({
          merchant: r.merchant || r.categories?.name || "Bill",
          amount: Math.abs(r.amount),
          dueDate: r.next_due_date,
        }));

        const totalUpcoming = upcomingBills.reduce((s: number, b: any) => s + b.amount, 0);

        // Build email HTML
        const emailHtml = buildEmailHtml({
          totalSpent,
          totalIncome,
          topCategories,
          budgetItems,
          upcomingBills,
          totalUpcoming,
          weekStart: weekAgoStr,
          weekEnd: todayStr,
        });

        // Get emails for all household members
        for (const userId of userIds) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, weekly_digest_enabled")
            .eq("user_id", userId)
            .single();

          // Skip users who have opted out
          if (profile?.weekly_digest_enabled === false) continue;

          // Get user email from auth
          const { data: { user } } = await supabase.auth.admin.getUserById(userId);
          if (!user?.email) continue;

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "PrismBudget <onboarding@resend.dev>",
              to: [user.email],
              subject: `💰 Your Weekly Financial Digest — ${formatDate(weekAgoStr)} to ${formatDate(todayStr)}`,
              html: emailHtml.replace("{{name}}", profile?.display_name || user.email.split("@")[0]),
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            errors.push(`Failed to send to ${user.email}: ${errText}`);
          } else {
            emailsSent++;
          }
        }
      } catch (err: any) {
        errors.push(`Household ${householdId}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emails_sent: emailsSent, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("weekly-digest error:", e);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatCurrency(n: number): string {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function buildEmailHtml(data: {
  totalSpent: number;
  totalIncome: number;
  topCategories: [string, number][];
  budgetItems: any[];
  upcomingBills: any[];
  totalUpcoming: number;
  weekStart: string;
  weekEnd: string;
}): string {
  const categoryRows = data.topCategories
    .map(([name, amount]) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;">${name}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#1f2937;">${formatCurrency(amount)}</td></tr>`
    ).join("");

  const budgetRows = data.budgetItems.slice(0, 6)
    .map((b: any) => {
      const barColor = b.pct >= 100 ? "#ef4444" : b.pct >= 80 ? "#f59e0b" : "#10b981";
      const barWidth = Math.min(b.pct, 100);
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
        <div style="color:#374151;margin-bottom:4px;">${b.category}</div>
        <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background:${barColor};height:100%;width:${barWidth}%;border-radius:4px;"></div>
        </div>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top;">
        <span style="font-weight:600;color:${barColor};">${b.pct}%</span><br/>
        <span style="font-size:12px;color:#6b7280;">${formatCurrency(b.spent)} / ${formatCurrency(b.planned)}</span>
      </td></tr>`;
    }).join("");

  const billRows = data.upcomingBills
    .map((b: any) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;">${b.merchant}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#6b7280;">${formatDate(b.dueDate)}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#1f2937;">${formatCurrency(b.amount)}</td></tr>`
    ).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7c5cf5,#6d28d9);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px;">
    <div style="font-size:28px;margin-bottom:8px;">💎</div>
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px;">Your Weekly Digest</h1>
    <p style="color:#e0d4fc;font-size:14px;margin:0;">${formatDate(data.weekStart)} — ${formatDate(data.weekEnd)}</p>
  </div>

  <!-- Greeting -->
  <p style="color:#374151;font-size:16px;margin-bottom:24px;">Hi {{name}}, here's your weekly financial snapshot 👋</p>

  <!-- Summary Cards -->
  <div style="display:flex;gap:12px;margin-bottom:24px;">
    <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:12px;color:#16a34a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Income</div>
      <div style="font-size:20px;font-weight:700;color:#15803d;">${formatCurrency(data.totalIncome)}</div>
    </div>
    <div style="flex:1;background:#fef2f2;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:12px;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Spent</div>
      <div style="font-size:20px;font-weight:700;color:#b91c1c;">${formatCurrency(data.totalSpent)}</div>
    </div>
    <div style="flex:1;background:#eff6ff;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:12px;color:#2563eb;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Net</div>
      <div style="font-size:20px;font-weight:700;color:#1d4ed8;">${formatCurrency(data.totalIncome - data.totalSpent)}</div>
    </div>
  </div>

  ${data.topCategories.length > 0 ? `
  <!-- Top Spending -->
  <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px;">📊 Top Spending Categories</h2>
    <table style="width:100%;border-collapse:collapse;">${categoryRows}</table>
  </div>` : ""}

  ${data.budgetItems.length > 0 ? `
  <!-- Budget Status -->
  <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px;">📋 Budget Status (Month-to-Date)</h2>
    <table style="width:100%;border-collapse:collapse;">${budgetRows}</table>
  </div>` : ""}

  ${data.upcomingBills.length > 0 ? `
  <!-- Upcoming Bills -->
  <div style="background:#fffbeb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px;">🔔 Upcoming Bills (Next 7 Days)</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><th style="text-align:left;padding:8px 12px;color:#6b7280;font-size:12px;">Bill</th>
          <th style="text-align:center;padding:8px 12px;color:#6b7280;font-size:12px;">Due</th>
          <th style="text-align:right;padding:8px 12px;color:#6b7280;font-size:12px;">Amount</th></tr>
      ${billRows}
      <tr><td colspan="2" style="padding:12px;font-weight:600;color:#374151;">Total Due</td>
          <td style="padding:12px;text-align:right;font-weight:700;color:#b45309;">${formatCurrency(data.totalUpcoming)}</td></tr>
    </table>
  </div>` : ""}

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px;">
    <a href="https://prism-palette-budget.lovable.app/dashboard" style="display:inline-block;background:#7c5cf5;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">View Full Dashboard →</a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #f0f0f0;padding-top:16px;">
    <p>Sent by PrismBudget • Your finances, your way</p>
  </div>
</div>
</body>
</html>`;
}
