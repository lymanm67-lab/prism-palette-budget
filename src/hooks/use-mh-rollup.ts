// Cross-tab rollups for the Medical Housing Market Planner.
import { useMemo } from 'react';
import {
  useMhMarkets, useMhProperties, useMhEmployers,
  useMhStartupScenarios, useMhIncomeScenarios, useMhSettings,
} from '@/hooks/use-medical-housing';
import {
  computeStartup, computeIncome, computeVillageFunding,
  type StartupInputs, type IncomeInputs,
} from '@/lib/legacy/medicalHousing';

export function useMhRollup() {
  const markets = useMhMarkets();
  const properties = useMhProperties();
  const employers = useMhEmployers();
  const startup = useMhStartupScenarios();
  const income = useMhIncomeScenarios();
  const settings = useMhSettings();

  return useMemo(() => {
    const activeStartup = startup.data?.find((s) => s.is_active) ?? startup.data?.[0] ?? null;
    const activeIncome = income.data?.find((s) => s.is_active) ?? income.data?.[0] ?? null;

    const startupTotals = activeStartup
      ? computeStartup(activeStartup as StartupInputs)
      : null;
    const incomeTotals = activeIncome
      ? computeIncome(activeIncome as IncomeInputs)
      : null;

    const primaryMarkets = (markets.data ?? []).filter((m) => m.priority === 'primary');
    const bestMarket =
      primaryMarkets.find((m) => m.rent_expected && m.rent_expected > 0) ??
      primaryMarkets[0] ??
      (markets.data ?? [])[0] ??
      null;

    const propertiesUnderReview = (properties.data ?? []).filter(
      (p) => p.status !== 'rejected' && p.status !== 'purchased',
    ).length;

    const contactedStatuses = ['contacted', 'in_discussion', 'referral_active'];
    const referralPartnersContacted = (employers.data ?? []).filter((e) =>
      contactedStatuses.includes(e.referral_status),
    ).length;
    const hospitalSystemsServed = (employers.data ?? []).filter(
      (e) => e.referral_status === 'referral_active',
    ).length;

    const reserves = Number(settings.data?.available_reserves ?? 0);
    const fundingGap = Math.max(0, (startupTotals?.totalStartup ?? 0) - reserves);

    const annualProfit = Math.max(0, incomeTotals?.netAnnualCashFlow ?? 0);
    const village = settings.data
      ? computeVillageFunding({
        annualProfit,
        allocationPct: Number(settings.data.village_allocation_pct ?? 0),
        customAmount: settings.data.village_custom_amount ?? null,
        fundBalance: Number(settings.data.village_fund_balance ?? 0),
        fundingGoal: Number(settings.data.village_funding_goal ?? 0),
      })
      : null;

    return {
      loading: markets.isLoading || startup.isLoading || income.isLoading || settings.isLoading,
      activeStartup, activeIncome, startupTotals, incomeTotals,
      bestMarket, propertiesUnderReview, referralPartnersContacted,
      hospitalSystemsServed, reserves, fundingGap, annualProfit, village,
      settings: settings.data ?? null,
      markets: markets.data ?? [],
      properties: properties.data ?? [],
    };
  }, [markets.data, markets.isLoading, properties.data, employers.data, startup.data, startup.isLoading, income.data, income.isLoading, settings.data, settings.isLoading]);
}
