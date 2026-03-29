import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
}

interface ParsedStatement {
  account_name: string;
  statement_period: { start: string; end: string };
  opening_balance: number;
  closing_balance: number;
  transactions: StatementTransaction[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const householdId = formData.get("household_id") as string;
    const accountId = formData.get("account_id") as string | null;

    if (!file || !householdId) throw new Error("Missing file or household_id");

    const fileName = file.name.toLowerCase();
    let parsedData: ParsedStatement;

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      parsedData = parseCSV(text, fileName);
    } else if (fileName.endsWith(".pdf")) {
      // Use AI to extract from PDF
      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
      parsedData = await parseWithAI(base64, fileName);
    } else {
      throw new Error("Unsupported file type. Please upload a CSV or PDF.");
    }

    // Now reconcile against existing transactions
    const monthStart = parsedData.statement_period.start;
    const monthEnd = parsedData.statement_period.end;

    const { data: existingTxns, error: txErr } = await supabase
      .from("transactions")
      .select("id, date, amount, merchant, normalized_merchant, account_id, notes")
      .eq("household_id", householdId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .is("deleted_at", null)
      .order("date");
    if (txErr) throw txErr;

    // Get account info for balance check
    let accountBalance: number | null = null;
    let accountName: string | null = null;
    if (accountId) {
      const { data: acct } = await supabase
        .from("accounts")
        .select("balance, name")
        .eq("id", accountId)
        .single();
      if (acct) {
        accountBalance = acct.balance;
        accountName = acct.name;
      }
    }

    // Match statement transactions to existing
    const matched: Array<{ statement: StatementTransaction; existing: any; confidence: string }> = [];
    const missingFromApp: StatementTransaction[] = [];
    const unmatchedExisting = new Set((existingTxns || []).map(t => t.id));

    for (const stmtTxn of parsedData.transactions) {
      let bestMatch: any = null;
      let bestConfidence = "none";

      for (const existing of (existingTxns || [])) {
        if (!unmatchedExisting.has(existing.id)) continue;

        const amountMatch = Math.abs(Math.abs(existing.amount) - Math.abs(stmtTxn.amount)) < 0.02;
        const dateMatch = existing.date === stmtTxn.date;
        const descLower = stmtTxn.description.toLowerCase();
        const merchantLower = (existing.merchant || existing.normalized_merchant || "").toLowerCase();
        const nameMatch = merchantLower && descLower.includes(merchantLower.substring(0, 5));

        if (amountMatch && dateMatch) {
          bestMatch = existing;
          bestConfidence = nameMatch ? "high" : "medium";
          break;
        } else if (amountMatch && !dateMatch) {
          const dateDiff = Math.abs(new Date(existing.date).getTime() - new Date(stmtTxn.date).getTime());
          if (dateDiff <= 3 * 86400000) {
            bestMatch = existing;
            bestConfidence = "low";
          }
        }
      }

      if (bestMatch) {
        unmatchedExisting.delete(bestMatch.id);
        matched.push({ statement: stmtTxn, existing: bestMatch, confidence: bestConfidence });
      } else {
        missingFromApp.push(stmtTxn);
      }
    }

    // Extra transactions in app not on statement
    const extraInApp = (existingTxns || []).filter(t => unmatchedExisting.has(t.id));

    // Balance reconciliation
    const balanceDiscrepancy = accountBalance !== null
      ? { appBalance: accountBalance, statementBalance: parsedData.closing_balance, difference: Math.round((accountBalance - parsedData.closing_balance) * 100) / 100 }
      : null;

    // Build discrepancies
    const discrepancies: Array<{ type: string; severity: string; title: string; details: any }> = [];

    if (balanceDiscrepancy && Math.abs(balanceDiscrepancy.difference) > 0.01) {
      discrepancies.push({
        type: "balance_mismatch",
        severity: Math.abs(balanceDiscrepancy.difference) > 100 ? "error" : "warning",
        title: `Balance mismatch: ${accountName || "Account"} off by $${Math.abs(balanceDiscrepancy.difference).toFixed(2)}`,
        details: balanceDiscrepancy,
      });
    }

    if (missingFromApp.length > 0) {
      discrepancies.push({
        type: "missing_in_app",
        severity: "warning",
        title: `${missingFromApp.length} statement transaction(s) not found in app`,
        details: missingFromApp.map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type })),
      });
    }

    if (extraInApp.length > 0) {
      discrepancies.push({
        type: "extra_in_app",
        severity: "info",
        title: `${extraInApp.length} app transaction(s) not found on statement`,
        details: extraInApp.map(t => ({ id: t.id, date: t.date, merchant: t.merchant, amount: t.amount })),
      });
    }

    const lowConfidence = matched.filter(m => m.confidence === "low");
    if (lowConfidence.length > 0) {
      discrepancies.push({
        type: "low_confidence_match",
        severity: "info",
        title: `${lowConfidence.length} transaction(s) matched with low confidence (date mismatch)`,
        details: lowConfidence.map(m => ({
          statement: { date: m.statement.date, description: m.statement.description, amount: m.statement.amount },
          app: { date: m.existing.date, merchant: m.existing.merchant, amount: m.existing.amount },
        })),
      });
    }

    return new Response(JSON.stringify({
      parsed: {
        account_name: parsedData.account_name,
        period: parsedData.statement_period,
        opening_balance: parsedData.opening_balance,
        closing_balance: parsedData.closing_balance,
        transaction_count: parsedData.transactions.length,
      },
      reconciliation: {
        matched_count: matched.length,
        missing_from_app: missingFromApp.length,
        extra_in_app: extraInApp.length,
        high_confidence: matched.filter(m => m.confidence === "high").length,
        medium_confidence: matched.filter(m => m.confidence === "medium").length,
        low_confidence: lowConfidence.length,
      },
      balance: balanceDiscrepancy,
      discrepancies,
      missing_transactions: missingFromApp,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("parse-bank-statement error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseCSV(text: string, _fileName: string): ParsedStatement {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV file is empty or invalid");

  const header = lines[0].toLowerCase();
  const transactions: StatementTransaction[] = [];

  // Auto-detect column positions
  const cols = header.split(",").map(c => c.replace(/"/g, "").trim());
  const dateIdx = cols.findIndex(c => /date/i.test(c));
  const descIdx = cols.findIndex(c => /desc|memo|narr|payee|merchant/i.test(c));
  const amountIdx = cols.findIndex(c => /^amount$/i.test(c));
  const debitIdx = cols.findIndex(c => /debit|withdrawal|charge/i.test(c));
  const creditIdx = cols.findIndex(c => /credit|deposit/i.test(c));
  const balIdx = cols.findIndex(c => /balance/i.test(c));

  if (dateIdx === -1) throw new Error("Could not find a Date column in CSV");

  let runningBalance = 0;
  let firstBalance = 0;
  let lastBalance = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").trim()) || [];
    if (row.length <= dateIdx) continue;

    const dateStr = row[dateIdx];
    const desc = descIdx >= 0 ? row[descIdx] : "Unknown";

    let amount = 0;
    let type: "credit" | "debit" = "debit";

    if (amountIdx >= 0) {
      amount = parseFloat(row[amountIdx]?.replace(/[$,]/g, "") || "0");
      type = amount >= 0 ? "credit" : "debit";
      amount = Math.abs(amount);
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debitVal = debitIdx >= 0 ? parseFloat(row[debitIdx]?.replace(/[$,]/g, "") || "0") : 0;
      const creditVal = creditIdx >= 0 ? parseFloat(row[creditIdx]?.replace(/[$,]/g, "") || "0") : 0;
      if (creditVal > 0) { amount = creditVal; type = "credit"; }
      else { amount = Math.abs(debitVal); type = "debit"; }
    }

    if (balIdx >= 0) {
      const bal = parseFloat(row[balIdx]?.replace(/[$,]/g, "") || "0");
      if (i === 1) firstBalance = bal;
      lastBalance = bal;
    }

    // Parse date
    let parsedDate = dateStr;
    const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
      parsedDate = `${year}-${dateMatch[1].padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`;
    }

    if (amount > 0) {
      transactions.push({ date: parsedDate, description: desc, amount, type });
    }
  }

  const dates = transactions.map(t => t.date).sort();

  return {
    account_name: "Uploaded Statement",
    statement_period: { start: dates[0] || "", end: dates[dates.length - 1] || "" },
    opening_balance: firstBalance,
    closing_balance: lastBalance,
    transactions,
  };
}

async function parseWithAI(base64: string, fileName: string): Promise<ParsedStatement> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("AI parsing not configured");

  const response = await fetch("https://ai.lovable.dev/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all transactions from this bank statement PDF. Return ONLY valid JSON with this exact structure:
{
  "account_name": "string",
  "statement_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "opening_balance": number,
  "closing_balance": number,
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "string", "amount": number (always positive), "type": "credit" or "debit" }
  ]
}
Extract every single transaction. Deposits are "credit", charges/withdrawals are "debit". File: ${fileName}`,
            },
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI parsing failed: ${errText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}
