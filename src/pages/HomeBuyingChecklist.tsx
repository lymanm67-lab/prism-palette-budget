import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Home, Clock, MapPin, Users, Briefcase, Shield, DollarSign,
  TrendingUp, CreditCard, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Sparkles, Loader2, Save, AlertTriangle
} from 'lucide-react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CHECKLIST_ITEMS = [
  {
    number: 1,
    title: 'Time Horizon',
    question: 'How long is my time horizon?',
    icon: Clock,
    gradient: 'from-prism-teal to-prism-sky',
    guidance: 'Home prices can recover more slowly than the stock market. Plan to be in your home at least 5-7 years to build equity and offset buying/selling costs.',
    tips: [
      'Consider your career trajectory and likelihood of relocating',
      'Research historical appreciation rates in your target area',
      'Factor in closing costs (typically 2-5% of purchase price)',
    ],
  },
  {
    number: 2,
    title: 'Location Appeal',
    question: "What's the \"sizzle\" of location?",
    icon: MapPin,
    gradient: 'from-prism-sky to-prism-indigo',
    guidance: 'Research how quickly homes sell in your area, school ratings, local employment opportunities, and neighborhood trends to gauge market temperature.',
    tips: [
      'Check average days on market for listings in target neighborhoods',
      'Review school ratings even if you don\'t have kids (affects resale value)',
      'Look at planned infrastructure or commercial developments nearby',
    ],
  },
  {
    number: 3,
    title: 'Family Planning',
    question: 'What is my family situation?',
    icon: Users,
    gradient: 'from-prism-indigo to-prism-violet',
    guidance: 'Anticipate what your family will look like in the coming years. Consider the number of bedrooms, yard space, proximity to schools, and room to grow.',
    tips: [
      'Plan for at least 5-7 years of family changes',
      'Consider guest rooms, home office needs, and storage',
      'Think about aging parents who might need nearby or in-home space',
    ],
  },
  {
    number: 4,
    title: 'Job Security',
    question: 'Do I have good job security?',
    icon: Briefcase,
    gradient: 'from-prism-amber to-prism-orange',
    guidance: 'Where you buy is often tied to where you work. If you\'re unsure about staying in the area or your industry is volatile, renting may offer more flexibility.',
    tips: [
      'Evaluate your industry stability and company outlook',
      'Consider remote work flexibility that could change your options',
      'Have a backup plan if your employment situation changes',
    ],
  },
  {
    number: 5,
    title: 'Emergency Reserves',
    question: 'How big is my emergency fund?',
    icon: Shield,
    gradient: 'from-prism-lime to-prism-teal',
    guidance: 'As a homeowner, you\'re responsible for all maintenance and repairs. Your emergency fund may need to grow beyond the standard 3-6 months to cover unexpected home costs.',
    tips: [
      'Budget 1-3% of your home\'s value annually for maintenance',
      'Keep a separate "home repair" fund beyond your regular emergency fund',
      'Get a home inspection to understand potential upcoming repairs',
    ],
  },
  {
    number: 6,
    title: 'Down Payment',
    question: 'Do I have an adequate down payment?',
    icon: DollarSign,
    gradient: 'from-prism-orange to-prism-rose',
    guidance: 'First-time buyers can put down as little as 3-5%. If it\'s not your first home, aim for at least 20% to avoid Private Mortgage Insurance (PMI).',
    tips: [
      'Research first-time buyer programs in your state',
      'Calculate how PMI affects your monthly payment if under 20%',
      'Don\'t drain your emergency fund for the down payment',
    ],
  },
  {
    number: 7,
    title: 'Stable Cash Flow',
    question: 'Do I have stable cash flow?',
    icon: TrendingUp,
    gradient: 'from-prism-teal to-prism-lime',
    guidance: 'You need stable income to cover not just your mortgage, but all housing costs — taxes, insurance, maintenance, and utilities. Keep total housing expenses below 25% of gross income.',
    tips: [
      'Calculate total housing cost: mortgage + taxes + insurance + HOA + maintenance',
      'Use the 25% of gross income rule as your ceiling',
      'Ensure you still have margin for savings and lifestyle expenses',
    ],
  },
  {
    number: 8,
    title: 'Credit Score',
    question: 'What is my credit score?',
    icon: CreditCard,
    gradient: 'from-prism-indigo to-prism-navy',
    guidance: 'A great credit score is vital to getting the best mortgage rates. Even a small rate difference can save tens of thousands over the life of your loan.',
    tips: [
      'Check your score through free services (Credit Karma, etc.)',
      'Aim for 740+ for the best conventional loan rates',
      'Avoid opening new credit accounts 6-12 months before applying',
    ],
  },
];

