# Montgomery Five-Bucket Wealth Plan

A new page at Planning -> Five-Bucket Wealth Plan (`/planning/five-bucket`). It uses the app's existing dark navy, teal and orange look and switches to white only when printed.

## Your settings
- Take-home pay $4,363.52, plus an extra $49 retirement contribution (you can edit the actual pay reduction). Regular expenses $2,541.52, which leaves **$1,773 surplus**.
- Vacation: **$416.67/mo**. The amounts are rounded so the year adds up to exactly $5,000.
- Starting emergency savings: **$900**, marked as "entered by you."
- Base retirement stays at $500/mo. Current HSA and employer money stay separate and are never taken out twice.

## The five buckets (these never change)
Retirement & HSA, Deductibles & Emergency Fund, Vacation Fund, Housing Fund, Guilt Free Fund.

## Funding stages
1. Build the reserve to $2,000. All surplus goes to emergency.
2. Keep building to 3 months of expenses ($7,624.56). The $2,000 counts toward this, never on top of it.
3. Then split the surplus: 50% to investing ($886.50), Housing 10% ($177.30), Guilt Free 5% ($88.65), Vacation $416.67, and emergency gets what's left ($203.88).
4. Keep building to 6 months of expenses ($15,249.12).
5. After that, the extra goes toward Roth IRA and HSA limits that you enter. The planner won't make up any limits.

## Five sections on the page
1. **Money flow:** an animated flow from pay to surplus to the five buckets. Click a bucket to see its rule, balance, target and progress.
2. **Allocation studio:** sliders and inputs. Dollars and percentages show side by side. If the buckets add up to more than you have, it shows the exact shortfall. It never quietly cuts another bucket.
3. **Emergency roadmap:** your three milestones with progress, the amount still needed and estimated finish dates.
4. **Projection explorer:** 12, 24 and 36 months for all five buckets, with planned vacation and fun spending taken out. You get charts plus a table you can read without hovering.
5. **Funding details:** a month-by-month table showing the starting balance, money in, money out, interest, ending balance and current stage.

## Options
- **Cash interest rate (APY):** you can edit it. The 4% example is labeled hypothetical. Investment growth starts at 0%.
- **Quarterly consulting income** of $1,925 (Mar/Jun/Sep/Dec), with a set-aside for taxes you can edit. It's off until you turn it on.
- **Saved scenarios:** kept in this browser, with a compare-to-your-baseline view, a Reset button, a spreadsheet download and a print view.

## Links
Cards linking to this planner will be added on Emergency Fund & Liquidity, Travel Fund and Home Buying.

## Technical details
- Pure engine `src/lib/fiveBucket/engine.ts` (integer cents, stage transitions capped at milestones, vacation annual true-up, consulting income routing) + vitest covering all 12 acceptance checks.
- Page `src/pages/FiveBucketPlan.tsx` with section components in `src/components/fiveBucket/`; Recharts; localStorage scenarios; reduced-motion respected.
- Route + nav entry; link cards in Reserves, TravelFund, HomeBuyingChecklist.
- Save vacation $416.67 and starting $900 to memory.
