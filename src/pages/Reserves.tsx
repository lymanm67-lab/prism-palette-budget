import { useEffect } from 'react';
import { EmergencyFundCard } from '@/components/reserves/EmergencyFundCard';
import { VehicleMaintenanceCard } from '@/components/reserves/VehicleMaintenanceCard';
import { SofiInvestmentsCard } from '@/components/reserves/SofiInvestmentsCard';
import { FinancialResilienceSection } from '@/components/reserves/FinancialResilienceSection';

export default function Reserves() {
  useEffect(() => {
    document.title = 'Emergency Fund & Liquidity | PrismMoney';
  }, []);

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Emergency Fund &amp; Liquidity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One clear picture of the cash that protects the household — SoFi emergency cash, the monthly
          buffer, vehicle maintenance and vacation savings — kept strictly separate from investments and
          retirement.
        </p>
      </header>

      <FinancialResilienceSection />
      <EmergencyFundCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <VehicleMaintenanceCard />
        <SofiInvestmentsCard />
      </div>
    </div>
  );
}
