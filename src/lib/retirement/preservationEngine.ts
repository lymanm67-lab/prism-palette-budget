// Retirement Preservation & Legacy Growth Engine™
// Multi-phase household retirement projection (accumulation → transition → preservation)

export type EngineInputs = {
  baseYear: number;

  // Lyman
  lymanAge: number;
  lymanRetireAge: number;
  lymanSalary: number;
  lymanEmployeePct: number;   // employee deferral, e.g. 0.30
  lymanEmployerPct: number;   // employer non-elective, e.g. 0.09
  lymanBalance: number;
  salaryRaise: number;        // e.g. 0.03

  // Cash-flow redirects
  marketingRedirectMonthly: number;  // $110 net
  marketingRedirectStartYear: number;
  marketingRedirectStartMonth: number;
  debtRedirectMonthly: number;       // $888
  debtRedirectStartYear: number;
  debtRedirectStartMonth: number;

  // Kateri
  kateriAge: number;
  kateriRetireAge: number;
  kateriSalary: number;
  kateriOpers: number;
  kateriDeferredComp: number;
  kateriDcMonthly: number;    // $150/mo
  kateriPensionMonthly: number;

  // Income
  socialSecurityMonthly: number;

  // Assumption
  returnRate: number;         // e.g. 0.08
};

export type Phase = 'accumulation' | 'transition' | 'preservation';

export type YearRow = {
  year: number;
  lymanAge: number;
  kateriAge: number;
  phase: Phase;
  lymanBalance: number;
  kateriDc: number;
  kateriOpers: number;        // investable OPERS balance (0 once annuitized)
  opersAnnuitized: number;    // value converted to pension at retirement
  householdAssets: number;    // Lyman + DC + un-annuitized OPERS
  contributions: number;      // total household contributions that year
  growth: number;             // total investment growth that year
  pensionIncome: number;
  socialSecurityIncome: number;
  guaranteedIncome: number;
  withdrawalRate: number;
};

export const DEFAULT_INPUTS: EngineInputs = {
  baseYear: 2026,
  lymanAge: 59,
  lymanRetireAge: 75,
  lymanSalary: 95940,
  lymanEmployeePct: 0.30,
  lymanEmployerPct: 0.09,
  lymanBalance: 0,
  salaryRaise: 0.03,
  marketingRedirectMonthly: 110,
  marketingRedirectStartYear: 2027,
  marketingRedirectStartMonth: 1,
  debtRedirectMonthly: 888,
  debtRedirectStartYear: 2027,
  debtRedirectStartMonth: 9,
  kateriAge: 55,
  kateriRetireAge: 62,
  kateriSalary: 113000,
  kateriOpers: 328948.74,
  kateriDeferredComp: 35447.45,
  kateriDcMonthly: 150,
  kateriPensionMonthly: 2900,
  socialSecurityMonthly: 3500,
  returnRate: 0.08,
};

function redirectDollars(year: number, monthly: number, startYear: number, startMonth: number) {
  if (!monthly) return 0;
  if (year > startYear) return monthly * 12;
  if (year === startYear) return monthly * (13 - startMonth);
  return 0;
}

