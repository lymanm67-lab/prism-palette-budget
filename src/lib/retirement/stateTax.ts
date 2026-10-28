/** Simplified 2026 state retirement-tax estimates. Verify with a tax advisor. */
export interface StateTaxProfile {
  code: string;
  name: string;
  /** Effective rate applied to taxable retirement income. */
  rate: number;
  taxesRetirementWithdrawals: boolean;
  taxesPension: boolean;
  taxesSocialSecurity: boolean;
  /** Effective property-tax rate on home value. */
  propertyTaxRate: number;
}

export const STATE_TAX: StateTaxProfile[] = [
  { code: 'OH', name: 'Ohio', rate: 0.0275, taxesRetirementWithdrawals: true, taxesPension: true, taxesSocialSecurity: false, propertyTaxRate: 0.0136 },
  { code: 'FL', name: 'Florida', rate: 0, taxesRetirementWithdrawals: false, taxesPension: false, taxesSocialSecurity: false, propertyTaxRate: 0.0082 },
  { code: 'TX', name: 'Texas', rate: 0, taxesRetirementWithdrawals: false, taxesPension: false, taxesSocialSecurity: false, propertyTaxRate: 0.0158 },
  { code: 'TN', name: 'Tennessee', rate: 0, taxesRetirementWithdrawals: false, taxesPension: false, taxesSocialSecurity: false, propertyTaxRate: 0.0055 },
  { code: 'NV', name: 'Nevada', rate: 0, taxesRetirementWithdrawals: false, taxesPension: false, taxesSocialSecurity: false, propertyTaxRate: 0.0055 },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307, taxesRetirementWithdrawals: false, taxesPension: false, taxesSocialSecurity: false, propertyTaxRate: 0.0149 },
  { code: 'NC', name: 'North Carolina', rate: 0.0399, taxesRetirementWithdrawals: true, taxesPension: true, taxesSocialSecurity: false, propertyTaxRate: 0.0070 },
  { code: 'IN', name: 'Indiana', rate: 0.03, taxesRetirementWithdrawals: true, taxesPension: true, taxesSocialSecurity: false, propertyTaxRate: 0.0075 },
  { code: 'SC', name: 'South Carolina', rate: 0.06, taxesRetirementWithdrawals: true, taxesPension: true, taxesSocialSecurity: false, propertyTaxRate: 0.0051 },
];

export const stateByCode = (code: string) => STATE_TAX.find((s) => s.code === code) ?? STATE_TAX[0];

export function stateTaxFor(
  s: StateTaxProfile,
  income: { withdrawals: number; pension: number; socialSecurity: number },
  homeValue = 0,
): number {
  const taxable =
    (s.taxesRetirementWithdrawals ? income.withdrawals : 0) +
    (s.taxesPension ? income.pension : 0) +
    (s.taxesSocialSecurity ? income.socialSecurity : 0);
  return Math.max(0, taxable) * s.rate + homeValue * s.propertyTaxRate;
}
