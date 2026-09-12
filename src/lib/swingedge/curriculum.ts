// SwingEdge — day-by-day curriculum for the six training weeks.
//
// TRAINING_WEEKS (training.ts) says what a week is for and how it is measured.
// This file is the teaching plan underneath it: five working days per week,
// each with the lessons to read, the drill to do, and the screen to do it on.
//
// Nothing here promises results. The drills are all observation and repetition,
// which is the only part of trading a beginner can control.

import { LESSONS } from './lessons';

export interface CurriculumDay {
  /** 1 to 5. Days are working days, not calendar days — falling behind is fine. */
  day: number;
  title: string;
  /** Why today exists, one or two sentences. */
  why: string;
  /** Academy lesson keys to read today. */
  lessonKeys: string[];
  /** Tick-off drills. Each one is a concrete action, not a feeling. */
  drills: string[];
  /** Where in the app the drill happens. */
  practice?: { label: string; to: string };
  /** Counter on the week that today's drill should move. */
  counter?: 'lessons_completed' | 'charts_analyzed' | 'setups_analyzed' | 'candidates_built' | 'paper_trades_taken';
}

export interface WeekCurriculum {
  week: number;
  /** One line the trader should be able to say by Friday. */
  outcome: string;
  /** Things that must not happen this week. */
  guardrails: string[];
  days: CurriculumDay[];
  /** Questions to answer in the weekly review for this week specifically. */
  reviewPrompts: string[];
}

