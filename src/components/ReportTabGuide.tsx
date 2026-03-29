import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/hooks/use-tts';
import { Volume2, Pause, Play, Square, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface DataEntryLink {
  label: string;
  path: string;
  description: string;
}

interface ReportTabGuideProps {
  title: string;
  howToUse: string[];
  howToEnterData: string[];
  ttsScript: string;
  icon: React.ElementType;
  iconColor?: string;
  dataEntryLinks: DataEntryLink[];
}

export default function ReportTabGuide({
  title,
  howToUse,
  howToEnterData,
  ttsScript,
  icon: Icon,
  iconColor = 'text-primary',
  dataEntryLinks,
}: ReportTabGuideProps) {
  const { speak, pause, resume, stop, isSpeaking, isPaused } = useTTS();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2 mb-4">
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
        <div className="space-y-3 pt-1">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Reading This Report</h4>
            <ul className="space-y-1 pl-5 text-xs text-muted-foreground">
              {howToUse.map((step, i) => (
                <li key={i} className="list-disc">{step}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">How to Enter Data</h4>
            <ul className="space-y-1 pl-5 text-xs text-muted-foreground">
              {howToEnterData.map((step, i) => (
                <li key={i} className="list-disc">{step}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {dataEntryLinks.map((link) => (
              <Button
                key={link.path}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => navigate(link.path)}
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
                <span className="hidden sm:inline text-muted-foreground">— {link.description}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
