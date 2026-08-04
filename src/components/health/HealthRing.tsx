import { cn } from '@/lib/utils';

interface Props {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  /** Big centre number */
  primary: string;
  secondary?: string;
  label?: string;
  tone?: 'teal' | 'lime' | 'amber' | 'sky' | 'rose';
  className?: string;
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  teal: 'stroke-prism-teal',
  lime: 'stroke-prism-lime',
  amber: 'stroke-prism-amber',
  sky: 'stroke-prism-sky',
  rose: 'stroke-prism-rose',
};

export default function HealthRing({
  value,
  size = 140,
  stroke = 12,
  primary,
  secondary,
  label,
  tone = 'teal',
  className,
}: Props) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          role="img"
          aria-label={`${label ?? 'Progress'}: ${Math.round(pct * 100)}%`}
        >
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={pct >= 1 ? 'stroke-prism-lime' : TONE[tone]}
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tabular-nums leading-none">{primary}</span>
          {secondary && <span className="mt-1 text-xs text-muted-foreground">{secondary}</span>}
        </div>
      </div>
      {label && <p className="mt-2 text-sm font-medium">{label}</p>}
    </div>
  );
}
