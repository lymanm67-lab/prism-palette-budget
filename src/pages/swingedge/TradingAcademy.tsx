import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Pause,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import { useTTS } from '@/hooks/use-tts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useAcademyProgress } from '@/hooks/use-swingedge-lists';
import { lessonsByModule, type Lesson } from '@/lib/swingedge/lessons';

function LessonCard({
  lesson,
  completed,
  onComplete,
  saving,
}: {
  lesson: Lesson;
  completed: boolean;
  onComplete: (quizScore: number) => void;
  saving: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === lesson.quiz.answerIndex;

  return (
    <div className="space-y-4 rounded-lg border bg-card/50 p-4">
      <div className="space-y-3 text-sm">
        {lesson.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-semibold text-muted-foreground">{lesson.example.title}</p>
        <ul className="mt-1 space-y-1 text-sm">
          {lesson.example.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground">Worth remembering</p>
        <ul className="mt-1 space-y-1 text-sm">
          {lesson.keyPoints.map((k) => (
            <li key={k} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-prism-lime" />
              <span>{k}</span>
            </li>
          ))}
        </ul>
      </div>

      <Alert className="border-prism-amber/40">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>What this idea ignores</AlertTitle>
        <AlertDescription>{lesson.blindSpot}</AlertDescription>
      </Alert>

      <div className="rounded-lg border p-3">
        <p className="text-sm font-semibold">{lesson.quiz.question}</p>
        <div className="mt-2 space-y-2">
          {lesson.quiz.options.map((opt, i) => (
            <Button
              key={opt}
              variant={picked === i ? (i === lesson.quiz.answerIndex ? 'default' : 'destructive') : 'outline'}
              className="h-auto w-full justify-start whitespace-normal py-2 text-left"
              onClick={() => setPicked(i)}
            >
              {opt}
            </Button>
          ))}
        </div>
        {answered ? (
          <p className={cn('mt-2 text-sm', correct ? 'text-prism-lime' : 'text-prism-amber')}>
            {correct ? 'Correct. ' : 'Not quite. '}
            {lesson.quiz.why}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => onComplete(correct ? 100 : 0)}
          disabled={saving || !answered}
          variant={completed ? 'outline' : 'default'}
        >
          {completed ? 'Mark as unread' : 'Mark lesson complete'}
        </Button>
        <Button asChild variant="ghost">
          <Link to={lesson.appliesTo.to}>
            See it on {lesson.appliesTo.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function TradingAcademy() {
  useTradingTitle('Trading Academy');
  const { settings } = useTradingSettings();
  const { completedKeys, completedCount, totalLessons, percent, isLoading, setLesson, isSaving } =
    useAcademyProgress();

  const modules = useMemo(() => lessonsByModule(), []);

  const handleToggle = async (lesson: Lesson, quizScore: number) => {
    const nowComplete = !completedKeys.has(lesson.key);
    try {
      await setLesson({ lessonKey: lesson.key, completed: nowComplete, quizScore });
      toast.success(nowComplete ? 'Lesson marked complete' : 'Lesson reopened');
    } catch {
      toast.error('Could not save your progress');
    }
  };

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Trading Academy"
        subtitle="The reasoning behind every score, verdict and risk number in SwingEdge."
        mode={settings.data_mode}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your progress</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading your progress…'
              : `${completedCount} of ${totalLessons} lessons complete.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={percent} className="h-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            Work through Foundations and Risk and sizing before you place a paper trade. Those two modules
            carry most of the weight.
          </p>
        </CardContent>
      </Card>

      {modules.map((m) => (
        <Card key={m.module}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{m.module}</CardTitle>
            <CardDescription>
              {m.lessons.filter((l) => completedKeys.has(l.key)).length} of {m.lessons.length} complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {m.lessons.map((lesson) => {
                const done = completedKeys.has(lesson.key);
                return (
                  <AccordionItem key={lesson.key} value={lesson.key}>
                    <AccordionTrigger className="text-left">
                      <span className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-prism-lime" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-medium">{lesson.title}</span>
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Clock className="h-3 w-3" />
                          {lesson.minutes} min
                        </Badge>
                        <span className="hidden text-xs text-muted-foreground md:inline">
                          {lesson.summary}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <LessonCard
                        lesson={lesson}
                        completed={done}
                        saving={isSaving}
                        onComplete={(score) => handleToggle(lesson, score)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      <HowToUse
        steps={[
          'Start with Foundations, then Risk and sizing. Those two decide whether the rest helps you.',
          'Read the lesson, then the worked example, then the "what this idea ignores" note.',
          'Answer the one-question check, then mark the lesson complete.',
          'Use the link at the bottom of each lesson to see the idea on the real screen.',
          'Come back after your first ten paper trades. The same lessons read differently once you have context.',
        ]}
        tips={[
          'This is education, not advice. Nothing here is a recommendation to buy or sell.',
          'Your progress is saved to your account.',
        ]}
      />
    </div>
  );
}
