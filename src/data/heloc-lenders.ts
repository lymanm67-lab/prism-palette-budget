// 1st-lien HELOC lender directory. Coverage is a best-effort snapshot — always
// verify current availability, 1st-position eligibility, and rates directly with
// the lender before applying.

export type HelocLender = {
  name: string;
  type: 'Credit Union' | 'Bank' | 'Fintech' | 'Broker / Wholesale';
  url: string;
  hq?: string;
  states: 'nationwide' | string[]; // USPS 2-letter codes
  notes: string;
  productName?: string;
};

export const HELOC_LENDERS: HelocLender[] = [
  {
    name: 'Quorum Federal Credit Union',
    type: 'Credit Union',
    url: 'https://www.quorumfcu.org/borrow/first-lien-heloc/',
    hq: 'Purchase, NY',
    states: 'nationwide',
    productName: 'First Lien HELOC',
    notes: 'One of the most established true 1st-lien HELOC products. Available in all 50 states via broker channel. Manual underwriting to Fannie Mae guidelines.',
  },
  {
    name: 'Andrews Federal Credit Union',
    type: 'Credit Union',
    url: 'https://www.andrewsfcu.org/borrow/home-equity/',
    hq: 'Suitland, MD',
    states: 'nationwide',
    productName: 'First Lien HELOC',
    notes: 'Membership open nationwide. Offers 1st and 2nd lien HELOCs with competitive intro rates.',
  },
  {
    name: 'Signature Federal Credit Union',
    type: 'Credit Union',
    url: 'https://www.signaturefcu.org/loans/home-equity/',
    hq: 'Alexandria, VA',
    states: 'nationwide',
    productName: '1st Lien HELOC',
    notes: 'Nationwide membership eligibility through American Consumer Council. True 1st-lien product.',
  },
  {
    name: 'CMG Financial — All In One Loan',
    type: 'Broker / Wholesale',
    url: 'https://www.cmgfi.com/consumer/all-in-one-loan',
    hq: 'San Ramon, CA',
    states: 'nationwide',
    productName: 'All In One Loan (AIO)',
    notes: 'Flagship offset-mortgage / 1st-lien HELOC hybrid. Available through mortgage brokers nationwide (except NY).',
  },
  {
    name: 'Northpointe Bank',
    type: 'Bank',
    url: 'https://www.northpointe.com/mortgage/home-equity/',
    hq: 'Grand Rapids, MI',
    states: 'nationwide',
    productName: 'HELOC',
    notes: 'Bank-direct HELOC with 1st and 2nd lien options. Digital application.',
  },
  {
    name: 'Hitch',
    type: 'Fintech',
    url: 'https://www.hitch.com',
    hq: 'Austin, TX',
    states: ['CA', 'CO', 'CT', 'FL', 'GA', 'IL', 'IN', 'MI', 'NC', 'NJ', 'OH', 'OR', 'PA', 'SC', 'TN', 'TX', 'UT', 'VA', 'WA', 'WI'],
    productName: 'HELOC',
    notes: 'Digital-first HELOC. Confirm 1st-lien eligibility during application — often positioned as 2nd-lien.',
  },
  {
    name: 'Aven',
    type: 'Fintech',
    url: 'https://www.aven.com',
    hq: 'Campbell, CA',
    states: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'FL', 'GA', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MI', 'MN', 'MS', 'MO', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NC', 'OH', 'OK', 'OR', 'PA', 'SC', 'SD', 'TN', 'UT', 'VA', 'WA', 'WI', 'WY'],
    productName: 'Home Equity Card',
    notes: 'Credit-card-style HELOC. Fast digital funding. Primarily 2nd-lien; ask about 1st-lien options.',
  },
  {
    name: 'Figure',
    type: 'Fintech',
    url: 'https://www.figure.com/home-equity-line/',
    hq: 'San Francisco, CA',
    states: ['AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'IL', 'IN', 'KS', 'KY', 'LA', 'ME', 'MD', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NC', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'TN', 'VA', 'WA', 'WI', 'WY'],
    productName: 'Figure HELOC',
    notes: 'Blockchain-backed HELOC, 5-day funding. Fixed-rate style. Typically 2nd-lien; verify 1st-lien.',
  },
  {
    name: 'Truliant Federal Credit Union',
    type: 'Credit Union',
    url: 'https://www.truliantfcu.org/borrow/home-equity',
    hq: 'Winston-Salem, NC',
    states: ['NC', 'SC', 'TN', 'VA'],
    productName: 'HELOC',
    notes: 'Regional credit union with 1st and 2nd lien HELOCs.',
  },
  {
    name: 'GTE Financial',
    type: 'Credit Union',
    url: 'https://www.gtefinancial.org/loans/home-loans/heloc',
    hq: 'Tampa, FL',
    states: ['FL'],
    productName: 'HELOC',
    notes: 'Florida credit union. Offers 1st-lien HELOC to FL residents.',
  },
  {
    name: 'Redwood Credit Union',
    type: 'Credit Union',
    url: 'https://www.redwoodcu.org/heloc',
    hq: 'Santa Rosa, CA',
    states: ['CA'],
    productName: 'HELOC',
    notes: 'Northern California credit union.',
  },
  {
    name: 'Third Federal Savings & Loan',
    type: 'Bank',
    url: 'https://www.thirdfederal.com/heloc',
    hq: 'Cleveland, OH',
    states: ['CA', 'CO', 'FL', 'KY', 'MD', 'NC', 'NJ', 'OH', 'PA', 'TN', 'VA', 'DC'],
    productName: 'HELOC',
    notes: 'Portfolio lender known for low HELOC rates.',
  },
  {
    name: 'PenFed Credit Union',
    type: 'Credit Union',
    url: 'https://www.penfed.org/home-equity-line-of-credit',
    hq: 'McLean, VA',
    states: 'nationwide',
    productName: 'HELOC',
    notes: 'Membership open to anyone. Verify 1st-lien eligibility with a loan officer.',
  },
  {
    name: 'Navy Federal Credit Union',
    type: 'Credit Union',
    url: 'https://www.navyfederal.org/loans-cards/home-equity.html',
    hq: 'Vienna, VA',
    states: 'nationwide',
    productName: 'HELOC / Fixed-Rate Equity Loan',
    notes: 'Military-affiliated membership. High CLTV limits.',
  },
  {
    name: 'Bethpage Federal Credit Union',
    type: 'Credit Union',
    url: 'https://www.bethpagefcu.com/borrow/home-loans/heloc',
    hq: 'Bethpage, NY',
    states: 'nationwide',
    productName: 'HELOC',
    notes: 'Nationwide membership. Introductory fixed-rate promos.',
  },
];

export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export function lendersForState(stateCode: string | 'all'): HelocLender[] {
  if (stateCode === 'all') return HELOC_LENDERS;
  return HELOC_LENDERS.filter(
    (l) => l.states === 'nationwide' || (Array.isArray(l.states) && l.states.includes(stateCode)),
  );
}
