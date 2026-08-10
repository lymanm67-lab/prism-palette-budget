import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CONFIG, defaultSources, pslfStatus, runProjection, contributionLadder,
  reallocationPlan, contributionTimeline, monthlyInvestmentAt, BASELINE_MONTH,
  RETURN_SCENARIOS, type ContributionSource, type EngineConfig,
} from '@/lib/retirement/cashflowEngine';

const CFG_KEY = 'prism.cashflowEngine.config.v1';
const SRC_KEY = 'prism.cashflowEngine.sources.v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function useCashflowEngine(startingBalance?: number) {
  const [config, setConfig] = useState<EngineConfig>(() => load(CFG_KEY, DEFAULT_CONFIG));
  const [sources, setSources] = useState<ContributionSource[]>(() => load(SRC_KEY, defaultSources()));

  useEffect(() => { localStorage.setItem(CFG_KEY, JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem(SRC_KEY, JSON.stringify(sources)); }, [sources]);

  const cfg = useMemo<EngineConfig>(
    () => ({ ...config, startingBalance: startingBalance ?? config.startingBalance }),
    [config, startingBalance],
  );

  const patchConfig = useCallback((patch: Partial<EngineConfig>) => setConfig((c) => ({ ...c, ...patch })), []);

  const toggleSource = useCallback((id: string) => {
    setConfig((c) => ({
      ...c,
      disabledSources: c.disabledSources.includes(id)
        ? c.disabledSources.filter((x) => x !== id)
        : [...c.disabledSources, id],
    }));
  }, []);

  const updateSource = useCallback((id: string, patch: Partial<ContributionSource>) => {
    setSources((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addRaiseSource = useCallback((s: Omit<ContributionSource, 'id'>) => {
    setSources((list) => [...list, { ...s, id: `raise-${Date.now()}` }]);
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources((list) => list.filter((s) => s.id !== id));
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setSources(defaultSources());
  }, []);

  const pslf = useMemo(() => pslfStatus(cfg), [cfg]);
  const projection = useMemo(() => runProjection(sources, cfg), [sources, cfg]);
  const scenarios = useMemo(
    () => RETURN_SCENARIOS.map((r) => runProjection(sources, cfg, r)),
    [sources, cfg],
  );
  const ladder = useMemo(() => contributionLadder(sources, pslf, cfg), [sources, pslf, cfg]);
  const realloc = useMemo(() => reallocationPlan(pslf), [pslf]);
  const timeline = useMemo(() => contributionTimeline(pslf, cfg), [pslf, cfg]);

  const currentMonthly = useMemo(
    () => monthlyInvestmentAt(sources, BASELINE_MONTH, cfg, pslf),
    [sources, cfg, pslf],
  );

  const nextIncrease = useMemo(() => {
    const months = projection.months;
    const base = currentMonthly;
    for (const p of months) {
      const total = p.employee + p.employer + p.accelerator + p.debtRealloc + p.loanRealloc + p.stepUps + p.raise;
      if (total > base + 0.5) return { month: p.month, amount: total - base, total };
    }
    return null;
  }, [projection, currentMonthly]);

  return {
    config: cfg, patchConfig, reset,
    sources, toggleSource, updateSource, addRaiseSource, removeSource,
    pslf, projection, scenarios, ladder, realloc, timeline,
    currentMonthly, nextIncrease,
  };
}
