// Hard-coded Akron, OH neighborhood tiers (per user spec).
// Scores are 0–100 in each dimension. Weights live in match-engine.ts.

export type NeighborhoodTier = 1 | 2 | 3;

export interface Neighborhood {
  id: string;
  name: string;
  tier: NeighborhoodTier;
  stars: number;                // 3–5
  zips?: string[];
  strengths: string[];
  cautions?: string[];
  scores: {
    affordability: number;
    appreciation: number;
    propertyTax: number;        // higher = cheaper taxes
    insurance: number;          // higher = cheaper insurance
    stability: number;
    ownerOccupancy: number;
    crime: number;              // higher = safer
    schools: number;
    commute: number;            // higher = shorter avg commute to downtown Akron
    amenities: number;          // shopping + healthcare
    resale: number;
  };
  medianPrice: number;
  avgPropertyTaxPct: number;    // effective annual %
  walkability: number;          // 0-100
  parks: number;                // 0-100
  dining: number;               // 0-100
  avgCommuteMin: number;
}

export const AKRON_NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'ellet',
    name: 'Ellet',
    tier: 1,
    stars: 5,
    zips: ['44312', '44305'],
    strengths: [
      'Large inventory of split-level and bi-level homes',
      'Built primarily between the 1960s and 1980s',
      'Strong owner occupancy',
      'Good resale potential',
      'Convenient access to Route 224, I-76, and Downtown Akron',
      'Frequently priced within the target budget',
    ],
    scores: {
      affordability: 88, appreciation: 72, propertyTax: 60, insurance: 78,
      stability: 82, ownerOccupancy: 85, crime: 78, schools: 68,
      commute: 82, amenities: 78, resale: 82,
    },
    medianPrice: 165000, avgPropertyTaxPct: 1.85, walkability: 42, parks: 70, dining: 55, avgCommuteMin: 15,
  },
  {
    id: 'firestone-park',
    name: 'Firestone Park',
    tier: 2,
    stars: 4,
    zips: ['44301'],
    strengths: ['Affordable pricing', 'Stable neighborhood', 'Good long-term value', 'Lower monthly housing costs'],
    scores: {
      affordability: 92, appreciation: 62, propertyTax: 65, insurance: 76,
      stability: 76, ownerOccupancy: 74, crime: 68, schools: 60,
      commute: 84, amenities: 70, resale: 70,
    },
    medianPrice: 135000, avgPropertyTaxPct: 1.72, walkability: 55, parks: 72, dining: 50, avgCommuteMin: 12,
  },
  {
    id: 'springfield-township',
    name: 'Springfield Township',
    tier: 2,
    stars: 4,
    zips: ['44319', '44312'],
    strengths: ['Larger lots', 'Quiet residential streets', 'Well-maintained neighborhoods', 'Good appreciation potential'],
    scores: {
      affordability: 78, appreciation: 78, propertyTax: 55, insurance: 78,
      stability: 84, ownerOccupancy: 88, crime: 82, schools: 72,
      commute: 74, amenities: 65, resale: 80,
    },
    medianPrice: 195000, avgPropertyTaxPct: 2.05, walkability: 28, parks: 74, dining: 48, avgCommuteMin: 20,
  },
  {
    id: 'goodyear-heights',
    name: 'Goodyear Heights',
    tier: 2,
    stars: 4,
    zips: ['44305'],
    strengths: ['Mature neighborhoods', 'Larger yards', 'Affordable housing', 'Good value for first-time buyers'],
    scores: {
      affordability: 90, appreciation: 66, propertyTax: 62, insurance: 76,
      stability: 74, ownerOccupancy: 76, crime: 70, schools: 62,
      commute: 82, amenities: 68, resale: 72,
    },
    medianPrice: 140000, avgPropertyTaxPct: 1.78, walkability: 48, parks: 78, dining: 45, avgCommuteMin: 14,
  },
  {
    id: 'tallmadge',
    name: 'Tallmadge',
    tier: 3,
    stars: 4,
    strengths: ['Search estate sales, price reductions', 'Homes needing cosmetic updates', 'Older split levels'],
    cautions: ['Higher entry prices — monitor for reductions'],
    scores: {
      affordability: 62, appreciation: 76, propertyTax: 50, insurance: 78,
      stability: 88, ownerOccupancy: 86, crime: 86, schools: 82,
      commute: 76, amenities: 74, resale: 84,
    },
    medianPrice: 245000, avgPropertyTaxPct: 2.15, walkability: 38, parks: 76, dining: 60, avgCommuteMin: 18,
  },
  {
    id: 'mogadore',
    name: 'Mogadore',
    tier: 3,
    stars: 4,
    strengths: ['Low inventory', 'Higher quality homes', 'Long-term ownership'],
    cautions: ['Few listings hit the market — patience required'],
    scores: {
      affordability: 68, appreciation: 74, propertyTax: 58, insurance: 76,
      stability: 90, ownerOccupancy: 90, crime: 84, schools: 78,
      commute: 68, amenities: 60, resale: 80,
    },
    medianPrice: 210000, avgPropertyTaxPct: 1.92, walkability: 30, parks: 68, dining: 42, avgCommuteMin: 22,
  },
  {
    id: 'west-akron',
    name: 'West Akron',
    tier: 3,
    stars: 3,
    strengths: ['Character homes with historic appeal', 'Highland Square amenities'],
    cautions: ['Evaluate street-by-street', 'Verify property condition, taxes, and resale potential'],
    scores: {
      affordability: 74, appreciation: 68, propertyTax: 55, insurance: 74,
      stability: 65, ownerOccupancy: 62, crime: 58, schools: 60,
      commute: 80, amenities: 82, resale: 68,
    },
    medianPrice: 175000, avgPropertyTaxPct: 2.00, walkability: 68, parks: 78, dining: 78, avgCommuteMin: 10,
  },
];

export const TIER_META = {
  1: { label: 'Excellent Match', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  2: { label: 'Very Good Match', color: 'text-prism-teal', bg: 'bg-prism-teal/10', border: 'border-prism-teal/30' },
  3: { label: 'Monitor Opportunities', color: 'text-prism-amber', bg: 'bg-prism-amber/10', border: 'border-prism-amber/30' },
} as const;