export function runEngine(i: EngineInputs): YearRow[] {
  const rows: YearRow[] = [];
  const finalAge = Math.max(75, i.lymanRetireAge + 10);
  const years = finalAge - i.lymanAge;

  let lyman = i.lymanBalance;
  let dc = i.kateriDeferredComp;
  let opers = i.kateriOpers;
  let annuitized = 0;
  let salary = i.lymanSalary;
  const r = i.returnRate;

  for (let n = 0; n <= years; n++) {
    const year = i.baseYear + n;
    const lymanAge = i.lymanAge + n;
    const kateriAge = i.kateriAge + n;
    if (n > 0) salary = salary * (1 + i.salaryRaise);

    const lymanWorking = lymanAge < i.lymanRetireAge;
    const kateriWorking = kateriAge < i.kateriRetireAge;

    // Contributions
    let contrib = 0;
    let lymanContrib = 0;
    let dcContrib = 0;
    if (lymanWorking && n > 0) {
      lymanContrib =
        salary * (i.lymanEmployeePct + i.lymanEmployerPct) +
        redirectDollars(year, i.marketingRedirectMonthly, i.marketingRedirectStartYear, i.marketingRedirectStartMonth) +
        redirectDollars(year, i.debtRedirectMonthly, i.debtRedirectStartYear, i.debtRedirectStartMonth);
    }
    if (kateriWorking && n > 0) dcContrib = i.kateriDcMonthly * 12;
    contrib = lymanContrib + dcContrib;

    // Growth (half-year convention on new contributions)
    const lymanGrowth = n === 0 ? 0 : lyman * r + lymanContrib * (r / 2);
    const dcGrowth = n === 0 ? 0 : dc * r + dcContrib * (r / 2);
    const opersGrowth = n === 0 || !kateriWorking ? 0 : opers * r;

    lyman += lymanContrib + lymanGrowth;
    dc += dcContrib + dcGrowth;
    opers += opersGrowth;

    // OPERS converts to pension income at Kateri's retirement age
    if (!kateriWorking && opers > 0) {
      annuitized = opers;
      opers = 0;
    }

    const phase: Phase = !lymanWorking ? 'preservation' : kateriWorking ? 'accumulation' : 'transition';
    const pensionIncome = !kateriWorking ? i.kateriPensionMonthly * 12 : 0;
    const ssIncome = !lymanWorking ? i.socialSecurityMonthly * 12 : 0;
    const householdAssets = lyman + dc + opers;

    rows.push({
      year,
      lymanAge,
      kateriAge,
      phase,
      lymanBalance: lyman,
      kateriDc: dc,
      kateriOpers: opers,
      opersAnnuitized: annuitized,
      householdAssets,
      contributions: contrib,
      growth: lymanGrowth + dcGrowth + opersGrowth,
      pensionIncome,
      socialSecurityIncome: ssIncome,
      guaranteedIncome: pensionIncome + ssIncome,
      withdrawalRate: 0,
    });
  }

  return rows;
}

export function milestones(rows: YearRow[], i: EngineInputs) {
  const at = (age: number) => rows.find((r) => r.lymanAge === age) ?? rows[rows.length - 1];
  const kateriRetireRow =
    rows.find((r) => r.kateriAge === i.kateriRetireAge) ?? rows[rows.length - 1];
  return [
    { key: 'kateri', label: `Kateri Retires (Age ${i.kateriRetireAge})`, row: kateriRetireRow },
    { key: 'lyman', label: `Lyman Retires (Age ${i.lymanRetireAge})`, row: at(i.lymanRetireAge) },
    { key: '80', label: 'Lyman Age 80', row: at(80) },
    { key: '75', label: 'Lyman Age 75', row: at(75) },
  ];
}

export function crossover(rows: YearRow[], rate: number) {
  const current = rows[0];
  const nextYear = rows[1] ?? rows[0];
  const annualContrib = nextYear.contributions;
  const target = rate > 0 ? annualContrib / rate : 0;
  const capital = current.householdAssets;
  const growth = capital * rate;
  const crossYear = rows.find((r) => r.growth >= r.contributions && r.contributions > 0);
  return {
    annualContrib,
    target,
    capital,
    growth,
    progress: target > 0 ? Math.min(1, capital / target) : 0,
    crossYear: crossYear?.year ?? null,
    crossAge: crossYear?.lymanAge ?? null,
    achieved: growth >= annualContrib,
  };
}

export function ruleOf72(capital: number, rate: number) {
  const yearsToDouble = rate > 0 ? 72 / (rate * 100) : 0;
  return {
    yearsToDouble,
    doubles: [1, 2, 3].map((d) => ({
      n: d,
      value: capital * Math.pow(2, d),
      years: yearsToDouble * d,
    })),
  };
}

export const SCENARIOS = [
  { rate: 0.06, label: 'Conservative', color: '#64748B' },
  { rate: 0.08, label: 'Primary Planning', color: '#1F7A5A' },
  { rate: 0.10, label: 'Historical Equity', color: '#C9A227' },
];
