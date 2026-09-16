import { useMemo, useState } from 'react';
import { BookMarked, ClipboardList, GraduationCap, LifeBuoy, NotebookPen, Rocket, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HowToUse from '@/components/swingedge/HowToUse';
import ExecutionGuideDialog from '@/components/swingedge/ExecutionGuideDialog';
import {
  COURSE_HANDOUTS,
  GUIDE_KIND_LABEL,
  QUICK_START_GUIDES,
  SAMPLE_NOTICE,
  TROUBLESHOOTING_GUIDES,
  guideByKey,
  libraryGuides,
  type ExecutionGuide,
} from '@/lib/swingedge/thinkorswimGuide';
import { useExecutionGuides } from '@/hooks/use-execution-guides';

/**
 * Guide library: the sheets you have saved, the ready-made sample trade guides,
 * quick starts, troubleshooting one-pagers, and the course handouts.
 */
export default function ExecutionGuides() {
  const [active, setActive] = useState<ExecutionGuide | null>(null);
  const { journalGuides, binderGuides, isLoading, remove } = useExecutionGuides();

  const sampleGuides = useMemo(
    () => libraryGuides().filter((g) => g.key.startsWith('sample-')),
    [],
  );

  const openKey = (key: string) => {
    const guide = guideByKey(key);
    if (guide) setActive(guide);
  };

  const savedList = (list: typeof journalGuides, emptyText: string) =>
    list.length === 0 ? (
      <p className="text-sm text-muted-foreground">{emptyText}</p>
    ) : (
      <div className="space-y-2">
        {list.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">
                {GUIDE_KIND_LABEL[row.guide_kind] ?? row.guide_kind} · guide v{row.guide_version} ·{' '}
                {new Date(row.created_at).toLocaleDateString()}
                {row.symbol ? ` · ${row.symbol}` : ''}
                {row.printed_at ? ' · printed' : ''}
                {row.downloaded_at ? ' · downloaded' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openKey(row.guide_key)}>
                Reopen
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(row.id)} aria-label="Remove saved guide">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );

  const guideCards = (guides: ExecutionGuide[]) => (
    <div className="grid gap-3 md:grid-cols-2">
      {guides.map((g) => (
        <div key={g.key} className="rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{g.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{g.subtitle}</p>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px]">
              {g.steps.length} steps
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setActive(g)}>
              Open
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ClipboardList className="h-6 w-6 text-prism-teal" /> Thinkorswim execution guides
        </h1>
        <p className="text-sm text-muted-foreground">
          SwingEdge decides the trade. These sheets show exactly what to type in Thinkorswim paperMoney — and what a
          mistake looks like. Print them, save them to your journal, or keep them in your training binder.
        </p>
      </header>

      <HowToUse
        id="how-to-execution-guides"
        steps={[
          'Approve a trade in the Trade Planner, then use "View step by step Thinkorswim guide" there — the guide fills in your own symbol, shares and prices.',
          'With no approved trade, open a sample guide below to practise the order steps safely.',
          'Walk the steps on screen, or print the sheet and keep it beside the platform.',
          'Save the guide you used to your journal so the trade record shows how it was executed.',
          'When something looks wrong in Thinkorswim, open the matching troubleshooting sheet instead of guessing.',
        ]}
        tips={[
          'paperMoney buying power is not your risk budget — only the SwingEdge approved share count is allowed.',
          'Working is not filled. Always check Monitor before assuming you own the shares.',
        ]}
      />

      <Tabs defaultValue="mine">
        <TabsList className="flex-wrap">
          <TabsTrigger value="mine" className="gap-1.5">
            <NotebookPen className="h-4 w-4" /> My guides
          </TabsTrigger>
          <TabsTrigger value="binder" className="gap-1.5">
            <BookMarked className="h-4 w-4" /> Training binder
          </TabsTrigger>
          <TabsTrigger value="samples" className="gap-1.5">
            <Rocket className="h-4 w-4" /> Sample trade guides
          </TabsTrigger>
          <TabsTrigger value="quick" className="gap-1.5">
            <Rocket className="h-4 w-4" /> Quick start
          </TabsTrigger>
          <TabsTrigger value="trouble" className="gap-1.5">
            <LifeBuoy className="h-4 w-4" /> Troubleshooting
          </TabsTrigger>
          <TabsTrigger value="course" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> Training handouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guides saved to your journal</CardTitle>
              <CardDescription>Every sheet you saved, printed or downloaded for a trade.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading your guides…</p>
              ) : (
                savedList(journalGuides, 'No guides saved to your journal yet.')
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="binder" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Training binder</CardTitle>
              <CardDescription>Reference sheets you keep for practice, not tied to one trade.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading your binder…</p>
              ) : (
                savedList(binderGuides, 'Nothing in your training binder yet.')
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="samples" className="space-y-3 pt-4">
          <p className="rounded-md border border-prism-amber/50 bg-prism-amber/10 p-2 text-xs">{SAMPLE_NOTICE}</p>
          {guideCards(sampleGuides)}
        </TabsContent>

        <TabsContent value="quick" className="pt-4">
          {guideCards(QUICK_START_GUIDES)}
        </TabsContent>

        <TabsContent value="trouble" className="pt-4">
          {guideCards(TROUBLESHOOTING_GUIDES)}
        </TabsContent>

        <TabsContent value="course" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {COURSE_HANDOUTS.map((h) => (
              <div key={`${h.week}-${h.guideKey}`} className="rounded-lg border border-border p-3">
                <Badge variant="outline" className="mb-1 text-[10px]">
                  Week {h.week}
                </Badge>
                <p className="text-sm font-semibold">{h.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{h.description}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => openKey(h.guideKey)}>
                  Open handout
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ExecutionGuideDialog
        guide={active}
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        notice={active?.trade ? SAMPLE_NOTICE : null}
      />
    </div>
  );
}
