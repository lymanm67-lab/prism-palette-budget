import { useState, useEffect, useCallback } from 'react';

export type FinancialProfile = {
  creditScore: string;
  primaryIncome: string;   // monthly gross
  partnerIncome: string;   // monthly gross
  monthlyDebts: string;    // sum of min payments on all non-mortgage debt
  monthlyExpenses: string; // living expenses excl. mortgage/HELOC & the debts above
  homeValue: string;
  mortgageBalance: string;
};

const KEY = 'prism.financial-profile.v1';

const DEFAULT: FinancialProfile = {
  creditScore: '',
  primaryIncome: '',
  partnerIncome: '',
  monthlyDebts: '',
  monthlyExpenses: '',
  homeValue: '',
  mortgageBalance: '',
};

function read(): FinancialProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

// Simple pub-sub so all hook instances stay in sync
const listeners = new Set<() => void>();

export function useFinancialProfile() {
  const [profile, setProfile] = useState<FinancialProfile>(read);

  useEffect(() => {
    const notify = () => setProfile(read());
    listeners.add(notify);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) notify(); };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(notify);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const update = useCallback((patch: Partial<FinancialProfile>) => {
    const next = { ...read(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach(fn => fn());
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    listeners.forEach(fn => fn());
  }, []);

  return { profile, update, reset };
}

// ─── Derived numbers ───
export function profileNumbers(p: FinancialProfile) {
  const n = (s: string) => parseFloat(s) || 0;
  const primary = n(p.primaryIncome);
  const partner = n(p.partnerIncome);
  const totalIncome = primary + partner;
  const debts = n(p.monthlyDebts);
  const expenses = n(p.monthlyExpenses);
  const netSurplus = totalIncome - debts - expenses;
  const homeValue = n(p.homeValue);
  const mortgageBalance = n(p.mortgageBalance);
  const equity = Math.max(0, homeValue - mortgageBalance);
  const ltv = homeValue > 0 ? (mortgageBalance / homeValue) * 100 : 0;
  return { primary, partner, totalIncome, debts, expenses, netSurplus, homeValue, mortgageBalance, equity, ltv };
}

// FICO tier
export function ficoTier(score: number): { label: string; color: string; tone: 'good' | 'ok' | 'bad' } {
  if (!score) return { label: 'Unknown', color: 'text-muted-foreground', tone: 'ok' };
  if (score >= 760) return { label: 'Exceptional', color: 'text-prism-lime', tone: 'good' };
  if (score >= 720) return { label: 'Very Good', color: 'text-prism-lime', tone: 'good' };
  if (score >= 680) return { label: 'Good', color: 'text-prism-teal', tone: 'good' };
  if (score >= 640) return { label: 'Fair', color: 'text-prism-amber', tone: 'ok' };
  if (score >= 580) return { label: 'Poor', color: 'text-prism-rose', tone: 'bad' };
  return { label: 'Very Poor', color: 'text-prism-rose', tone: 'bad' };
}

// DTI on total income (front-end housing + back-end debts)
export function dtiFor(p: FinancialProfile, extraHousingPmt = 0): number {
  const { totalIncome, debts } = profileNumbers(p);
  if (totalIncome <= 0) return 0;
  return ((debts + extraHousingPmt) / totalIncome) * 100;
}

// Qualification verdict for a proposed monthly housing payment
export function qualifyFor(p: FinancialProfile, housingPayment: number, product: 'mortgage' | 'heloc' = 'mortgage'):
  { verdict: 'qualify' | 'borderline' | 'no'; reasons: string[]; dti: number; scoreOk: boolean } {
  const score = parseInt(p.creditScore) || 0;
  const dti = dtiFor(p, housingPayment);
  const minScore = product === 'heloc' ? 680 : 620;
  const maxDti = product === 'heloc' ? 45 : 43;

  const reasons: string[] = [];
  const scoreOk = score >= minScore;
  if (!score) reasons.push('Add your credit score for a real verdict.');
  else if (!scoreOk) reasons.push(`FICO ${score} is below the ${minScore} minimum for ${product === 'heloc' ? '1st-lien HELOC' : 'conventional mortgage'}.`);
  if (dti > maxDti) reasons.push(`DTI ${dti.toFixed(0)}% exceeds the ${maxDti}% guideline.`);
  else if (dti > maxDti - 5) reasons.push(`DTI ${dti.toFixed(0)}% is close to the ${maxDti}% ceiling.`);

  if (product === 'heloc') {
    const { netSurplus } = profileNumbers(p);
    if (netSurplus <= 0) reasons.push('No monthly surplus — a 1st-lien HELOC would grow, not shrink.');
    else if (netSurplus < 500) reasons.push('Surplus under $500/mo — HELOC savings will be modest.');
    const { ltv } = profileNumbers(p);
    if (ltv > 90) reasons.push(`LTV ${ltv.toFixed(0)}% exceeds typical 90% cap.`);
  }

  let verdict: 'qualify' | 'borderline' | 'no' = 'qualify';
  if (!scoreOk || dti > maxDti) verdict = 'no';
  else if (reasons.length > 0) verdict = 'borderline';
  return { verdict, reasons, dti, scoreOk };
}
