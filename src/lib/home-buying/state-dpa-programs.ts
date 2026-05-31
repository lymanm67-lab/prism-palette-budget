// Curated first-time-buyer & down-payment assistance programs.
// Sourced from each state's Housing Finance Agency. Always confirm on the official site.

export interface DpaProgram {
  name: string;
  agency: string;
  type: 'grant' | 'forgivable_loan' | 'deferred_loan' | 'second_mortgage' | 'tax_credit';
  maxAssistance: string;
  incomeLimit?: string;
  ficoMin?: number;
  url: string;
  notes?: string;
}

export const FEDERAL_PROGRAMS: DpaProgram[] = [
  { name: 'FHA Loan (3.5% down)', agency: 'HUD / FHA', type: 'second_mortgage', maxAssistance: 'N/A — low down payment', ficoMin: 580, url: 'https://www.hud.gov/buying/loans', notes: 'Most popular first-time buyer loan.' },
  { name: 'VA Loan (0% down)', agency: 'Dept. of Veterans Affairs', type: 'second_mortgage', maxAssistance: '0% down, no PMI', url: 'https://www.va.gov/housing-assistance/home-loans/', notes: 'Veterans, active duty, surviving spouses.' },
  { name: 'USDA Rural Loan (0% down)', agency: 'USDA', type: 'second_mortgage', maxAssistance: '0% down', incomeLimit: 'Varies by county', url: 'https://www.rd.usda.gov/programs-services/single-family-housing-programs', notes: 'Eligible rural & suburban areas.' },
  { name: 'HomeReady', agency: 'Fannie Mae', type: 'second_mortgage', maxAssistance: '3% down', incomeLimit: '≤80% AMI', url: 'https://singlefamily.fanniemae.com/originating-underwriting/mortgage-products/homeready-mortgage', notes: 'Reduced PMI, flexible income sources.' },
  { name: 'Home Possible', agency: 'Freddie Mac', type: 'second_mortgage', maxAssistance: '3% down', incomeLimit: '≤80% AMI', url: 'https://sf.freddiemac.com/working-with-us/affordable-lending/home-possible', notes: 'Designed for very low-to-moderate income.' },
  { name: 'Good Neighbor Next Door', agency: 'HUD', type: 'forgivable_loan', maxAssistance: '50% off list price', url: 'https://www.hud.gov/program_offices/housing/sfh/reo/goodn/gnndabot', notes: 'Teachers, firefighters, EMTs, police in revitalization areas.' },
];

