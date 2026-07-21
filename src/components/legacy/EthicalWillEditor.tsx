import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/contexts/HouseholdContext";
import { ETHICAL_WILL_SECTIONS, type EthicalWillDraft } from "@/lib/legacy/ethicalWill";

export function EthicalWillEditor() {
  const { household } = useHousehold();
  const [draft, setDraft] = useState<EthicalWillDraft>({ values: "", wisdom: "", lessons: "", blessings: "" });
  const [id, setId] = useState<string | null>(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ethical Will</CardTitle>
        <CardDescription>A non-legal companion to your legal will — your values, wisdom, and blessings for future generations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ETHICAL_WILL_SECTIONS.map((s) => (
          <div key={s.key}>
            <Label className="text-sm font-semibold">{s.label}</Label>
            <p className="text-xs text-muted-foreground mb-1">{s.prompt}</p>
            <p className="text-xs text-muted-foreground italic mb-2">e.g. {s.examples.join(" · ")}</p>
            <Textarea rows={5} value={draft[s.key]} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} />
          </div>
        ))}
        <Button onClick={save}><Save className="h-3.5 w-3.5 mr-1.5" /> Save</Button>
      </CardContent>
    </Card>
  );
}
