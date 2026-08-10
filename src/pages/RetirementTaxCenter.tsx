import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark, PiggyBank, Briefcase, HeartHandshake, Users, Settings } from 'lucide-react';
import { useRetirementTax } from '@/hooks/use-retirement-tax';
import { forecastRmd, summarizeRmd } from '@/lib/tax/rmdEngine';
import { planConversionLadder, rmdRelief } from '@/lib/tax/rothEngine';
import { projectHeirTax } from '@/lib/tax/legacyTax';
import { TaxExecutiveDashboard } from '@/components/tax/TaxExecutiveDashboard';
import { RmdForecastPanel } from '@/components/tax/RmdForecastPanel';
import { RothLadderPanel } from '@/components/tax/RothLadderPanel';
import { BusinessLossPanel } from '@/components/tax/BusinessLossPanel';
import { CharitableTaxPanel } from '@/components/tax/CharitableTaxPanel';
import { LegacyTaxPanel } from '@/components/tax/LegacyTaxPanel';
import { TaxSettingsPanel } from '@/components/tax/TaxSettingsPanel';

const SECTIONS = [
  { key: 'overview', label: 'Executive', icon: Landmark },
  { key: 'rmd', label: 'RMD Forecast', icon: Landmark },
  { key: 'roth', label: 'Roth Ladder', icon: PiggyBank },
  { key: 'losses', label: 'Business Losses', icon: Briefcase },
  { key: 'giving', label: 'Charitable', icon: HeartHandshake },
  { key: 'legacy', label: 'Heirs & Legacy', icon: Users },
  { key: 'settings', label: 'Assumptions', icon: Settings },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

export default function RetirementTaxCenter() {
  const t = useRetirementTax();
  const [section, setSection] = useState<SectionKey>(() => {
    const q = new URLSearchParams(window.location.search).get('tab');
    return SECTIONS.some((s) => s.key === q) ? (q as SectionKey) : 'overview';
  });
  const [otherIncome, setOtherIncome] = useState(60_000);
  const [heirCount, setHeirCount] = useState(3);

  const s = t.settings;

  const qcdByYear = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of t.charitable) {
      if (p.counts_toward_rmd) map[p.tax_year] = (map[p.tax_year] ?? 0) + Number(p.amount);
    }
    return map;
  }, [t.charitable]);

  const ladder = useMemo(
    () =>
      planConversionLadder({
        pretaxBalance: t.buckets.pretax,
        rothBalance: t.buckets.roth,
        birthYear: s.birth_year,
        rmdStartAge: s.rmd_start_age,
        planningEndAge: s.planning_end_age,
        assumedReturn: s.assumed_return,
        inflation: s.inflation,
        filingStatus: s.filing_status,
        otherIncome,
        targetBracket: s.target_bracket,
        irmaaGuard: s.irmaa_guard,
        lossesByYear: t.availableLossesByYear,
      }),
    [t.buckets, t.availableLossesByYear, s, otherIncome],
  );

  const rows = useMemo(
    () =>
      forecastRmd({
        pretaxBalance: t.buckets.pretax,
        birthYear: s.birth_year,
        rmdStartAge: s.rmd_start_age,
        planningEndAge: s.planning_end_age,
        assumedReturn: s.assumed_return,
        inflation: s.inflation,
        filingStatus: s.filing_status,
        otherIncome,
        conversionsByYear: ladder.conversionsByYear,
        qcdByYear,
      }),
    [t.buckets.pretax, s, otherIncome, ladder.conversionsByYear, qcdByYear],
  );

  const summary = useMemo(() => summarizeRmd(rows), [rows]);
  const relief = useMemo(
    () =>
      rmdRelief(
        {
          pretaxBalance: t.buckets.pretax,
          rothBalance: t.buckets.roth,
          birthYear: s.birth_year,
          rmdStartAge: s.rmd_start_age,
          planningEndAge: s.planning_end_age,
          assumedReturn: s.assumed_return,
          inflation: s.inflation,
          filingStatus: s.filing_status,
          otherIncome,
          targetBracket: s.target_bracket,
          irmaaGuard: s.irmaa_guard,
        },
        ladder,
      ),
    [t.buckets, s, otherIncome, ladder],
  );

  const heir = useMemo(
    () =>
      projectHeirTax({
        pretaxAtDeath: summary.balanceAtEnd,
        rothAtDeath: ladder.rothAtEnd,
        taxableAtDeath: t.buckets.taxable,
        heirCount,
        heirOtherIncome: 90_000,
        heirFilingStatus: 'married_joint',
        yearOfDeath: s.birth_year + s.planning_end_age,
        inflation: s.inflation,
      }),
    [summary.balanceAtEnd, ladder.rothAtEnd, t.buckets.taxable, heirCount, s],
  );

  if (t.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Retirement Tax Control Center</h1>
        <p className="text-sm text-muted-foreground">
          Required withdrawals, Roth conversions, business losses, charitable giving, and heir tax impact in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((sec) => (
          <Button
            key={sec.key}
            size="sm"
            variant={section === sec.key ? 'default' : 'outline'}
            className="h-8 gap-1.5"
            onClick={() => setSection(sec.key)}
          >
            <sec.icon className="h-3.5 w-3.5" />
            {sec.label}
          </Button>
        ))}
      </div>

      {t.buckets.total === 0 && (
        <Card className="glass-card">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No retirement accounts found yet. Add accounts in Investment Holdings, then classify their tax treatment
            under Assumptions.
          </CardContent>
        </Card>
      )}

      {section === 'overview' && (
        <TaxExecutiveDashboard
          buckets={t.buckets}
          rows={rows}
          summary={summary}
          ladder={ladder}
          rmdStartAge={s.rmd_start_age}
        />
      )}
      {section === 'rmd' && <RmdForecastPanel rows={rows} />}
      {section === 'roth' && (
        <RothLadderPanel ladder={ladder} relief={relief} targetBracket={s.target_bracket} irmaaGuard={s.irmaa_guard} />
      )}
      {section === 'losses' && (
        <BusinessLossPanel
          losses={t.losses}
          onAdd={(row) => t.addLoss.mutate(row)}
          onRemove={(id) => t.removeLoss.mutate(id)}
          isSaving={t.addLoss.isPending}
        />
      )}
      {section === 'giving' && (
        <CharitableTaxPanel
          plans={t.charitable}
          accounts={t.accounts}
          marginalRate={summary.peakMarginalRate || s.target_bracket}
          firstRmd={summary.firstRmdAmount}
          onAdd={(row) => t.saveCharitable.mutate(row)}
          onRemove={(id) => t.removeCharitable.mutate(id)}
        />
      )}
      {section === 'legacy' && (
        <LegacyTaxPanel
          heir={heir}
          heirCount={heirCount}
          pretaxAtDeath={summary.balanceAtEnd}
          rothAtDeath={ladder.rothAtEnd}
          planningEndAge={s.planning_end_age}
        />
      )}
      {section === 'settings' && (
        <TaxSettingsPanel
          settings={s}
          accounts={t.accounts}
          otherIncome={otherIncome}
          heirCount={heirCount}
          onOtherIncome={setOtherIncome}
          onHeirCount={setHeirCount}
          onSave={(patch) => t.saveSettings.mutate(patch)}
          onSaveAccount={(patch) => t.saveAccountTax.mutate(patch)}
        />
      )}
    </motion.div>
  );
}
