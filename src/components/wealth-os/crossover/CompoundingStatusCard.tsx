import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Gauge } from 'lucide-react';
import {
  runCrossover,
  money,
  moneyShort,
  NAVY,
  GOLD,
  EMERALD,
  OFFICIAL_RETURN_PCT,
} from '@/lib/investment/crossoverEngine';

type Props = {
  balance: number;
  annualContributions: number;
  returnPct?: number;
  contributionGrowthPct?: number;
  debtRedirectAnnual?: number;
  debtRedirectStartYear?: number;
};

export default function CompoundingStatusCard({
  balance,
  annualContributions,
  returnPct = OFFICIAL_RETURN_PCT,
  contributionGrowthPct = 3,
  debtRedirectAnnual,
  debtRedirectStartYear,
}: Props) {
  const onCrossoverPage = useLocation().pathname === '/legacy/crossover';
  const res = runCrossover({
    currentBalance: balance,
    annualContributions,
    returnPct,
    contributionGrowthPct,
    debtRedirectAnnual,
    debtRedirectStartYear,
  });

  const statusColor =
    res.status === 'Building Foundation'
      ? '#2563EB'
      : res.status === 'Building Momentum'
      ? '#0EA5E9'
      : res.status === 'Near Crossover'
      ? GOLD
      : EMERALD;

  const cell = (label: string, value: string) => (
    <div className="rounded-lg border p-3" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-base font-bold" style={{ color: NAVY }}>
        {value}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#E2E8F0' }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5" style={{ color: GOLD }} />
          <div>
            <h3 className="text-lg font-bold" style={{ color: NAVY }}>
              Compounding Status
            </h3>
            <p className="text-xs text-slate-500">
              Planning assumption: {returnPct}% expected annual return
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ background: statusColor }}
        >
          {res.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cell('Current Portfolio', money(balance))}
        {cell('Annual Contributions', money(annualContributions))}
        {cell('Annual Investment Growth', money(res.annualGrowthNow))}
        {cell('Estimated Crossover Portfolio', moneyShort(res.crossoverPortfolio))}
        {cell(
          'Years Until Crossover',
          res.yearsToCrossover ? `${res.yearsToCrossover} yrs (${res.crossoverYear})` : '—',
        )}
        {cell('Distance to Crossover', moneyShort(res.distanceToCrossover))}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
          <span>Progress Toward Compounding Crossover™</span>
          <span>{Math.round(res.progressPct)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${res.progressPct}%`, background: `linear-gradient(90deg, ${NAVY}, ${GOLD})` }}
          />
        </div>
      </div>

      {onCrossoverPage ? (
        <button
          type="button"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
          style={{ color: EMERALD }}
        >
          Back to top of The Compounding Crossover™ <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <Link
          to="/legacy/crossover"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
          style={{ color: EMERALD }}
        >
          Open The Compounding Crossover™ <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
