import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/hooks/use-tts';
import { Volume2, Pause, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorGuideProps {
  title: string;
  instructions: string[];
  ttsScript: string;
  icon: React.ElementType;
  iconColor?: string;
}

export default function CalculatorGuide({ title, instructions, ttsScript, icon: Icon, iconColor = 'text-primary' }: CalculatorGuideProps) {
  const { speak, pause, resume, stop, isSpeaking, isPaused } = useTTS();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <Icon className={cn('h-4 w-4', iconColor)} />
          <span>How to use: {title}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        <div className="flex items-center gap-1">
          {!isSpeaking && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => speak(ttsScript)} title="Listen">
              <Volume2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {isSpeaking && !isPaused && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={pause} title="Pause">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {isSpeaking && isPaused && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resume} title="Resume">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {isSpeaking && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={stop} title="Stop">
              <Square className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {expanded && (
        <ul className="space-y-1 pl-6 text-xs text-muted-foreground">
          {instructions.map((step, i) => (
            <li key={i} className="list-disc">{step}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