// 2–4 curated programs per state. URLs point to the state HFA homepage where users
// can confirm current limits and apply. Not exhaustive — always check the agency site.
export const STATE_PROGRAMS: Record<string, DpaProgram[]> = {
  AL: [{ name: 'Step Up', agency: 'AHFA', type: 'second_mortgage', maxAssistance: 'Up to 4% DPA', ficoMin: 640, url: 'https://www.ahfa.com/homebuyers' }],
  AK: [{ name: 'First Home Limited', agency: 'AHFC', type: 'second_mortgage', maxAssistance: 'Reduced rate', url: 'https://www.ahfc.us/buyers' }],
  AZ: [
    { name: 'HOME Plus', agency: 'AZ IDA', type: 'forgivable_loan', maxAssistance: 'Up to 5% DPA', ficoMin: 640, url: 'https://www.azhousing.gov/' },
    { name: 'Pathway to Purchase', agency: 'ADOH', type: 'forgivable_loan', maxAssistance: 'Up to 10% (max $20k)', url: 'https://housing.az.gov/' },
  ],
  AR: [{ name: 'ADFA Move-Up', agency: 'ADFA', type: 'second_mortgage', maxAssistance: 'Up to $15k DPA', url: 'https://adfa.arkansas.gov/homeownership/' }],
  CA: [
    { name: 'CalHFA MyHome Assistance', agency: 'CalHFA', type: 'deferred_loan', maxAssistance: 'Up to 3.5% of price', ficoMin: 660, url: 'https://www.calhfa.ca.gov/homebuyer/' },
    { name: 'Forgivable Equity Builder', agency: 'CalHFA', type: 'forgivable_loan', maxAssistance: 'Up to 10%', url: 'https://www.calhfa.ca.gov/homebuyer/programs/feb.htm' },
  ],
  CO: [
    { name: 'CHFA FirstStep', agency: 'CHFA', type: 'second_mortgage', maxAssistance: 'Up to 4% DPA grant', ficoMin: 620, url: 'https://www.chfainfo.com/homeownership' },
  ],
  CT: [{ name: 'Time To Own', agency: 'CHFA', type: 'forgivable_loan', maxAssistance: 'Up to $50k', url: 'https://www.chfa.org/homebuyers/' }],
  DE: [{ name: 'Welcome Home', agency: 'DSHA', type: 'second_mortgage', maxAssistance: 'Up to $12k', url: 'https://www.destatehousing.com/homebuyers' }],
  DC: [{ name: 'HPAP', agency: 'DHCD', type: 'deferred_loan', maxAssistance: 'Up to $202k', url: 'https://dhcd.dc.gov/service/home-purchase-assistance-program-hpap' }],
  FL: [
    { name: 'Florida Assist', agency: 'Florida Housing', type: 'deferred_loan', maxAssistance: 'Up to $10k', ficoMin: 640, url: 'https://www.floridahousing.org/programs/homebuyer-overview-page' },
    { name: 'Hometown Heroes', agency: 'Florida Housing', type: 'forgivable_loan', maxAssistance: 'Up to 5% (max $35k)', url: 'https://www.floridahousing.org/hometownheroes' },
  ],
  GA: [{ name: 'Georgia Dream', agency: 'DCA', type: 'second_mortgage', maxAssistance: 'Up to $10k DPA', ficoMin: 640, url: 'https://www.dca.ga.gov/safe-affordable-housing/homeownership/georgia-dream' }],
  HI: [{ name: 'HHFDC Programs', agency: 'HHFDC', type: 'second_mortgage', maxAssistance: 'Varies', url: 'https://dbedt.hawaii.gov/hhfdc/' }],
  ID: [{ name: 'Idaho Housing First Loan', agency: 'IHFA', type: 'second_mortgage', maxAssistance: 'Up to 10k DPA', url: 'https://www.idahohousing.com/' }],
  IL: [
    { name: 'IHDAccess Forgivable', agency: 'IHDA', type: 'forgivable_loan', maxAssistance: '4% (max $6k)', ficoMin: 640, url: 'https://www.ihda.org/homeownership/' },
    { name: 'Smart Buy', agency: 'IHDA', type: 'forgivable_loan', maxAssistance: 'Up to $40k for student loan payoff', url: 'https://www.ihda.org/homeownership/smartbuy/' },
  ],
  IN: [{ name: 'First Place', agency: 'IHCDA', type: 'second_mortgage', maxAssistance: 'Up to 6% DPA', ficoMin: 640, url: 'https://www.in.gov/ihcda/homebuyers/' }],
  IA: [{ name: 'FirstHome Plus', agency: 'IFA', type: 'grant', maxAssistance: '$2,500 grant', url: 'https://www.iowafinance.com/homeownership/' }],
  KS: [{ name: 'First Time Homebuyer', agency: 'KHRC', type: 'forgivable_loan', maxAssistance: '15–20% DPA', url: 'https://kshousingcorp.org/' }],
  KY: [{ name: 'KHC Down Payment Assistance', agency: 'KHC', type: 'second_mortgage', maxAssistance: 'Up to $10k', ficoMin: 620, url: 'https://www.kyhousing.org/Home-Buyers/' }],
  LA: [{ name: 'Market Rate GNMA', agency: 'LHC', type: 'second_mortgage', maxAssistance: 'Up to 4% DPA', url: 'https://www.lhc.la.gov/homebuyer-programs' }],
  ME: [{ name: 'First Home Loan', agency: 'MaineHousing', type: 'second_mortgage', maxAssistance: 'Up to $5k DPA', url: 'https://www.mainehousing.org/programs-services/homebuyer' }],
  MD: [{ name: 'Maryland Mortgage Program', agency: 'DHCD', type: 'second_mortgage', maxAssistance: 'Varies — DPA & partner match', ficoMin: 640, url: 'https://mmp.maryland.gov/' }],
  MA: [{ name: 'MassHousing Down Payment', agency: 'MassHousing', type: 'second_mortgage', maxAssistance: 'Up to $50k (Boston: $30k)', ficoMin: 640, url: 'https://www.masshousing.com/home-ownership' }],
  MI: [{ name: 'MI Home Loan', agency: 'MSHDA', type: 'second_mortgage', maxAssistance: 'Up to $10k DPA', ficoMin: 640, url: 'https://www.michigan.gov/mshda/homeownership' }],
  MN: [{ name: 'Start Up', agency: 'Minnesota Housing', type: 'second_mortgage', maxAssistance: 'Up to $18k DPA', url: 'https://www.mnhousing.gov/sites/np/homebuyers' }],
  MS: [{ name: 'Smart Solution', agency: 'MS Home Corp', type: 'second_mortgage', maxAssistance: 'Up to $6k DPA', url: 'https://www.mshomecorp.com/' }],
  MO: [{ name: 'First Place', agency: 'MHDC', type: 'forgivable_loan', maxAssistance: '4% DPA', url: 'https://www.mhdc.com/' }],
  MT: [{ name: 'Regular Bond Program', agency: 'Montana Housing', type: 'second_mortgage', maxAssistance: 'Below-market rate', url: 'https://housing.mt.gov/Homeownership' }],
  NE: [{ name: 'Homebuyer Assistance', agency: 'NIFA', type: 'second_mortgage', maxAssistance: 'Up to 5% DPA', url: 'https://www.nifa.org/homebuyers' }],
  NV: [{ name: 'Home Is Possible', agency: 'NV Housing', type: 'forgivable_loan', maxAssistance: 'Up to 5% DPA', url: 'https://homeispossiblenv.org/' }],
  NH: [{ name: 'Home Flex Plus', agency: 'NH Housing', type: 'second_mortgage', maxAssistance: 'Up to 4% DPA', url: 'https://www.nhhfa.org/homeownership/' }],
  NJ: [{ name: 'First-Time Homebuyer Mortgage', agency: 'NJHMFA', type: 'forgivable_loan', maxAssistance: 'Up to $15k DPA', url: 'https://nj.gov/dca/hmfa/homebuyer/' }],
  NM: [{ name: 'FirstHome', agency: 'MFA', type: 'forgivable_loan', maxAssistance: 'Up to $25k DPA', url: 'https://housingnm.org/homebuyers' }],
  NY: [
    { name: 'Achieving the Dream', agency: 'SONYMA', type: 'second_mortgage', maxAssistance: 'Up to $15k DPA', url: 'https://hcr.ny.gov/sonyma' },
  ],
  NC: [{ name: 'NC Home Advantage', agency: 'NCHFA', type: 'second_mortgage', maxAssistance: 'Up to 3% DPA', ficoMin: 640, url: 'https://www.nchfa.com/home-buyers' }],
  ND: [{ name: 'FirstHome', agency: 'NDHFA', type: 'second_mortgage', maxAssistance: 'Up to 3% DPA', url: 'https://www.ndhfa.org/' }],
  OH: [{ name: 'Your Choice DPA', agency: 'OHFA', type: 'forgivable_loan', maxAssistance: '2.5% or 5% DPA', ficoMin: 640, url: 'https://myohiohome.org/' }],
  OK: [{ name: 'Homebuyer Down Payment Assistance', agency: 'OHFA', type: 'forgivable_loan', maxAssistance: '3.5% DPA', url: 'https://www.ohfa.org/' }],
  OR: [{ name: 'Oregon Bond RateAdvantage', agency: 'OHCS', type: 'second_mortgage', maxAssistance: 'Up to 3% DPA', url: 'https://www.oregon.gov/ohcs/homeownership/' }],
  PA: [{ name: 'Keystone Advantage', agency: 'PHFA', type: 'second_mortgage', maxAssistance: 'Up to $10k DPA', url: 'https://www.phfa.org/' }],
  RI: [{ name: 'FirstGenHomeRI', agency: 'RIHousing', type: 'grant', maxAssistance: '$25k DPA grant', url: 'https://www.rihousing.com/' }],
  SC: [{ name: 'SC Housing Homebuyer', agency: 'SC Housing', type: 'forgivable_loan', maxAssistance: 'Up to $8k DPA', url: 'https://www.schousing.com/Home/HomebuyerProgram' }],
  SD: [{ name: 'First-time Homebuyer', agency: 'SDHDA', type: 'second_mortgage', maxAssistance: 'Up to 5% DPA', url: 'https://www.sdhda.org/homeownership/' }],
  TN: [{ name: 'Great Choice Plus', agency: 'THDA', type: 'forgivable_loan', maxAssistance: 'Up to $6k or 6%', ficoMin: 640, url: 'https://thda.org/homebuyers' }],
  TX: [
    { name: 'My First Texas Home', agency: 'TDHCA', type: 'second_mortgage', maxAssistance: 'Up to 5% DPA', ficoMin: 620, url: 'https://www.tdhca.state.tx.us/homeownership/fthb/' },
    { name: 'TSAHC Home Sweet Texas', agency: 'TSAHC', type: 'forgivable_loan', maxAssistance: 'Up to 5% DPA grant', url: 'https://www.tsahc.org/' },
  ],
  UT: [{ name: 'FirstHome', agency: 'Utah Housing', type: 'second_mortgage', maxAssistance: 'Up to 6% DPA', url: 'https://utahhousingcorp.org/' }],
  VT: [{ name: 'ASSIST Down Payment', agency: 'VHFA', type: 'second_mortgage', maxAssistance: 'Up to $15k', url: 'https://www.vhfa.org/homebuyers' }],
  VA: [{ name: 'Down Payment Assistance Grant', agency: 'Virginia Housing', type: 'grant', maxAssistance: '2–2.5% DPA grant', url: 'https://www.virginiahousing.com/homebuyers' }],
  WA: [{ name: 'Home Advantage', agency: 'WSHFC', type: 'second_mortgage', maxAssistance: 'Up to 5% DPA', url: 'https://www.wshfc.org/buyers/' }],
  WV: [{ name: 'Homeownership Program', agency: 'WV Housing', type: 'second_mortgage', maxAssistance: 'Up to $10k DPA', url: 'https://www.wvhdf.com/homebuyers' }],
  WI: [{ name: 'WHEDA Advantage', agency: 'WHEDA', type: 'second_mortgage', maxAssistance: 'Up to $7k DPA', url: 'https://www.wheda.com/home-buyers' }],
  WY: [{ name: 'WCDA First Time Homebuyer', agency: 'WCDA', type: 'second_mortgage', maxAssistance: 'Up to $15k DPA', url: 'https://www.wyomingcda.com/' }],
};
