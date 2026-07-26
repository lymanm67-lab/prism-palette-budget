import { useMemo, useState } from 'react';

const NAVY = '#0B2341';
const GOLD = '#C9A227';
const GREEN = '#1F7A5A';
const SLATE = '#64748B';
const CONTROL_BG = '#F8FAFC';
const CONTROL_BORDER = '#CBD5E1';

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

type Props = {
  lymanStart: number;
  kateriStart: number;
  lymanSalary: number;     // current base salary
  kateriSalary: number;    // current base salary
  baseYear?: number;       // year of "current"
  lymanAgeNow?: number;
};

function project(opts: {
  start: number; salary: number; years: number; contribPct: number; employerPct: number;
  ret: number; raise: number; ageNow: number; baseYear: number;
  /** Extra monthly dollars redirected from freed-up debt payments */
  extraMonthly?: number;
  /** Calendar year the redirect begins */
  extraStartYear?: number;
  /** Month (1-12) the redirect begins in extraStartYear */
  extraStartMonth?: number;
}) {
  const rows: { year: number; age: number; contributions: number; growth: number; balance: number }[] = [];
  let bal = opts.start;
  let sal = opts.salary;
  for (let i = 1; i <= opts.years; i++) {
    sal = i === 1 ? opts.salary : sal * (1 + opts.raise);
    const year = opts.baseYear + i;
    let extra = 0;
    if (opts.extraMonthly && opts.extraStartYear) {
      const startMonth = opts.extraStartMonth ?? 1;
      if (year > opts.extraStartYear) extra = opts.extraMonthly * 12;
      else if (year === opts.extraStartYear) extra = opts.extraMonthly * (13 - startMonth);
    }
    const contrib = sal * (opts.contribPct + opts.employerPct) + extra;
    const growth = bal * opts.ret + contrib * (opts.ret / 2);
    bal = bal + contrib + growth;
    rows.push({ year, age: opts.ageNow + i, contributions: contrib, growth, balance: bal });
  }
  return rows;
}

function Num({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9, color: NAVY, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {label}
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: 62, background: CONTROL_BG, border: `1px solid ${CONTROL_BORDER}`, borderRadius: 4, padding: '2px 4px', fontSize: 11, color: NAVY, fontWeight: 800 }}
        />
        {suffix ? <span style={{ fontSize: 10, color: NAVY, fontWeight: 800 }}>{suffix}</span> : null}
      </span>
    </label>
  );
}

