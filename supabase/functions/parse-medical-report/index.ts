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

const BUCKET = "medical-documents";
const MAX_BYTES = 12 * 1024 * 1024;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const SYSTEM_PROMPT =
  "You are a clinical documentation analyst. Read the attached medical or laboratory report and extract its contents. " +
  'Return ONLY valid JSON, no markdown: {"report_type":string,"report_date":string|null,"provider":string|null,"patient":string|null,' +
  '"results":[{"name":string,"value":string,"unit":string|null,"reference_range":string|null,"flag":"normal"|"low"|"high"|"abnormal"|"unknown"}],' +
  '"diagnoses":[string],"medications":[string],"vitals":[{"name":string,"value":string}],' +
  '"key_findings":[string],"follow_ups":[string],"summary":string,"confidence":"high"|"medium"|"low"}. ' +
  "Copy values exactly as printed; never invent results. Use an empty array when a section is absent. " +
  "Keep summary under 600 characters and plain-language. Do not give medical advice or a diagnosis of your own.";

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
    const documentId = typeof body?.documentId === "string" ? body.documentId : "";
    if (!documentId) return json({ error: "documentId is required" }, 400);

    // RLS scopes this read to the caller's household.
    const { data: doc, error: docErr } = await supabase
      .from("health_medical_documents")
      .select("id, title, doc_type, file_path, file_name, mime_type, file_size")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr) throw docErr;
    if (!doc) return json({ error: "Report not found" }, 404);
    if (doc.file_size && doc.file_size > MAX_BYTES) {
      return json({ error: "File is too large to parse (12MB max)" }, 400);
    }

    const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(doc.file_path);
    if (dlErr || !file) return json({ error: dlErr?.message ?? "Could not read the file" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MAX_BYTES) return json({ error: "File is too large to parse (12MB max)" }, 400);

    const mime = doc.mime_type || file.type || "application/octet-stream";
    const b64 = toBase64(bytes);
    const dataUrl = `data:${mime};base64,${b64}`;

    const contentBlock = mime.startsWith("image/")
      ? { type: "image_url", image_url: { url: dataUrl } }
      : {
          type: "file",
          file: { filename: doc.file_name || "report.pdf", file_data: dataUrl },
        };

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
              {
                type: "text",
                text: `Extract the structured contents of this ${doc.doc_type ?? "medical"} report titled "${doc.title}".`,
              },
              contentBlock,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      await supabase
        .from("health_medical_documents")
        .update({ parse_status: "failed" })
        .eq("id", documentId);
      if (response.status === 429) return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add credits." }, 402);
      console.error("gateway error", response.status, detail.slice(0, 500));
      return json({ error: "Could not parse the report" }, 502);
    }

    const ai = await response.json();
    const raw: string = ai?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        await supabase
          .from("health_medical_documents")
          .update({ parse_status: "failed" })
          .eq("id", documentId);
        return json({ error: "The report could not be read" }, 422);
      }
      parsed = JSON.parse(match[0]);
    }

    const { error: upErr } = await supabase
      .from("health_medical_documents")
      .update({
        parse_status: "parsed",
        parsed_at: new Date().toISOString(),
        parsed_summary: parsed,
      })
      .eq("id", documentId);
    if (upErr) throw upErr;

    return json({ parsed });
  } catch (e) {
    console.error("parse-medical-report", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
