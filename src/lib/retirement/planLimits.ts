// IRS plan limits — 2025 baseline with assumed +2% COLA forward.
// Estimates only; flagged as such in UI.

const BASE_YEAR = 2025;
const COLA = 0.02;

const BASE_2025 = {
  // 402(g) employee deferral limit (applies separately to 403(b)/TDA and 457(b))
  tda_402g: 23500,
  // 457(b) governmental plan limit (separate)
  govt_457b: 23500,
  // HSA
  hsa_self: 4300,
  hsa_family: 8550,
};

function inflate(base: number, year: number): number {
  if (year <= BASE_YEAR) return base;
  return Math.round(base * Math.pow(1 + COLA, year - BASE_YEAR));
}

export function getPlanLimits(year: number) {
  return {
    year,
    tda_402g: inflate(BASE_2025.tda_402g, year),
    govt_457b: inflate(BASE_2025.govt_457b, year),
    hsa_self: inflate(BASE_2025.hsa_self, year),
    hsa_family: inflate(BASE_2025.hsa_family, year),
    isEstimate: year > BASE_YEAR,
  };
}

export type PlanLimits = ReturnType<typeof getPlanLimits>;
