import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/contexts/HouseholdContext";
import { LEGACY_LETTER_TEMPLATES } from "@/lib/legacy/legacyLetter";

interface LegacyLetter {
  id: string;
  recipient: string;
  title: string | null;
  body: string | null;
  updated_at: string;
}

export function LegacyLetterEditor() {
  const { household } = useHousehold();
  const [letters, setLetters] = useState<LegacyLetter[]>([]);
  const [current, setCurrent] = useState<Partial<LegacyLetter> | null>(null);

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
    setCurrent({ recipient: tpl?.recipient || "", title: tpl?.title || "", body: tpl?.starter || "" });
  };

  const save = async () => {
    if (!current || !household?.id) return;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const payload = {
      household_id: household.id,
      user_id: userRes.user.id,
      recipient: current.recipient || "",
      title: current.title || null,
      body: current.body || null,
    };
    if (current.id) {
      await supabase.from("legacy_letters").update(payload).eq("id", current.id);
    } else {
      const { data } = await supabase.from("legacy_letters").insert(payload).select().maybeSingle();
      if (data) setCurrent(data as LegacyLetter);
    }
    toast.success("Saved");
    load();
  };

  const del = async (id: string) => {
    await supabase.from("legacy_letters").delete().eq("id", id);
    if (current?.id === id) setCurrent(null);
    load();
  };

  const tpl = LEGACY_LETTER_TEMPLATES.find((t) => t.title === current?.title);

  return (
    <div className="grid md:grid-cols-3 gap-4">
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
          <div className="space-y-1 pt-2">
            {letters.map((l) => (
              <button key={l.id} onClick={() => setCurrent(l)} className="w-full text-left p-2 rounded border border-border/40 hover:bg-muted/40 text-sm">
                <div className="font-medium truncate">{l.title || l.recipient}</div>
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
              <Textarea rows={16} value={current.body || ""} onChange={(e) => setCurrent({ ...current, body: e.target.value })} />
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
