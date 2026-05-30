import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Brain, CheckCircle2, Calendar, Users } from 'lucide-react';
import { nextReviewDate, reviewChecklist, coachExplain, permissionLabel, type ReviewCadence, type SharePermission } from '@/lib/investment/behavior';

export function BehaviorAccountability() {
  const [cadence, setCadence] = useState<ReviewCadence>('quarterly');
  const next = useMemo(() => nextReviewDate(new Date(), cadence), [cadence]);
  const checklist = reviewChecklist();

  const [topic, setTopic] = useState<'contribution' | 'roth' | 'glide_path' | 'ss_delay' | 'monte_carlo' | 'rmd' | 'swr'>('contribution');
  const explanation = coachExplain(topic);

  const [perm, setPerm] = useState<SharePermission>('view');

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Behavior & Accountability</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="reviews">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="reviews">Plan reviews</TabsTrigger>
            <TabsTrigger value="coach">Coach mode</TabsTrigger>
            <TabsTrigger value="share">Spouse access</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Label>Review cadence</Label>
              <Select value={cadence} onValueChange={(v) => setCadence(v as ReviewCadence)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="biannual">Every 6 months</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline">Next: {next.toLocaleDateString()}</Badge>
            </div>
            <div className="rounded-lg border p-4">
              <div className="font-semibold mb-2">Review checklist</div>
              <ul className="space-y-2">
                {checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="coach" className="space-y-4 mt-4">
            <div>
              <Label>Explain a topic</Label>
              <Select value={topic} onValueChange={(v) => setTopic(v as typeof topic)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">Contribution sizing</SelectItem>
                  <SelectItem value="roth">Roth vs Traditional</SelectItem>
                  <SelectItem value="glide_path">Glide path / allocation</SelectItem>
                  <SelectItem value="ss_delay">Delaying Social Security</SelectItem>
                  <SelectItem value="monte_carlo">Monte Carlo simulation</SelectItem>
                  <SelectItem value="rmd">RMDs</SelectItem>
                  <SelectItem value="swr">Safe Withdrawal Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
              <div className="font-semibold">{explanation.title}</div>
              <p className="text-sm">{explanation.plain}</p>
              <p className="text-sm text-muted-foreground"><strong>Why it matters:</strong> {explanation.why}</p>
            </div>
          </TabsContent>

          <TabsContent value="share" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Choose how much access your spouse or partner has to this plan.</p>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Label>Permission level</Label>
              <Select value={perm} onValueChange={(v) => setPerm(v as SharePermission)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">{permissionLabel('view')}</SelectItem>
                  <SelectItem value="comment">{permissionLabel('comment')}</SelectItem>
                  <SelectItem value="edit">{permissionLabel('edit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" disabled>Send invite (coming soon)</Button>
            <p className="text-xs text-muted-foreground">Sharing requires household member setup in account settings.</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
