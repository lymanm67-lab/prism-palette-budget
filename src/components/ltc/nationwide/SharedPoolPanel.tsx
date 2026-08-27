import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import {
  POOL_SCENARIO_LABEL, sharedPool, type PoolScenario, NW_PROJECTION_AGES,
} from '@/lib/ltc/nationwide';
import { money, StatCard, Field, Select } from '../shared';
import { IllustrationTag, PlanningNotice } from './PlanningNotice';

const SCENARIOS = Object.keys(POOL_SCENARIO_LABEL) as PoolScenario[];

export function SharedPoolPanel({
  scenario, age, onScenario, onAge,
}: {
  scenario: PoolScenario;
  age: number;
  onScenario: (s: PoolScenario) => void;
  onAge: (a: number) => void;
}) {
  const r = sharedPool(scenario, age);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-prism-teal" /> Our Shared LTC Protection Pool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The policy is designed for two insureds using a shared LTC benefit structure. Benefits can respond to whichever
            spouse ultimately has the greater care need rather than forcing equal usage.
          </p>

          {/* Two insureds → one flexible pool */}
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] items-center">
            <div className="space-y-2">
              <div className="rounded-lg border border-prism-sky/30 bg-prism-sky/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lyman</p>
                <p className="text-sm font-semibold">{money(r.monthlyBenefitEach)}/mo available</p>
                <p className="text-[11px] text-muted-foreground">Benefits used: {money(r.usedLyman)}</p>
              </div>
              <div className="rounded-lg border border-prism-sky/30 bg-prism-sky/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Kateri</p>
                <p className="text-sm font-semibold">{money(r.monthlyBenefitEach)}/mo available</p>
                <p className="text-[11px] text-muted-foreground">Benefits used: {money(r.usedKateri)}</p>
              </div>
            </div>
            <div className="text-center text-muted-foreground text-xs md:px-2">→<br />shared<br />→</div>
            <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Shared LTC Pool at age {age}</p>
              <p className="text-2xl font-bold tabular-nums">{money(r.pool)}</p>
              <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-prism-lime" style={{ width: `${Math.min(100, r.remainingPct)}%` }} />
              </div>
              <p className="text-xs mt-1">
                Remaining Household LTC Protection: <span className="font-semibold">{money(r.remaining)}</span>{' '}
                ({r.remainingPct.toFixed(0)}%)
              </p>
              <div className="mt-2"><IllustrationTag illustrated={age === 85} /></div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Remaining Available Benefit" value={money(r.remaining)} tone="good" />
            <StatCard label="Benefits Used by Lyman" value={money(r.usedLyman)} />
            <StatCard label="Benefits Used by Kateri" value={money(r.usedKateri)} />
            <StatCard label="Total benefits used" value={money(r.used)} tone="warn" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Evaluate at older-insured age">
              <Select
                value={String(age)}
                onChange={(v) => onAge(Number(v))}
                options={NW_PROJECTION_AGES.map((a) => ({ value: String(a), label: `Age ${a}` }))}
              />
            </Field>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Usage scenario</p>
              <div className="flex flex-wrap gap-1.5">
                {SCENARIOS.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === scenario ? 'default' : 'outline'}
                    className="text-xs"
                    onClick={() => onScenario(s)}
                  >
                    {POOL_SCENARIO_LABEL[s]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{r.note} The app never assumes each spouse uses exactly half of the benefit.</p>
        </CardContent>
      </Card>
      <PlanningNotice />
    </div>
  );
}
