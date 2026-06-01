import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CARD_MOMENT, type Moment } from './moment-types';

interface Props {
  card: number;
  moment: Moment;
  span?: 'md2' | 'md2lg3';
  children: ReactNode;
}

export function CoachSlot({ card, moment, span, children }: Props) {
  const cardMoment = CARD_MOMENT[card];
  const isMatch = moment === 'all' || cardMoment === moment;
  const dim = !isMatch;
  const highlight = moment !== 'all' && isMatch;

  return (
    <div
      id={`coach-card-${card}`}
      data-moment={cardMoment}
      className={cn(
        'transition-all duration-500 rounded-lg',
        span === 'md2' && 'md:col-span-2',
        span === 'md2lg3' && 'md:col-span-2 lg:col-span-3',
        dim && 'opacity-40 saturate-50 scale-[0.99]',
        highlight && 'ring-2 ring-prism-teal/50 ring-offset-2 ring-offset-background shadow-lg shadow-prism-teal/10',
      )}
    >
      {children}
    </div>
  );
}
