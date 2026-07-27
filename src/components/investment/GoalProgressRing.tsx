interface Props {
  /** 0-1 progress toward goal */
  value: number;
  label: string;
  caption?: string;
  size?: number;
}

export function GoalProgressRing({ value, label, caption, size = 132 }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const complete = pct >= 1;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0 -rotate-90" role="img" aria-label={`${Math.round(pct * 100)}% of goal`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={complete ? 'stroke-emerald-500' : 'stroke-primary'}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
      </svg>
      <div className="min-w-0">
        <p className="text-3xl font-bold tabular-nums leading-none">{Math.round(pct * 100)}%</p>
        <p className="text-sm font-medium mt-1">{label}</p>
        {caption && <p className="text-xs text-muted-foreground mt-1">{caption}</p>}
      </div>
    </div>
  );
}
