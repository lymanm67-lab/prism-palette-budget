import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/contexts/HouseholdContext";
import { generateAgenda } from "@/lib/legacy/annualMeeting";

export function AnnualMeetingPlanner() {
  const { household } = useHousehold();
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [id, setId] = useState<string | null>(null);

  useEffect(() => { if (household?.id) load(); }, [household?.id]);

  const load = async () => {
    const { data } = await supabase
      .from("annual_family_meetings")
      .select("*")
      .eq("household_id", household!.id)
      .order("meeting_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setId(data.id);
      setMeetingDate(data.meeting_date);
      setAgenda(data.agenda_md || "");
      setNotes(data.notes_md || "");
    }
  };

  const draftAgenda = () => {
    const md = generateAgenda({
      legacyWorthScore: 72,
      yearOverYearDelta: 8.4,
      majorWealthEvents: ["Refinanced mortgage", "Funded 529 for grandchild", "Rebalanced trust"],
      activeGoals: ["Reach $1M net worth", "Complete family constitution", "Fund trust to $250k"],
    });
    setAgenda(md);
    toast.success("Agenda drafted");
  };

  const save = async () => {
    if (!household?.id) return;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const payload = {
      household_id: household.id, user_id: userRes.user.id,
      meeting_date: meetingDate, agenda_md: agenda, notes_md: notes,
    };
    if (id) await supabase.from("annual_family_meetings").update(payload).eq("id", id);
    else {
      const { data } = await supabase.from("annual_family_meetings").insert(payload).select().maybeSingle();
      if (data) setId(data.id);
    }
    toast.success("Meeting saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Family Wealth Meeting</CardTitle>
        <CardDescription>One meeting per year to review Legacy Worth, teach the next generation, and align on family values.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Meeting Date</Label>
            <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={draftAgenda}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Draft agenda
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold">Agenda</Label>
          <Textarea rows={14} value={agenda} onChange={(e) => setAgenda(e.target.value)} className="font-mono text-xs" />
        </div>
        <div>
          <Label className="text-sm font-semibold">Meeting Notes / Decisions</Label>
          <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={save}><Save className="h-3.5 w-3.5 mr-1.5" /> Save meeting</Button>
      </CardContent>
    </Card>
  );
}
