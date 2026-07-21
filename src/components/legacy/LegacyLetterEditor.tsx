import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, FileText, Upload, Paperclip, ShieldCheck, Download, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/contexts/HouseholdContext";
import { LEGACY_LETTER_TEMPLATES } from "@/lib/legacy/legacyLetter";

interface LegacyLetter {
  id: string;
  recipient: string;
  title: string | null;
  body: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  shared_with_trust_vault: boolean;
  updated_at: string;
}

export function LegacyLetterEditor() {
  const { household } = useHousehold();
  const [letters, setLetters] = useState<LegacyLetter[]>([]);
  const [current, setCurrent] = useState<Partial<LegacyLetter> | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (household?.id) load(); }, [household?.id]);

  const load = async () => {
    const { data } = await supabase
      .from("legacy_letters")
      .select("*")
      .eq("household_id", household!.id)
      .order("updated_at", { ascending: false });
    setLetters((data as LegacyLetter[]) || []);
  };

  const startNew = (templateId?: string) => {
    const tpl = LEGACY_LETTER_TEMPLATES.find((t) => t.id === templateId);
    setCurrent({
      recipient: tpl?.recipient || "",
      title: tpl?.title || "",
      body: tpl?.starter || "",
      attachment_path: null,
      attachment_name: null,
      shared_with_trust_vault: false,
    });
  };

  const save = async (): Promise<LegacyLetter | null> => {
    if (!current || !household?.id) return null;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return null;
    const payload = {
      household_id: household.id,
      user_id: userRes.user.id,
      recipient: current.recipient || "",
      title: current.title || null,
      body: current.body || null,
      attachment_path: current.attachment_path ?? null,
      attachment_name: current.attachment_name ?? null,
      shared_with_trust_vault: !!current.shared_with_trust_vault,
    };
    let saved: LegacyLetter | null = null;
    if (current.id) {
      const { data } = await supabase.from("legacy_letters").update(payload).eq("id", current.id).select().maybeSingle();
      saved = (data as LegacyLetter) || null;
    } else {
      const { data } = await supabase.from("legacy_letters").insert(payload).select().maybeSingle();
      saved = (data as LegacyLetter) || null;
    }
    if (saved) setCurrent(saved);
    toast.success("Saved");
    load();
    return saved;
  };

  const del = async (id: string) => {
    const letter = letters.find((l) => l.id === id);
    if (letter?.attachment_path) {
      await supabase.storage.from("legacy-letters").remove([letter.attachment_path]);
    }
    await supabase.from("legacy_letters").delete().eq("id", id);
    if (current?.id === id) setCurrent(null);
    load();
  };

  const handleFileUpload = async (file: File) => {
    if (!household?.id) { toast.error("No household loaded"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File must be under 20MB"); return; }
    setUploading(true);
    try {
      // If plain text/markdown, read into body directly
      const isText = /\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/");
      if (isText) {
        const text = await file.text();
        setCurrent((c) => ({
          ...(c || {}),
          body: text,
          title: c?.title || file.name.replace(/\.(txt|md)$/i, ""),
        }));
        toast.success("Letter loaded into editor");
        return;
      }
      // Otherwise upload as attachment
      const ext = file.name.split(".").pop() || "bin";
      const path = `${household.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("legacy-letters")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      setCurrent((c) => ({
        ...(c || {}),
        attachment_path: path,
        attachment_name: file.name,
        title: c?.title || file.name.replace(/\.[^.]+$/, ""),
      }));
      toast.success("File uploaded — click Save to keep it");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openAttachment = async () => {
    if (!current?.attachment_path) return;
    const { data, error } = await supabase.storage
      .from("legacy-letters")
      .createSignedUrl(current.attachment_path, 60 * 10);
    if (error || !data?.signedUrl) return toast.error("Could not open file");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const removeAttachment = async () => {
    if (!current?.attachment_path) return;
    await supabase.storage.from("legacy-letters").remove([current.attachment_path]);
    setCurrent({ ...current, attachment_path: null, attachment_name: null });
    toast.success("Attachment removed — click Save");
  };

  const tpl = LEGACY_LETTER_TEMPLATES.find((t) => t.title === current?.title);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.pdf,.doc,.docx,.rtf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
      />
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Your Letters</CardTitle>
          <CardDescription>Personal letters alongside legal documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select onValueChange={startNew}>
            <SelectTrigger><SelectValue placeholder="Start from template…" /></SelectTrigger>
            <SelectContent>
              {LEGACY_LETTER_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="w-full" onClick={() => startNew()}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Blank letter
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              if (!current) startNew();
              // defer to allow render, then open picker
              setTimeout(() => fileRef.current?.click(), 0);
            }}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploading ? "Uploading…" : "Upload letter file"}
          </Button>
          <p className="text-[11px] text-muted-foreground leading-snug">
            .txt/.md loads into the editor. PDF/DOC/image saves as an attachment.
          </p>
          <div className="space-y-1 pt-2">
            {letters.map((l) => (
              <button key={l.id} onClick={() => setCurrent(l)} className="w-full text-left p-2 rounded border border-border/40 hover:bg-muted/40 text-sm">
                <div className="font-medium truncate flex items-center gap-1.5">
                  {l.attachment_path && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
                  {l.shared_with_trust_vault && <ShieldCheck className="h-3 w-3 text-prism-teal shrink-0" />}
                  <span className="truncate">{l.title || l.recipient}</span>
                </div>
                <div className="text-xs text-muted-foreground">{l.recipient}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> {current ? "Editing" : "Select or start a letter"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {current && (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Recipient</Label>
                  <Input value={current.recipient || ""} onChange={(e) => setCurrent({ ...current, recipient: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={current.title || ""} onChange={(e) => setCurrent({ ...current, title: e.target.value })} />
                </div>
              </div>

              {tpl && (
                <div className="p-3 rounded-lg bg-muted/30 text-xs space-y-1">
                  <div className="font-semibold">Reflection prompts:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {tpl.prompts.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {/* Upload row */}
              <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-dashed border-border/60 bg-muted/20">
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploading ? "Uploading…" : "Upload letter file"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  .txt/.md → loads into editor. PDF/DOC/image → stored as an attachment.
                </p>
              </div>

              {current.attachment_path && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border/60 bg-background/60 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{current.attachment_name || "attachment"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={openAttachment}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Open
                    </Button>
                    <Button size="sm" variant="ghost" onClick={removeAttachment}>
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}

              <Textarea
                rows={14}
                value={current.body || ""}
                onChange={(e) => setCurrent({ ...current, body: e.target.value })}
                placeholder="Write your letter here, or upload a file above…"
              />

              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-prism-teal/5 border border-prism-teal/20">
                <div className="flex items-start gap-2 min-w-0">
                  <ShieldCheck className="h-4 w-4 text-prism-teal shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Save to Montgomery Family Trust Vault</p>
                    <p className="text-xs text-muted-foreground">
                      Marks this letter (and any attachment) as part of the family trust archive so it appears in the Trust Vault view for household members.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!current.shared_with_trust_vault}
                  onCheckedChange={(v) => setCurrent({ ...current, shared_with_trust_vault: v })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={save}><Save className="h-3.5 w-3.5 mr-1.5" /> Save</Button>
                {current.id && (
                  <Button variant="destructive" onClick={() => del(current.id!)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
