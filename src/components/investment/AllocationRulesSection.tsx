import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, RotateCcw } from 'lucide-react';
import { useRetirementAllocation } from '@/hooks/useRetirementAllocation';
import { AllocationSettingsPanel } from './allocation/AllocationSettingsPanel';
import { AllocationEventsList } from './allocation/AllocationEventsList';
import { AllocationProjectionTable } from './allocation/AllocationProjectionTable';
import { Skeleton } from '@/components/ui/skeleton';

export function AllocationRulesSection() {
  const {
    isLoading, settings, engine,
    updateSettings, updateEvent, resetToDefaults,
  } = useRetirementAllocation();

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const employerMonthly = settings.current_monthly_salary * (settings.employer_contribution_rate / 100);
  const hasSsEvent = engine.rows.some((r) => r.event.event_type === 'ss_invest');

  return (
    <div className="space-y-4">
      {/* Baseline read-only summary */}
      <div className="rounded-lg border border-border bg-card/40 p-3 grid gap-2 sm:grid-cols-4 text-xs">
        <Stat label="Monthly salary" value={`$${settings.current_monthly_salary.toLocaleString()}`} />
        <Stat label="Employee contribution" value={`$${settings.current_ee_contribution.toFixed(2)}/mo`} />
        <Stat label="Employer contribution" value={`$${employerMonthly.toFixed(0)}/mo (${settings.employer_contribution_rate}%)`} hint="Tracked separately; not double-counted in events." />
        <Stat label="SS estimate (age 70)" value={`$${settings.ss_age70_estimate.toLocaleString()}/mo`} />
      </div>

      {/* Settings */}
      <AllocationSettingsPanel settings={settings} onChange={(patch) => updateSettings(patch)} />

      {/* SS warning */}
      {hasSsEvent && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Social Security investing</AlertTitle>
          <AlertDescription className="text-xs">
            Social Security generally cannot be directly contributed to an employer retirement plan because it is not
            payroll compensation. The app treats it as taxable brokerage funding unless you choose a cash-flow
            replacement strategy (where SS replaces paycheck cash and you redirect existing wages into the workplace
            plan, subject to plan limits).
          </AlertDescription>
        </Alert>
      )}

      {/* Spouse OPERS info chip */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Spouse OPERS</AlertTitle>
        <AlertDescription className="text-xs">
          Spouse OPERS account value is not counted as a liquid asset and is excluded from this allocation engine.
          The OPERS pension is treated as household income protection only.
        </AlertDescription>
      </Alert>

      {/* Events */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Future contribution events</h4>
          <Button variant="ghost" size="sm" onClick={() => resetToDefaults()}>
            <RotateCcw className="h-3 w-3 mr-1" /> Reset to defaults
          </Button>
        </div>
        <AllocationEventsList
          rows={engine.rows}
          onToggleActive={(id, active) => updateEvent({ id, patch: { is_active: active } as any })}
          onAmountChange={(id, monthly_amount) => updateEvent({ id, patch: { monthly_amount } as any })}
          onAllocationChange={(id, alloc) => updateEvent({ id, patch: { user_allocation: alloc as any } as any })}
        />
      </div>

      {/* Projection table */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Projection summary</h4>
        <AllocationProjectionTable rows={engine.rows} />
        <p className="text-[11px] text-muted-foreground">
          {settings.inflation_mode === 'future'
            ? 'Amounts shown in future dollars at the event date.'
            : "Amounts shown in today's dollars (discounted by the annual raise rate)."}
          {' '}Plan limits are 2025 IRS values with an assumed 2% annual COLA — estimates only.
        </p>
      </div>

      {/* Disclaimer */}
      <Alert variant="default" className="border-amber-500/30">
        <Info className="h-4 w-4" />
        <AlertTitle>Educational projections only</AlertTitle>
        <AlertDescription className="text-xs">
          This feature provides educational planning projections only and does not provide financial, tax, legal,
          investment, Social Security, pension, or estate planning advice. Verify all contribution limits, HSA
          eligibility, and Social Security strategy with a qualified advisor.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-sm">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