const HomeBuyingChecklist = () => {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  const { data: progress, isLoading } = useQuery({
    queryKey: ['homebuyer_checklist', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homebuyer_checklist')
        .select('*')
        .eq('household_id', household!.id);
      if (error) throw error;
      return data;
    },
  });

  const getItemProgress = (num: number) => progress?.find(p => p.question_number === num);

  const toggleItem = useMutation({
    mutationFn: async ({ num, checked }: { num: number; checked: boolean }) => {
      const existing = getItemProgress(num);
      if (existing) {
        const { error } = await supabase
          .from('homebuyer_checklist')
          .update({ is_checked: checked })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('homebuyer_checklist')
          .insert({ household_id: household!.id, question_number: num, is_checked: checked });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homebuyer_checklist'] }),
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });

  const saveNotes = useMutation({
    mutationFn: async ({ num, notes }: { num: number; notes: string }) => {
      const existing = getItemProgress(num);
      if (existing) {
        const { error } = await supabase
          .from('homebuyer_checklist')
          .update({ notes })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('homebuyer_checklist')
          .insert({ household_id: household!.id, question_number: num, notes });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homebuyer_checklist'] });
      toast.success('Notes saved!');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });

  const checkedCount = progress?.filter(p => p.is_checked).length || 0;
  const overallProgress = (checkedCount / CHECKLIST_ITEMS.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Home-Buying Readiness</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Answer these 8 critical questions before you buy a home.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm gap-1.5 px-3 py-1.5 self-start sm:self-auto">
          <Home className="h-3.5 w-3.5 text-prism-teal" />
          {checkedCount}/{CHECKLIST_ITEMS.length} Answered
        </Badge>
      </div>

      {/* Progress */}
      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Readiness Score</p>
            <p className="font-display text-lg font-bold prism-gradient-text">{Math.round(overallProgress)}%</p>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-prism-navy via-prism-teal to-prism-lime"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {overallProgress === 100 && (
            <p className="text-xs text-prism-teal mt-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> You've considered all the key factors — you may be ready!
            </p>
          )}
          {overallProgress > 0 && overallProgress < 100 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-prism-amber" /> Keep going — make sure you can confidently answer each question.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checklist items */}
      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => {
          const itemProgress = getItemProgress(item.number);
          const isChecked = itemProgress?.is_checked || false;
          const isExpanded = expandedItem === item.number;
          const ItemIcon = item.icon;

          return (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: item.number * 0.04 }}
            >
              <Card className={`prism-card-shine border-border/50 transition-all ${isChecked ? 'ring-1 ring-prism-teal/30 bg-prism-teal/[0.02]' : ''}`}>
                <CardContent className="p-0">
                  {/* Item header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl"
                    onClick={() => setExpandedItem(isExpanded ? null : item.number)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItem.mutate({ num: item.number, checked: !isChecked });
                      }}
                      className="shrink-0"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="h-7 w-7 text-prism-teal" />
                      ) : (
                        <Circle className="h-7 w-7 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />
                      )}
                    </button>

                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}>
                      <ItemIcon className="h-5 w-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground">Q{item.number}</span>
                      <h3 className={`font-display font-bold text-base ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{item.question}</p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-4">
                          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                            {item.guidance}
                          </p>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Things to Consider</p>
                            <ul className="space-y-2">
                              {item.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-prism-teal/50 shrink-0 mt-0.5" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Notes</p>
                            <Textarea
                              value={editingNotes[item.number] ?? itemProgress?.notes ?? ''}
                              onChange={(e) => setEditingNotes(prev => ({ ...prev, [item.number]: e.target.value }))}
                              placeholder="Your answer or thoughts on this question..."
                              className="min-h-[80px] text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => saveNotes.mutate({ num: item.number, notes: editingNotes[item.number] ?? itemProgress?.notes ?? '' })}
                            >
                              <Save className="h-3.5 w-3.5" /> Save Notes
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default HomeBuyingChecklist;
