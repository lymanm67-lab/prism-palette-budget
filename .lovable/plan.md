# The Wealth Lens

A new page under Planning with three parts: the persona quiz, the 5 Is leak check, and the Financial Freedom Number calculator. It uses Prism's current look, menu and account settings.

## What you will see
- **Landing:** the hook line, a "Find My Wealth Persona" button that starts the guided path, and a "Calculate My Freedom Number" button that opens the calculator directly.
- **Persona Quiz:** 16 scenario questions with 4 answers each. Each of the 8 personas shows up an equal number of times across the answers, the answer order changes, and a progress bar shows how far you are. You can go back and change answers, and scores stay hidden until the end. The results show a Primary persona and a Secondary persona, plus one strength, one blind spot and one action. If two personas tie for first, you get a tie-breaker question. If you skip it, you see a blended result. If two tie for second, both are shown.
- **5 Is Leak Check:** you rate Income, IRS, Interest, Investments and Insurance as Working Well, Potential Leak, Unsure or N/A. You can add a monthly or yearly dollar estimate for each. Possible savings and possible extra income are totaled separately. You pick one item to fix first, and you can add it once to the calculator as an optional change.
- **Freedom Number:** the Tuesday intro, then three figures: Freedom Budget, Monthly Freedom Gap and Freedom Number. Three paths you can edit (Spend Down, Spend Up, Steady) cover:
  - spending before and after a change, the change date and one-time costs
  - other income (Social Security, pension, rent, work) with start and end dates
  - taxes still owed
  - current invested money and planned contributions
  - home equity, counted only if you choose to model a sale
  - inflation and return after fees, and an optional ending balance
  - a warning when your budget leaves less room to invest than you plan to put in
- **Results:** the three paths side by side with the target date, spending, contributions, Freedom Number, projected money and the gap. The years with the biggest gap are flagged. Changing the date, spending or contributions updates everything right away. "Show My Math" lists the inputs and each year's gap. A lower-return case sits next to the base case, and both are labeled as projections. Missing inputs are listed. Years when other income covers your costs show a $0 gap.
- **Buttons:** "Save My Freedom Plan" and "Compare Another Lifestyle". The page ends with the closing question.

## Privacy
Saved quiz results and calculator entries are visible only to your account (not shared with the household).

## Technical details
- Route `/planning/wealth-lens` plus a sidebar link in the Planning folder.
- Pure tested engines:
  - `src/lib/wealthLens/persona.ts`: question bank, balance check, scoring, ties
  - `fiveIs.ts`: savings and income kept separate, applied once
  - `freedom.ts`: yearly gap, present value of the gaps through the end age, projected assets, surplus or shortfall, lower-return case
- Tests cover: equal persona counts, tie handling, savings not mixed with income, the leak adjustment applied once, a zero-gap year, and the PV math against a hand-checked example.
- New table `wealth_lens_results` (user_id, quiz answers, results, leak check, freedom inputs as jsonb, timestamps, deleted_at). RLS lets only `user_id = auth.uid()` read or write it, with grants for authenticated users.
- Inputs live in the page's memory until you press Save.
- Add an AGENTS.md rule: Wealth Lens math stays in pure engines, and saved results are private to each user.
