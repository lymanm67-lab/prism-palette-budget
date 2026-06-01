import type { ComponentType } from 'react';
import { Step01 } from './Step01';
import { Step02 } from './Step02';
import { Step03 } from './Step03';
import { Step04 } from './Step04';
import { Step05 } from './Step05';
import { Step06 } from './Step06';
import { Step07 } from './Step07';
import { Step08 } from './Step08';

export interface StepProps {
  value: any;
  onChange: (next: any) => void;
  allAnswers: Record<string, any>;
}

export interface StepDef {
  n: number;
  title: string;
  why: string;
  Component: ComponentType<StepProps>;
  shouldSkip?: (answers: Record<string, any>) => boolean;
  isValid?: (value: any) => boolean;
}

export const STEPS: StepDef[] = [
  {
    n: 1,
    title: 'Connect your money',
    why: 'The more Coach knows up front, the sharper your plan. Add any of these — or skip and come back.',
    Component: Step01,
    // Auto-skip when paycheck, bills, and debts are already present.
    shouldSkip: (answers) => {
      const a = answers?.['1'];
      return !!(a && a.paycheck && a.bills && a.debts);
    },
  },
  {
    n: 2,
    title: 'Last month check-in',
    why: 'Set the baseline from reality, not assumptions — then name the root cause.',
    Component: Step02,
    isValid: (v) => !!v?.feeling && !!v?.cause,
  },
  {
    n: 3,
    title: 'Spending guardrails',
    why: 'Three "stop the bleeding" rules in one screen: cooling-off threshold, leak aggressiveness, prevention areas.',
    Component: Step03,
    isValid: (v) => typeof v?.threshold === 'number' && !!v?.leakMode && Array.isArray(v?.areas),
  },
  {
    n: 4,
    title: 'Your buffer',
    why: 'A comfort buffer turns Safe-to-Spend from a number into peace of mind.',
    Component: Step04,
    isValid: (v) => typeof v?.bufferPct === 'number' && typeof v?.adaptive === 'boolean',
  },
  {
    n: 5,
    title: 'Paycheck plan',
    why: 'Every dollar gets a job the moment it arrives, and bills shift away from your hardest week.',
    Component: Step05,
    isValid: (v) => !!v?.frequency && !!v?.stressWeek,
  },
  {
    n: 6,
    title: 'Wealth Redirector',
    why: 'When surplus shows up, it goes where you said — not where you noticed it last.',
    Component: Step06,
    isValid: (v) => !!v?.target,
  },
  {
    n: 7,
    title: 'Operating Mode',
    why: 'Pick the level of friction Coach should apply day-to-day.',
    Component: Step07,
    isValid: (v) => !!v?.mode,
  },
  {
    n: 8,
    title: 'Recovery style',
    why: 'One last call — how should Coach pace the climb back?',
    Component: Step08,
    isValid: (v) => !!v?.style,
  },
];

export function nextActiveStep(current: number, answers: Record<string, any>): number {
  for (let i = current; i <= STEPS.length; i++) {
    const step = STEPS[i - 1];
    if (!step) return STEPS.length + 1;
    if (step.shouldSkip?.(answers)) continue;
    return i;
  }
  return STEPS.length + 1;
}