export const WEEK_CURRICULUM: WeekCurriculum[] = [
  {
    week: 1,
    outcome: 'I can describe what the market is doing before I look at any score.',
    guardrails: [
      'No trade plans this week.',
      'No paper trades this week.',
      'No opinions about a stock before you have described its market.',
    ],
    reviewPrompts: [
      'How many of the 20 charts did you call trending, and would you call them the same way today?',
      'Which chart did you find hardest to describe, and why?',
    ],
    days: [
      {
        day: 1,
        title: 'What this actually is',
        why: 'Set the boundaries first: long only, days to weeks, paper only. Most confusion later comes from mixing timeframes.',
        lessonKeys: ['what-is-swing-trading'],
        drills: [
          'Read the foundation lesson and write the one-sentence version of a trade in your own words.',
          'Write down, on paper, the three things this app will never do (no options, no shorts, no real orders).',
        ],
        practice: { label: 'Open the Academy', to: '/swingedge/academy' },
        counter: 'lessons_completed',
      },
      {
        day: 2,
        title: 'Trend',
        why: 'Trend is the tide. A good setup against the tide is still a bad trade.',
        lessonKeys: ['trend'],
        drills: [
          'Read the trend lesson.',
          'Open 5 charts in the Analyzer and label each one uptrend, downtrend or sideways before scrolling to any score.',
        ],
        practice: { label: 'Open the Analyzer', to: '/swingedge/analyzer' },
        counter: 'charts_analyzed',
      },
      {
        day: 3,
        title: 'Momentum, and stretched versus strong',
        why: 'Beginners buy the strongest looking bar on the screen. Strong and stretched look identical for about a day.',
        lessonKeys: ['momentum'],
        drills: [
          'Read the momentum lesson.',
          'Label 5 more charts, and for each one say whether price is extended away from its average or resting near it.',
        ],
        practice: { label: 'Open the Analyzer', to: '/swingedge/analyzer' },
        counter: 'charts_analyzed',
      },
      {
        day: 4,
        title: 'Volume',
        why: 'Volume tells you whether anyone else agreed with the move. A breakout nobody joined usually comes back.',
        lessonKeys: ['volume'],
        drills: [
          'Read the volume lesson.',
          'Label 5 more charts and note whether the most recent big move happened on higher or lower volume than usual.',
        ],
        practice: { label: 'Open the Analyzer', to: '/swingedge/analyzer' },
        counter: 'charts_analyzed',
      },
      {
        day: 5,
        title: 'Market condition, whole market',
        why: 'The same setup pays in one market and bleeds in another. This is the single highest-value habit of week one.',
        lessonKeys: [],
        drills: [
          'Read the market condition panel on the dashboard and write what it says in your own words.',
          'Label your last 5 charts, then write one paragraph on what kind of market this is right now.',
          'Confirm you placed no trades this week.',
        ],
        practice: { label: 'Open the SwingEdge dashboard', to: '/swingedge' },
        counter: 'charts_analyzed',
      },
    ],
  },
  {
    week: 2,
    outcome: 'I can name the setup and the exact price that proves it wrong.',
    guardrails: ['Still no trade plans.', 'Still no paper trades.', 'Never name a setup after seeing the app’s label.'],
    reviewPrompts: [
      'Which setup type do you spot most easily, and which do you keep forcing?',
      'Did every setup you named have an invalidation level written next to it?',
    ],
    days: [
      {
        day: 1,
        title: 'The two setups',
        why: 'A short list is a feature. Two setups you know beat ten you half-recognise.',
        lessonKeys: ['setups'],
        drills: [
          'Read the setups lesson twice.',
          'Write the definition of each setup from memory, then check it.',
        ],
        practice: { label: 'Open the Academy', to: '/swingedge/academy' },
        counter: 'lessons_completed',
      },
      {
        day: 2,
        title: 'Pullbacks',
        why: 'A pullback is a pause in a trend, not a fall. Telling those apart is the whole skill.',
        lessonKeys: ['trend', 'setups'],
        drills: [
          'Find 5 pullbacks in the Scanner results and name the level price is pulling back to.',
          'For each, write the price where you would say the pullback failed.',
        ],
        practice: { label: 'Open the Scanner', to: '/swingedge/scanner' },
        counter: 'setups_analyzed',
      },
      {
        day: 3,
        title: 'Breakouts and retests',
        why: 'Most breakouts fail on the first push. The retest is where the evidence is.',
        lessonKeys: ['volume', 'false-breakouts-and-volume'],
        drills: [
          'Find 5 breakouts and mark whether volume confirmed them.',
          'For each, write where the breakout would be proven false.',
        ],
        practice: { label: 'Open the Scanner', to: '/swingedge/scanner' },
        counter: 'setups_analyzed',
      },
      {
        day: 4,
        title: 'Candles in context',
        why: 'Candle patterns are a nudge, never a reason. Learn them so you can stop over-reading them.',
        lessonKeys: ['candle-anatomy', 'context-over-pattern-names'],
        drills: [
          'Read both candle lessons.',
          'Find 5 more setups and note the pattern at the entry area, plus whether context agreed with it.',
        ],
        practice: { label: 'Open the Analyzer', to: '/swingedge/analyzer' },
        counter: 'setups_analyzed',
      },
      {
        day: 5,
        title: 'Watchlist discipline',
        why: 'A watchlist is a queue of pre-decided ideas. It is what stops you shopping at the moment of maximum excitement.',
        lessonKeys: [],
        drills: [
          'Add your five best-named setups to a watchlist with the role you would trade them in.',
          'Delete anything you added out of curiosity rather than a named setup.',
        ],
        practice: { label: 'Open Watchlists', to: '/swingedge/watchlists' },
      },
    ],
  },
  {
    week: 3,
    outcome: 'My stop comes from the chart and my size comes from the stop, every time.',
    guardrails: [
      'Build plans, open none of them.',
      'Never pick a share count before the stop exists.',
      'Never widen a stop to make a size look better.',
    ],
    reviewPrompts: [
      'Did any plan have a stop chosen because of the dollar risk rather than the chart?',
      'What was your largest planned risk, and was it inside 1R?',
    ],
    days: [
      {
        day: 1,
        title: 'The stop comes first',
        why: 'This is the week that decides whether trading is survivable at all.',
        lessonKeys: ['stops', 'stop-decides-size'],
        drills: ['Read both stop lessons.', 'Write why a dollar-based stop is not a stop.'],
        practice: { label: 'Open the Academy', to: '/swingedge/academy' },
        counter: 'lessons_completed',
      },
      {
        day: 2,
        title: 'Structure, ATR and percentage stops',
        why: 'Three ways to place a stop, each right in different conditions. Knowing which is which prevents noise stop-outs.',
        lessonKeys: ['structure-atr-percent'],
        drills: [
          'Read the lesson.',
          'Build 3 trade plans, using a structure stop on each, and note the ATR distance for comparison.',
        ],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'candidates_built',
      },
      {
        day: 3,
        title: 'Position sizing',
        why: 'One calculation, done in the right order, is most of risk management.',
        lessonKeys: ['position-sizing'],
        drills: [
          'Read the sizing lesson.',
          'Build 4 plans and let the app size them. Check each planned loss lands on 1R, not near it.',
        ],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'candidates_built',
      },
      {
        day: 4,
        title: 'Total risk and heat',
        why: 'Five small trades in one sector is one large trade wearing a disguise.',
        lessonKeys: ['portfolio-risk'],
        drills: [
          'Read the portfolio risk lesson.',
          'Build 3 more plans and read the portfolio heat card as if all of them were open at once.',
        ],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'candidates_built',
      },
      {
        day: 5,
        title: 'Never widen',
        why: 'Widening a stop is the single habit that ends accounts. Learn it now, while nothing is at stake.',
        lessonKeys: ['never-widen', 'r-multiples-and-gaps'],
        drills: [
          'Read both lessons.',
          'Review your 10 plans and confirm every stop sits at a level that proves the setup wrong.',
          'Confirm you opened none of them.',
        ],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
      },
    ],
  },
  {
    week: 4,
    outcome: 'I take the trade I planned, at the price I planned, and change nothing after entry.',
    guardrails: [
      'Only trades from a plan that qualified.',
      'No entries outside the approved zone, however tempting.',
      'Journal on the day of entry, not later.',
    ],
    reviewPrompts: [
      'Did any entry land outside its zone? What were you telling yourself at the time?',
      'Which trade felt worst to take, and was that feeling informative or just unfamiliar?',
    ],
    days: [
      {
        day: 1,
        title: 'First paper trade',
        why: 'The gap between planning and doing is where discipline actually lives.',
        lessonKeys: ['three-layers-one-signal'],
        drills: [
          'Complete the daily checklist first.',
          'Open 1 paper trade from a plan that qualified.',
          'Journal it the same day.',
        ],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'paper_trades_taken',
      },
      {
        day: 2,
        title: 'Second and third',
        why: 'Repetition with the same procedure is the point. Boredom here is a good sign.',
        lessonKeys: [],
        drills: ['Checklist, then open 2 more qualified paper trades.', 'Journal both on the day.'],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'paper_trades_taken',
      },
      {
        day: 3,
        title: 'Sitting still',
        why: 'Most damage after entry comes from doing something. Today you do nothing on purpose.',
        lessonKeys: ['managing'],
        drills: [
          'Read the managing lesson.',
          'Look at your open trades and change nothing. Write what you wanted to change and why.',
        ],
        practice: { label: 'Open Paper Trading', to: '/swingedge/paper-trading' },
      },
      {
        day: 4,
        title: 'Fourth and fifth',
        why: 'Five trades is enough to see whether the procedure survives contact with a live-looking market.',
        lessonKeys: [],
        drills: ['Checklist, then open 2 more qualified paper trades.', 'Journal both on the day.'],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'paper_trades_taken',
      },
      {
        day: 5,
        title: 'Honest journal audit',
        why: 'An unjournaled trade teaches nothing, and a flattering journal teaches worse than nothing.',
        lessonKeys: ['journaling'],
        drills: [
          'Read the journaling lesson.',
          'Check all five trades have a journal entry written on the entry day.',
          'Mark any entry that was chased, even slightly.',
        ],
        practice: { label: 'Open the Journal', to: '/swingedge/journal' },
      },
    ],
  },
  {
    week: 5,
    outcome: 'I can point at a loss and explain why it was still a good trade.',
    guardrails: [
      'Stops move in your favour only, and only with a written reason.',
      'No exits invented after the fact.',
      'Label the decision separately from the money.',
    ],
    reviewPrompts: [
      'Which exit was a good decision with a bad result?',
      'Did you exit anything early out of fear? What did that cost in R?',
    ],
    days: [
      {
        day: 1,
        title: 'Planned exits',
        why: 'Exits decided in advance are the only ones you can grade later.',
        lessonKeys: ['managing'],
        drills: ['Checklist, then open 2 qualified paper trades with the exit written before entry.'],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'paper_trades_taken',
      },
      {
        day: 2,
        title: 'Breakeven stops',
        why: 'Moving to breakeven removes risk. Moving too early removes the trade.',
        lessonKeys: ['stop-decides-size'],
        drills: [
          'Practise a breakeven stop on one open trade and write the reason.',
          'Note what would have happened if you had left it alone.',
        ],
        practice: { label: 'Open Paper Trading', to: '/swingedge/paper-trading' },
      },
      {
        day: 3,
        title: 'Trailing stops',
        why: 'Trailing keeps you in a working trade without renegotiating the risk.',
        lessonKeys: ['structure-atr-percent'],
        drills: ['Trail one stop by structure and one by ATR.', 'Open 2 more qualified paper trades.'],
        practice: { label: 'Open Paper Trading', to: '/swingedge/paper-trading' },
        counter: 'paper_trades_taken',
      },
      {
        day: 4,
        title: 'Gaps and earnings',
        why: 'A stop is an instruction, not a guarantee. Gaps are how that becomes obvious.',
        lessonKeys: ['r-multiples-and-gaps'],
        drills: [
          'Read the lesson.',
          'Check every open trade for earnings before its likely exit date.',
          'Open 1 more qualified paper trade.',
        ],
        practice: { label: 'Open Paper Trading', to: '/swingedge/paper-trading' },
        counter: 'paper_trades_taken',
      },
      {
        day: 5,
        title: 'Good loss, bad loss',
        why: 'Grading decisions instead of outcomes is what stops a losing week changing your strategy.',
        lessonKeys: ['journaling'],
        drills: [
          'Label every closed trade this week a good or bad decision, separately from the money.',
          'Write one sentence per trade explaining the label.',
        ],
        practice: { label: 'Open Performance', to: '/swingedge/performance' },
      },
    ],
  },
  {
    week: 6,
    outcome: 'I can name my most expensive habit before anyone else points at it.',
    guardrails: [
      'No new rules invented from a small sample.',
      'No graduating on profit.',
      'Count the trades you correctly skipped as wins.',
    ],
    reviewPrompts: [
      'What is your single most expensive habit across all 20 trades?',
      'What was the best trade you chose not to take, and why was skipping it right?',
      'Which readiness check is still red, and what will move it?',
    ],
    days: [
      {
        day: 1,
        title: 'Finish the sample',
        why: 'Twenty trades is still small, but it is the point where habits show and luck starts to average out.',
        lessonKeys: [],
        drills: ['Checklist, then open 3 qualified paper trades.'],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'paper_trades_taken',
      },
      {
        day: 2,
        title: 'Signals versus results',
        why: 'A good signal executed badly and a bad signal that paid look the same on a balance line.',
        lessonKeys: ['three-layers-one-signal', 'missing-data-and-confidence'],
        drills: ['Read both lessons.', 'Open 3 more qualified paper trades.'],
        practice: { label: 'Open the Planner', to: '/swingedge/planner' },
        counter: 'paper_trades_taken',
      },
      {
        day: 3,
        title: 'Read your own record',
        why: 'The numbers you avoid looking at are the ones worth reading.',
        lessonKeys: [],
        drills: [
          'Read Performance by setup, by pattern and by execution score.',
          'Open 2 more qualified paper trades.',
        ],
        practice: { label: 'Open Performance', to: '/swingedge/performance' },
        counter: 'paper_trades_taken',
      },
      {
        day: 4,
        title: 'The expensive habit',
        why: 'Everyone has one. Naming it is most of fixing it.',
        lessonKeys: ['never-widen'],
        drills: [
          'Find every widened stop and chased entry in your record.',
          'Write your most expensive habit in one sentence.',
          'Open 2 more qualified paper trades.',
        ],
        practice: { label: 'Open the Journal', to: '/swingedge/journal' },
        counter: 'paper_trades_taken',
      },
      {
        day: 5,
        title: 'Decide honestly',
        why: 'Readiness is behavioural. Taking ten weeks instead of six costs nothing; going live early can cost a lot.',
        lessonKeys: [],
        drills: [
          'Read the readiness panel and write which checks are still red.',
          'Write your first live-trade size — smaller than feels worthwhile.',
          'Write the weekly review for week six.',
        ],
        practice: { label: 'Back to the training overview', to: '/swingedge/training' },
      },
    ],
  },
];

export function curriculumFor(week: number): WeekCurriculum | undefined {
  return WEEK_CURRICULUM.find((w) => w.week === week);
}

/** Total tick-off drills in a week, used for the day-by-day progress bar. */
export function drillCount(week: WeekCurriculum): number {
  return week.days.reduce((sum, d) => sum + d.drills.length, 0);
}

export interface CurriculumLessonRef {
  key: string;
  title: string;
  minutes: number;
  module: string;
}

/** Lessons referenced by a day, resolved against the Academy content. */
export function lessonsForDay(day: CurriculumDay): CurriculumLessonRef[] {
  return day.lessonKeys
    .map((key) => LESSONS.find((l) => l.key === key))
    .filter((l): l is (typeof LESSONS)[number] => !!l)
    .map((l) => ({ key: l.key, title: l.title, minutes: l.minutes, module: l.module }));
}
