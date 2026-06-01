import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CARD_MOMENT, type Moment } from './moment-types';

interface Props {
  card: number;
  moment: Moment;
  /** Legacy prop kept for back-compat; ignored in the column layout. */
  span?: 'md2' | 'md2lg3';
  children: ReactNode;
}

export function CoachSlot({ card, moment, children }: Props) {
  const cardMoment = CARD_MOMENT[card];
  const isMatch = moment === 'all' || cardMoment === moment;
  const dim = !isMatch;
  const highlight = moment !== 'all' && isMatch;

  return (
    <div
      id={`coach-card-${card}`}
      data-moment={cardMoment}
      className={cn(
        'transition-all duration-300',
        dim && 'opacity-40 saturate-50',
        highlight && 'bg-prism-teal/5',
      )}
    >
      {children}
    </div>
  );
}
