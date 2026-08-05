# Set Healthy Life Expectancy to 100+

## Current behavior (verified)

`longevityEstimate` in `src/lib/health/healthEngine.ts` builds the figure as:

```text
78 (base) + weightFactor x 6 + habitFactor x 6 + familyHistoryBonus (targetAge - 90 = 10)
```

Because `weightFactor` and `habitFactor` only reach 1.0 with a full weight loss and a perfect habit score, the number lands around 88 years today and can never exceed 100. The Longevity tab renders it at line 43 of `LongevityTab.tsx` as "Healthy life expectancy — 88.x yrs", which contradicts the 100+ family-history horizon already stated one line above it.

## Change

Rebase the calculation on the family-history target age instead of a population base, so the floor is 100 and strong habits push it above:

```text
healthyLifeExpectancy = targetAge (100) + weightFactor x 4 + habitFactor x 4
```

That yields 100 years at minimum and up to 108 as weight and habit consistency improve — always displayed as 100+.

## Display

- Longevity tab: label the metric "Healthy life expectancy" with the value formatted as `100+ yrs` when the estimate sits at the 100 floor, and the precise figure (e.g. `104.2 yrs`) once habits lift it higher.
- `yearsIndependentLiving` recalculates off the new number automatically, so projected independent years rise accordingly.
- The "Projected through age 100+" medical-savings line and the existing 100+ horizon copy stay consistent with the new floor.

## Technical notes

- Single edit to `longevityEstimate` in `src/lib/health/healthEngine.ts` plus the display formatting in `src/components/health/LongevityTab.tsx`.
- The `targetAge` parameter already defaults to 100, so nothing else calling the function needs to change.
- Remains an educational estimate; the existing "not medical advice" disclaimer stays in place.
