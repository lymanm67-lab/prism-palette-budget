import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimInputs {
  startingPrincipal: number;
  horizonYears: number;
  expectedReturn: number;
  returnStdDev: number;
  inflation: number;
  taxRate: number;
  annualDistributionPct: number;
  charitablePct: number;
  additionalContribution: number;
  contributionGrowth: number;
  businessGrowth: number;
  lifeInsuranceProceeds: number;
  generations: number;
  runs?: number;
}

function prng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand: () => number) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function simulate(inputs: SimInputs) {
  const runs = inputs.runs ?? 1000;
  const years = inputs.horizonYears;
  const paths: number[][] = [];
  let totalGiving = 0;
  let preserved = 0;

  for (let r = 0; r < runs; r++) {
    const rand = prng(r * 9301 + 49297);
    let bal = inputs.startingPrincipal;
    let contrib = inputs.additionalContribution;
    const path: number[] = [bal];

    for (let y = 1; y <= years; y++) {
      const z = gaussian(rand);
      const growth = inputs.expectedReturn + inputs.returnStdDev * z;
      bal *= 1 + growth;
      bal -= bal * inputs.taxRate * Math.max(0, growth) * 0.1;
      bal += contrib;
      if (y % 10 === 0) bal += inputs.businessGrowth;
      if (y === 25) bal += inputs.lifeInsuranceProceeds;
      const dist = bal * inputs.annualDistributionPct;
      bal -= dist;
      totalGiving += dist * inputs.charitablePct;
      contrib *= 1 + inputs.contributionGrowth;
      bal = Math.max(0, bal);
      path.push(bal);
    }
    if (bal >= inputs.startingPrincipal) preserved++;
    paths.push(path);
  }

  const meanPath: number[] = new Array(years + 1).fill(0);
  const p10Path: number[] = [];
  const p90Path: number[] = [];
  for (let y = 0; y <= years; y++) {
    const yearVals = paths.map((p) => p[y]).sort((a, b) => a - b);
    meanPath[y] = yearVals.reduce((s, v) => s + v, 0) / runs;
    p10Path.push(yearVals[Math.floor(runs * 0.1)]);
    p90Path.push(yearVals[Math.floor(runs * 0.9)]);
  }

  const nominalFv = meanPath[years];
  const realFactor = Math.pow(1 + inputs.inflation, years);
  const realFv = nominalFv / realFactor;
  const probabilityPreserved = preserved / runs;
  const generationsSupported = Math.min(
    inputs.generations,
    Math.max(1, Math.round((realFv / Math.max(inputs.startingPrincipal, 1)) * inputs.generations * 0.5))
  );

  return {
    nominalFv, realFv, purchasingPowerToday: realFv,
    sustainabilityPct: probabilityPreserved * 100,
    probabilityPreserved, generationsSupported,
    familyImpact: totalGiving / runs,
    meanPath, p10Path, p90Path,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const inputs = (await req.json()) as SimInputs;
    const result = simulate(inputs);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
