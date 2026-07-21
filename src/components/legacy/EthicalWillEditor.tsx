import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Sparkles, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/contexts/HouseholdContext";
import { ETHICAL_WILL_SECTIONS, type EthicalWillDraft } from "@/lib/legacy/ethicalWill";

export function EthicalWillEditor() {
  const { household } = useHousehold();
  const [draft, setDraft] = useState<EthicalWillDraft>({ values: "", wisdom: "", lessons: "", blessings: "" });
  const [id, setId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>("");
  const [draftingKey, setDraftingKey] = useState<string | null>(null);

  useEffect(() => { if (household?.id) load(); }, [household?.id]);

  const load = async () => {
    const { data } = await supabase
      .from("ethical_wills")
      .select("*")
      .eq("household_id", household!.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setId(data.id);
      setDraft({
        values: data.values_md || "", wisdom: data.wisdom_md || "",
        lessons: data.lessons_md || "", blessings: data.blessings_md || "",
      });
    }
    // Load author name from profile
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes.user) {
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", userRes.user.id).maybeSingle();
      setAuthorName(prof?.display_name || userRes.user.email || "");
    }
  };

  const save = async () => {
    if (!household?.id) return;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const payload = {
      household_id: household.id, user_id: userRes.user.id,
      values_md: draft.values, wisdom_md: draft.wisdom,
      lessons_md: draft.lessons, blessings_md: draft.blessings,
    };
    if (id) await supabase.from("ethical_wills").update(payload).eq("id", id);
    else {
      const { data } = await supabase.from("ethical_wills").insert(payload).select().maybeSingle();
      if (data) setId(data.id);
    }
    toast.success("Ethical will saved");
  };

  const aiDraft = async (key: keyof EthicalWillDraft) => {
    setDraftingKey(key);
    try {
      const { data, error } = await supabase.functions.invoke("family-constitution-draft", {
        body: {
          section: `ew_${key}`,
          family_name: authorName || "the writer",
          existing: draft[key] || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.draft) {
        setDraft((d) => ({ ...d, [key]: data.draft }));
        toast.success("AI draft added — edit to make it yours");
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("429") || msg.toLowerCase().includes("rate")) toast.error("Rate limited — try again in a moment");
      else if (msg.includes("402") || msg.toLowerCase().includes("credit")) toast.error("AI credits exhausted");
      else toast.error("Could not draft — try again");
    } finally {
      setDraftingKey(null);
    }
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const cleanMarkdown = (raw: string) => {
    if (!raw) return "";
    let t = raw;
    t = t.replace(/\*\*\*(.+?)\*\*\*/g, "$1");
    t = t.replace(/\*\*(.+?)\*\*/g, "$1");
    t = t.replace(/__(.+?)__/g, "$1");
    t = t.replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1$2");
    t = t.replace(/(^|[^_])_(?!\s)([^_\n]+?)_(?!_)/g, "$1$2");
    t = t.replace(/^\s*[*\-+]\s+/gm, "• ");
    t = t.replace(/^#{1,6}\s+/gm, "");
    t = t.replace(/\*/g, "");
    return t;
  };

  const openPrintable = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const body = ETHICAL_WILL_SECTIONS.map((s) => {
      const raw = draft[s.key];
      if (!raw?.trim()) return "";
      return `<h2>${escapeHtml(s.label)}</h2><p>${escapeHtml(cleanMarkdown(raw))}</p>`;
    }).join("");
    const author = authorName ? `by ${escapeHtml(authorName)}` : "";
    w.document.write(`
      <html><head><title>Ethical Will${authorName ? ` — ${escapeHtml(authorName)}` : ""}</title>
      <style>
        body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.7;color:#111}
        h1{text-align:center;font-size:2rem;margin-bottom:4px}
        .byline{text-align:center;color:#555;margin-bottom:2rem;font-style:italic}
        h2{border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:2rem;font-size:1.25rem}
        p{white-space:pre-wrap;margin:0.75rem 0}
        .note{text-align:center;color:#888;font-size:0.85rem;margin-top:3rem;border-top:1px solid #eee;padding-top:1rem}
      </style>
      </head><body>
      <h1>Ethical Will</h1>
      <div class="byline">${author}${author ? " · " : ""}${new Date().toLocaleDateString()}</div>
      ${body || "<p><em>No sections written yet.</em></p>"}
      <div class="note">A non-legal companion to my legal will — values, wisdom, and blessings for future generations.</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Ethical Will</CardTitle>
            <CardDescription>A non-legal companion to your legal will — your values, wisdom, and blessings for future generations.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5 mr-1.5" /> Save</Button>
            <Button size="sm" variant="outline" onClick={openPrintable}>
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm">
          <Label className="text-xs">Your name (appears on the printed document)</Label>
          <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. Lyman Montgomery" />
        </div>

        {ETHICAL_WILL_SECTIONS.map((s) => (
          <div key={s.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <Label className="text-sm font-semibold">{s.label}</Label>
                <p className="text-xs text-muted-foreground">{s.prompt}</p>
                <p className="text-xs text-muted-foreground italic">e.g. {s.examples.join(" · ")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => aiDraft(s.key)} disabled={draftingKey === s.key}>
                <Sparkles className="h-3 w-3 mr-1" />
                {draftingKey === s.key ? "Drafting…" : draft[s.key] ? "Refine with AI" : "AI draft"}
              </Button>
            </div>
            <Textarea rows={6} value={draft[s.key]} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} />
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Button onClick={save}><Save className="h-3.5 w-3.5 mr-1.5" /> Save</Button>
          <Button variant="outline" onClick={openPrintable}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Print / Save as PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