export default function RetirementProjection({
  lymanStart, kateriStart, lymanSalary, kateriSalary, baseYear = 2026, lymanAgeNow = 59,
}: Props) {
  const [ret, setRet] = useState(7);
  const [raise, setRaise] = useState(3);
  const [lymanPct, setLymanPct] = useState(30);
  const [lymanEmp, setLymanEmp] = useState(9);
  const [kateriAge, setKateriAge] = useState(55);
  const [kateriPct, setKateriPct] = useState(10);
  const [kateriEmp, setKateriEmp] = useState(14);

  const [scenario, setScenario] = useState<75 | 85>(75);
  const [debtRedirect, setDebtRedirect] = useState(998); // $888 + $110, both from Sept 2027
  const REDIRECT_START_YEAR = 2027;
  const REDIRECT_START_MONTH = 9;

  const lyman75 = useMemo(() => project({
    start: lymanStart, salary: lymanSalary, years: Math.max(75 - lymanAgeNow, 0),
    contribPct: lymanPct / 100, employerPct: lymanEmp / 100, ret: ret / 100, raise: raise / 100,
    ageNow: lymanAgeNow, baseYear,
    extraMonthly: debtRedirect, extraStartYear: REDIRECT_START_YEAR, extraStartMonth: REDIRECT_START_MONTH,
  }), [lymanStart, lymanSalary, lymanPct, lymanEmp, ret, raise, lymanAgeNow, baseYear, debtRedirect]);

  const lyman85 = useMemo(() => project({
    start: lymanStart, salary: lymanSalary, years: Math.max(85 - lymanAgeNow, 0),
    contribPct: lymanPct / 100, employerPct: lymanEmp / 100, ret: ret / 100, raise: raise / 100,
    ageNow: lymanAgeNow, baseYear,
    extraMonthly: debtRedirect, extraStartYear: REDIRECT_START_YEAR, extraStartMonth: REDIRECT_START_MONTH,
  }), [lymanStart, lymanSalary, lymanPct, lymanEmp, ret, raise, lymanAgeNow, baseYear, debtRedirect]);

  const lyman = scenario === 75 ? lyman75 : lyman85;

  const kateri = useMemo(() => project({
    start: kateriStart, salary: kateriSalary, years: Math.max(62 - kateriAge, 0),
    contribPct: kateriPct / 100, employerPct: kateriEmp / 100, ret: ret / 100, raise: raise / 100,
    ageNow: kateriAge, baseYear,
  }), [kateriStart, kateriSalary, kateriPct, kateriEmp, ret, raise, kateriAge, baseYear]);

  const end = (rows: typeof lyman75) => (rows.length ? rows[rows.length - 1].balance : lymanStart);
  const lyman75End = end(lyman75);
  const lyman85End = end(lyman85);
  const lymanEnd = scenario === 75 ? lyman75End : lyman85End;
  const retireAge = scenario;
  const kateriEnd = kateri.length ? kateri[kateri.length - 1].balance : kateriStart;
  const lymanContrib = lyman.reduce((s, r) => s + r.contributions, 0);
  const kateriContrib = kateri.reduce((s, r) => s + r.contributions, 0);

  const cell: React.CSSProperties = { padding: '3px 6px', fontSize: 10, borderBottom: '1px solid #EEF1F4' };
  const head: React.CSSProperties = { ...cell, fontWeight: 800, color: NAVY, borderBottom: `1.5px solid ${NAVY}`, textTransform: 'uppercase', fontSize: 8.5, letterSpacing: 0.4 };

  const Table = ({ rows, title, tone }: { rows: typeof lyman; title: string; tone: string }) => (
    <div className="wos-card">
      <div style={{ fontWeight: 800, color: tone, fontSize: 11.5, marginBottom: 4 }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th style={head}>Year</th><th style={head}>Age</th><th style={{ ...head, textAlign: 'right' }}>Contributions</th><th style={{ ...head, textAlign: 'right' }}>Growth</th><th style={{ ...head, textAlign: 'right' }}>Balance</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <td style={cell}>{r.year}</td>
              <td style={cell}>{r.age}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{money(r.contributions)}</td>
              <td style={{ ...cell, textAlign: 'right', color: GREEN }}>{money(r.growth)}</td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 800, color: NAVY }}>{money(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '6px 0 10px' }}>
        <Num label="Return" value={ret} onChange={setRet} suffix="%" />
        <Num label="Raise" value={raise} onChange={setRaise} suffix="%" />
        <Num label="Lyman defer" value={lymanPct} onChange={setLymanPct} suffix="%" />
        <Num label="Lyman employer" value={lymanEmp} onChange={setLymanEmp} suffix="%" />
        <Num label="Kateri age now" value={kateriAge} onChange={setKateriAge} />
        <Num label="Kateri defer" value={kateriPct} onChange={setKateriPct} suffix="%" />
        <Num label="Kateri employer" value={kateriEmp} onChange={setKateriEmp} suffix="%" />
        <Num label="Debt redirect /mo" value={debtRedirect} onChange={setDebtRedirect} suffix="$" />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {[75, 85].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setScenario(a as 75 | 85)}
              style={{
                fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
                border: `1px solid ${scenario === a ? NAVY : CONTROL_BORDER}`,
                background: scenario === a ? NAVY : CONTROL_BG,
                color: scenario === a ? '#fff' : NAVY, cursor: 'pointer',
              }}
            >
              Retire @ {a}
            </button>
          ))}
        </div>
      </div>

      <div className="wos-grid3">
        <div
          onClick={() => setScenario(75)}
          style={{ cursor: 'pointer', background: NAVY, color: '#fff', borderRadius: 6, padding: '8px 10px', outline: scenario === 75 ? `2px solid ${GOLD}` : 'none' }}
        >
          <div style={{ fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.8 }}>Scenario A — Lyman @ 75 ({baseYear + Math.max(75 - lymanAgeNow, 0)})</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{money(lyman75End)}</div>
          <div style={{ fontSize: 9, opacity: 0.85 }}>{money(lyman75.reduce((s, r) => s + r.contributions, 0))} contributed</div>
        </div>
        <div
          onClick={() => setScenario(85)}
          style={{ cursor: 'pointer', background: NAVY, color: '#fff', borderRadius: 6, padding: '8px 10px', outline: scenario === 85 ? `2px solid ${GOLD}` : 'none' }}
        >
          <div style={{ fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.8 }}>Scenario B — Lyman @ 85 ({baseYear + Math.max(85 - lymanAgeNow, 0)})</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{money(lyman85End)}</div>
          <div style={{ fontSize: 9, opacity: 0.85 }}>+{money(lyman85End - lyman75End)} vs. retiring at 75</div>
        </div>
        <div style={{ background: NAVY, color: '#fff', borderRadius: 6, padding: '8px 10px', borderLeft: `4px solid ${GOLD}` }}>
          <div style={{ fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase', color: GOLD, fontWeight: 800 }}>Kateri @ 62 ({baseYear + Math.max(62 - kateriAge, 0)})</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{money(kateriEnd)}</div>
          <div style={{ fontSize: 9, opacity: 0.85 }}>{money(kateriContrib)} contributed</div>
        </div>

        <div style={{ background: GREEN, color: '#fff', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.85 }}>Combined at Lyman @ {retireAge}</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{money(lymanEnd + kateriEnd * Math.pow(1 + ret / 100, Math.max((retireAge - lymanAgeNow) - (62 - kateriAge), 0)))}</div>
          <div style={{ fontSize: 9, opacity: 0.85 }}>Kateri's balance compounded, no further contributions after 62</div>
        </div>
      </div>

      <div className="wos-grid2" style={{ marginTop: 10 }}>
        <Table rows={lyman} title={`Lyman Montgomery — to age ${retireAge}`} tone={NAVY} />
        <Table rows={kateri} title={`Kateri Montgomery — to age 62`} tone={NAVY} />
      </div>
      <div style={{ fontSize: 8.5, color: SLATE, marginTop: 6 }}>
        Includes {money(debtRedirect)}/mo of freed-up debt payments ($888 + $110) redirected to Lyman's retirement starting September 2027
        (4 months in 2027, full 12 months thereafter). Assumes {ret}% average annual return, {raise}% annual raises, contributions made evenly through each year (half-year growth credit),
        and no withdrawals before the stated retirement age. Pension and Social Security income are shown separately above.
      </div>
    </div>
  );
}
