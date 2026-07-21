// Annual Family Wealth Meeting — agenda generator.

export interface MeetingContext {
  legacyWorthScore: number;
  yearOverYearDelta: number;
  majorWealthEvents: string[];
  activeGoals: string[];
}

export function generateAgenda(ctx: MeetingContext): string {
  return `# Annual Family Wealth Meeting — Agenda

## 1. Opening & Family Constitution Review (10 min)
- Read one section of the family constitution aloud
- Reaffirm or amend

## 2. Legacy Worth Report (15 min)
- Current Legacy Worth score: **${ctx.legacyWorthScore}/100**
- Year-over-year change: **${ctx.yearOverYearDelta >= 0 ? "+" : ""}${ctx.yearOverYearDelta.toFixed(1)}%**
- Major wealth events this year:
${ctx.majorWealthEvents.map((e) => `  - ${e}`).join("\n") || "  - (none)"}

## 3. Active Goals Progress (20 min)
${ctx.activeGoals.map((g, i) => `  ${i + 1}. ${g}`).join("\n") || "  - (none)"}

## 4. Next-Generation Financial Education (15 min)
- Skill of the year (budgeting / investing / entrepreneurship / stewardship)
- Assign a "learning captain" — one family member owns the topic

## 5. Trust & Estate Health Check (10 min)
- Beneficiary audit (life insurance, retirement accounts, trust)
- Digital asset inventory review
- Any life events requiring plan updates (marriage, birth, death, move)

## 6. Charitable Giving & Impact (10 min)
- Review last year's giving
- Vote on one new cause to support as a family

## 7. Open Floor & Family Business (15 min)
- Concerns, requests, celebrations
- Anything anyone needs from the family

## 8. Decisions & Next Steps
- Document decisions in the family record
- Set date for next meeting
`;
}
