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

const BUCKET = "foundation-documents";
const MAX_BYTES = 15 * 1024 * 1024;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const SYSTEM_PROMPT =
  "You transcribe and index foundation governance, legal, financial, and grant documents so they can be searched. " +
  'Return ONLY valid JSON, no markdown: {"full_text":string,"page_count":number|null,"doc_kind":string,' +
  '"parties":[string],"key_dates":[{"date":string,"label":string}],' +
  '"clauses":[{"heading":string,"text":string}],"decisions":[string],' +
  '"obligations":[string],"amounts":[{"label":string,"amount":string}],"summary":string}. ' +
  "full_text must be a faithful, complete transcription of every readable word in reading order, including headers, " +
  "tables (as pipe-separated rows), signature blocks, and handwriting where legible. Never summarize inside full_text. " +
  "clauses should capture each numbered or titled provision with its operative language, quoted from the document. " +
  "decisions should list resolutions, approvals, votes, and determinations that were made. " +
  "key_dates uses ISO YYYY-MM-DD where the document gives a full date, otherwise reproduce the text as printed. " +
  "Use an empty array when a section is absent and never invent content. Keep summary under 600 characters.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let documentId = "";
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    supabase = createClient(
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
    documentId = typeof body?.documentId === "string" ? body.documentId : "";
    if (!documentId) return json({ error: "documentId is required" }, 400);

    // RLS scopes this read to the caller's household.
    const { data: doc, error: docErr } = await supabase
      .from("fdn_documents")
      .select("id, title, doc_category, file_path, file_name, mime_type, size_bytes")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr) throw docErr;
    if (!doc) return json({ error: "Document not found" }, 404);
    if (!doc.file_path) return json({ error: "This record has no stored file" }, 400);
    if (doc.size_bytes && Number(doc.size_bytes) > MAX_BYTES) {
      return json({ error: "File is too large to index (15MB max)" }, 400);
    }

    await supabase.from("fdn_documents").update({ ocr_status: "processing", ocr_error: null }).eq("id", documentId);

    const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(doc.file_path);
    if (dlErr || !file) return json({ error: dlErr?.message ?? "Could not read the file" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MAX_BYTES) return json({ error: "File is too large to index (15MB max)" }, 400);

    const mime = doc.mime_type || file.type || "application/octet-stream";

    // Plain text files need no vision pass — index them directly.
    if (mime.startsWith("text/") || /\.(txt|md|csv)$/i.test(doc.file_name ?? "")) {
      const text = new TextDecoder().decode(bytes).slice(0, 400_000);
      const { error: upErr } = await supabase
        .from("fdn_documents")
        .update({
          ocr_status: "indexed",
          ocr_at: new Date().toISOString(),
          ocr_text: text,
          extracted: { doc_kind: "text file", summary: text.slice(0, 400) },
        })
        .eq("id", documentId);
      if (upErr) throw upErr;
      return json({ indexed: true, characters: text.length });
    }

    const dataUrl = `data:${mime};base64,${toBase64(bytes)}`;
    const contentBlock = mime.startsWith("image/")
      ? { type: "image_url", image_url: { url: dataUrl } }
      : { type: "file", file: { filename: doc.file_name || "document.pdf", file_data: dataUrl } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
                text: `Transcribe and index this ${doc.doc_category ?? "foundation"} document titled "${doc.title}".`,
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
        .from("fdn_documents")
        .update({ ocr_status: "failed", ocr_error: `Gateway ${response.status}` })
        .eq("id", documentId);
      if (response.status === 429) return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add credits." }, 402);
      console.error("gateway error", response.status, detail.slice(0, 500));
      return json({ error: "Could not read the document" }, 502);
    }

    const ai = await response.json();
    const raw: string = ai?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        await supabase
          .from("fdn_documents")
          .update({ ocr_status: "failed", ocr_error: "Unreadable model output" })
          .eq("id", documentId);
        return json({ error: "The document could not be read" }, 422);
      }
      parsed = JSON.parse(match[0]);
    }

    const fullText = String(parsed.full_text ?? "").slice(0, 400_000);
    const { full_text: _omit, ...extracted } = parsed;

    const { error: upErr } = await supabase
      .from("fdn_documents")
      .update({
        ocr_status: fullText.trim() ? "indexed" : "empty",
        ocr_at: new Date().toISOString(),
        ocr_text: fullText,
        ocr_error: null,
        page_count: Number.isFinite(Number(parsed.page_count)) ? Number(parsed.page_count) : null,
        extracted,
      })
      .eq("id", documentId);
    if (upErr) throw upErr;

    return json({ indexed: true, characters: fullText.length, extracted });
  } catch (e) {
    console.error("ocr-foundation-document", e);
    if (supabase && documentId) {
      await supabase
        .from("fdn_documents")
        .update({ ocr_status: "failed", ocr_error: e instanceof Error ? e.message.slice(0, 300) : "Unexpected error" })
        .eq("id", documentId);
    }
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
