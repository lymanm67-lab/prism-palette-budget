import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTTS } from '@/hooks/use-tts';
import { Volume2, Pause, Play, Square, Eye, EyeOff, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DemoDataItem {
  label: string;
  value: string;
  badge?: string;
  color?: string;
}

export interface PageOverviewProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor?: string;
  ttsScript: string;
  features: string[];
  demoData?: DemoDataItem[];
  demoTableHeaders?: string[];
  demoTableRows?: string[][];
  children?: React.ReactNode;
}

const PageOverview = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  ttsScript,
  features,
  demoData,
  demoTableHeaders,
  demoTableRows,
  children,
}: PageOverviewProps) => {
  const [showOverview, setShowOverview] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const tts = useTTS();

  const handleTTSToggle = () => {
    if (tts.isSpeaking && !tts.isPaused) {
      tts.pause();
    } else if (tts.isPaused) {
      tts.resume();
    } else {
      tts.speak(ttsScript);
    }
  };

  const ttsLabel = tts.isSpeaking && !tts.isPaused ? 'Pause' : tts.isPaused ? 'Resume' : 'Listen';
  const TtsIcon = tts.isSpeaking && !tts.isPaused ? Pause : tts.isPaused ? Play : Volume2;
  const demoLabel = showDemo ? 'Hide Demo' : 'Demo Data';
  const DemoIcon = showDemo ? EyeOff : Eye;

  return (
    <div>
      {/* Compact trigger bar */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Page Guide */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showOverview ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5 lg:flex"
                onClick={() => setShowOverview(!showOverview)}
              >
                <BookOpen className="h-4 w-4 text-sky-500 lg:h-3.5 lg:w-3.5" />
                <span className="hidden lg:inline">{showOverview ? 'Hide Guide' : 'Page Guide'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="lg:hidden">
              <p>{showOverview ? 'Hide Guide' : 'Page Guide'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Listen / Pause / Resume */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tts.isSpeaking ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={handleTTSToggle}
              >
                <TtsIcon className="h-4 w-4 text-violet-500 lg:h-3.5 lg:w-3.5" />
                <span className="hidden lg:inline">{ttsLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="lg:hidden">
              <p>{ttsLabel}</p>
            </TooltipContent>
          </Tooltip>

          {tts.isSpeaking && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={tts.stop} className="h-8 w-8 p-0">
                  <Square className="h-4 w-4 text-rose-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Stop</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Demo Data */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showDemo ? 'secondary' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={() => { setShowDemo(!showDemo); if (!showOverview && !showDemo) setShowOverview(true); }}
              >
                <DemoIcon className="h-4 w-4 text-amber-500 lg:h-3.5 lg:w-3.5" />
                <span className="hidden lg:inline">{demoLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="lg:hidden">
              <p>{demoLabel}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Expandable overview panel */}
      <AnimatePresence>
        {showOverview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="mt-3 border-primary/20 bg-primary/5">
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Icon className={cn('h-5 w-5', iconColor)} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>

                {/* Features list */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Key Features</h4>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Sparkles className="h-3.5 w-3.5 text-prism-amber shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Demo Data Section */}
                <AnimatePresence>
                  {showDemo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Separator className="my-2" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Demo Data Preview
                      </h4>

                      {/* Card-style demo data */}
                      {demoData && demoData.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {demoData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg border bg-background p-3">
                              <div className="flex items-center gap-2">
                                {item.color && (
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                )}
                                <span className="text-sm font-medium">{item.label}</span>
                                {item.badge && <Badge variant="secondary" className="text-[10px]">{item.badge}</Badge>}
                              </div>
                              <span className="text-sm text-muted-foreground font-mono">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Table-style demo data */}
                      {demoTableHeaders && demoTableRows && (
                        <div className="rounded-lg border bg-background overflow-hidden">
                          <div className="grid gap-px bg-border" style={{ gridTemplateColumns: `repeat(${demoTableHeaders.length}, 1fr)` }}>
                            {demoTableHeaders.map((h, i) => (
                              <div key={i} className="bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</div>
                            ))}
                            {demoTableRows.map((row, ri) =>
                              row.map((cell, ci) => (
                                <div key={`${ri}-${ci}`} className="bg-background px-3 py-2 text-sm">{cell}</div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Custom demo children */}
                      {children}

                      <p className="text-xs text-muted-foreground italic mt-2">
                        This is example data for demonstration purposes only.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageOverview;
