import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gauge, ListTree, GraduationCap, Trophy, FlaskConical } from 'lucide-react';
import { useCashflowEngine } from '@/hooks/use-cashflow-engine';
import { CashflowExecutive } from './CashflowExecutive';
import { PslfCountdownCard } from './PslfCountdownCard';
import { ContributionSourcesPanel } from './ContributionSourcesPanel';
import { MilestoneCompoundingPanel } from './MilestoneCompoundingPanel';
import { ScenarioLab } from './ScenarioLab';

const VIEWS = [
  { key: 'executive', label: 'Executive', icon: Gauge },
  { key: 'sources', label: 'Sources & Ladder', icon: ListTree },
  { key: 'pslf', label: 'PSLF', icon: GraduationCap },
  { key: 'milestones', label: 'Milestones', icon: Trophy },
  { key: 'scenarios', label: 'Scenarios', icon: FlaskConical },
] as const;

type ViewKey = (typeof VIEWS)[number]['key'];

interface Props {
  retirementTotal: number;
  selfDirectedTotal: number;
  investmentTotal: number;
}

export function CashflowEngineTab({ retirementTotal, selfDirectedTotal, investmentTotal }: Props) {
  const [view, setView] = useState<ViewKey>('executive');
  const e = useCashflowEngine(retirementTotal);

  const employee = e.sources
    .filter((s) => s.category === 'employee_base' && !e.config.disabledSources.includes(s.id))
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
  const employer = e.sources
    .filter((s) => s.category === 'employer' && !e.config.disabledSources.includes(s.id))
    .reduce((sum, s) => sum + s.monthlyAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            size="sm"
            variant={view === key ? 'default' : 'outline'}
            className="h-8 text-[11px]"
            onClick={() => setView(key)}
          >
            <Icon className="h-3.5 w-3.5 mr-1" /> {label}
          </Button>
        ))}
      </div>

      {view === 'executive' && (
        <>
          <CashflowExecutive
            retirementTotal={retirementTotal}
            selfDirectedTotal={selfDirectedTotal}
            investmentTotal={investmentTotal}
            currentMonthly={e.currentMonthly}
            employee={employee}
            employer={employer}
            nextIncrease={e.nextIncrease}
            pslf={e.pslf}
            projection={e.projection}
            config={e.config}
          />
          <PslfCountdownCard pslf={e.pslf} config={e.config} onPatch={e.patchConfig} />
        </>
      )}

      {view === 'sources' && (
        <ContributionSourcesPanel
          sources={e.sources}
          config={e.config}
          currentMonthly={e.currentMonthly}
          ladder={e.ladder}
          realloc={e.realloc}
          timeline={e.timeline}
          onToggle={e.toggleSource}
          onUpdate={e.updateSource}
        />
      )}

      {view === 'pslf' && <PslfCountdownCard pslf={e.pslf} config={e.config} onPatch={e.patchConfig} />}

      {view === 'milestones' && (
        <MilestoneCompoundingPanel
          projection={e.projection}
          scenarios={e.scenarios}
          retirementTotal={retirementTotal}
          config={e.config}
        />
      )}

      {view === 'scenarios' && (
        <ScenarioLab config={e.config} scenarios={e.scenarios} onPatch={e.patchConfig} onReset={e.reset} />
      )}
    </div>
  );
}
