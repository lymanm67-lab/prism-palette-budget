import type { ComponentType } from 'react';
import { Step01 } from './Step01';
import { Step02 } from './Step02';
import { Step03 } from './Step03';
import { Step04 } from './Step04';
import { Step05 } from './Step05';
import { Step06 } from './Step06';
import { Step07 } from './Step07';
import { Step08 } from './Step08';
import { Step09 } from './Step09';
import { Step10 } from './Step10';
import { Step11 } from './Step11';
import { Step12 } from './Step12';

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
  // Return true if this step should be skipped given prior answers
  shouldSkip?: (answers: Record<string, any>) => boolean;
  isValid?: (value: any) => boolean;
}

export const STEPS: StepDef[] = [
  { n: 1, title: 'What happened', why: 'Set the baseline for last month so the plan starts from reality, not assumptions.', Component: Step01, isValid: (v) => !!v?.feeling },
  { n: 2, title: 'Why it happened', why: 'Knowing the root cause lets us fix the system, not the symptom.', Component: Step02, isValid: (v) => !!v?.cause },
  { n: 3, title: 'Recovery plan', why: 'Choose a recovery style that you can actually stick to.', Component: Step03, isValid: (v) => !!v?.style },
  { n: 4, title: 'Prevention rules', why: 'Stop the same overage from happening twice.', Component: Step04, isValid: (v) => Array.isArray(v?.areas) },
  { n: 5, title: 'Purchase Guard', why: 'A cooling-off threshold prevents impulse buys without feeling restrictive.', Component: Step05, isValid: (v) => typeof v?.threshold === 'number' },
  { n: 6, title: 'Money Leaks', why: 'Decide upfront how aggressively Coach should kill silent subscriptions.', Component: Step06, isValid: (v) => !!v?.mode },
  { n: 7, title: 'Safe-to-Spend buffer', why: 'A comfort buffer turns Safe-to-Spend from a number into peace of mind.', Component: Step07, isValid: (v) => typeof v?.bufferPct === 'number' },
  { n: 8, title: 'Adaptive Buffer', why: 'Let Coach widen or tighten your buffer as life changes.', Component: Step08, isValid: (v) => !!v?.adaptive },
  { n: 9, title: 'Paycheck Deployment', why: 'Every dollar gets a job the moment it arrives.', Component: Step09, isValid: (v) => !!v?.frequency },
  { n: 10, title: 'Bill Timing', why: 'Shift due dates so no week feels like a crisis.', Component: Step10, isValid: (v) => !!v?.stressWeek },
  { n: 11, title: 'Wealth Redirector', why: 'When surplus shows up, it goes where you said — not where you noticed it last.', Component: Step11, isValid: (v) => !!v?.target },
  { n: 12, title: 'Operating Mode', why: 'Pick the level of friction Coach should apply day-to-day.', Component: Step12, isValid: (v) => !!v?.mode },
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
