# SwingEdge™ Public Splash Page and PrismMoney™ Feature

## Goal
Create a public, stand-alone SwingEdge™ page that presents the real product clearly, while positioning SwingEdge™ on the main PrismMoney™ site as part of a complete financial ecosystem—not merely a budgeting tool.

## Build
1. **Public SwingEdge™ page**
   - Add a public `/swingedge-trading` route that works without signing in.
   - Use a focused trading-desk visual direction consistent with PrismMoney™: market chart imagery, restrained dark navy surfaces, teal signals, amber risk cues, and clear mobile layouts.
   - Present the actual workflow: Scan → Analyze → Qualify → Plan → Practice → Journal → Review.
   - Highlight the existing Directional Bias, Event Risk, Trade Readiness, AI Mentor, Monte Carlo Risk Lab, backtesting, paper trading, journal, and six-week course.
   - Explain the ecosystem advantage: trading risk sits alongside household cash flow, emergency savings, investing, retirement, credit, and business finances.
   - Include prominent trial/sign-in actions and an educational/not-investment-advice notice. Do not invent performance results, testimonials, or market claims.

2. **PrismMoney™ landing-page integration**
   - Add SwingEdge™ as a prominent key feature within the main features area, not a minor bullet.
   - Add a clear link to the new public page and update nearby messaging from “budgeting/calculators” toward the complete financial ecosystem.
   - Add a SwingEdge™ link in the public navigation where it remains usable on desktop and mobile.

3. **Public-page polish and discoverability**
   - Reuse existing PrismMoney™ navigation, footer, controls, semantic tokens, and motion patterns where appropriate.
   - Set page-specific browser title and description while the SwingEdge™ page is open, then restore the PrismMoney™ defaults when leaving.
   - Keep one H1, semantic sections, accessible controls, and responsive layouts.

4. **Verification**
   - Confirm the existing authenticated `/swingedge` workspace remains unchanged.
   - Verify the new page and main landing page on desktop and mobile, including navigation and trial/sign-in links.
   - Run the relevant checks and confirm the live preview has no errors.

## Technical details
- Expected scope: one new public page, focused landing components as needed, route registration, and targeted updates to the existing landing navigation/features.
- No database, AI-engine, trading-engine, pricing, or authenticated SwingEdge™ workflow changes.
- The public route will use `/swingedge-trading` to avoid conflicting with the existing signed-in `/swingedge` dashboard.
