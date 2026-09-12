// SwingEdge Analyzer — Trading Academy content.
// Original teaching material written for this app. Every lesson ends with what
// the idea ignores, and points at the screen where the idea shows up.

export interface Lesson {
  key: string;
  module: string;
  title: string;
  minutes: number;
  summary: string;
  /** Body paragraphs, plain language. */
  body: string[];
  /** Worked example using the same demo numbers the app ships with. */
  example: { title: string; lines: string[] };
  keyPoints: string[];
  blindSpot: string;
  appliesTo: { label: string; to: string };
  quiz: { question: string; options: string[]; answerIndex: number; why: string };
}

export const ACADEMY_MODULES = [
  'Foundations',
  'Reading the chart',
  'Setups',
  'Risk and sizing',
  'Managing and reviewing',
] as const;

export const LESSONS: Lesson[] = [
  {
    key: 'what-is-swing-trading',
    module: 'Foundations',
    title: 'What swing trading actually is',
    minutes: 4,
    summary: 'Holding a stock for days or weeks to capture one move, with the exit decided before you buy.',
    body: [
      'A swing trade tries to capture one leg of a move — usually a few days to a few weeks. You are not day trading, and you are not investing for a decade. You are renting a move.',
      'Because the hold is short, the single most important decision is not what to buy. It is where you are wrong. A swing trade without a predefined exit is just a hope with a ticker symbol attached.',
      'This app only supports long trades in US stocks and ETFs, and only as paper trades. No options, no short selling, no margin, no real orders. That keeps the focus on the decision-making, which is the part that actually transfers.',
    ],
    example: {
      title: 'A trade described properly',
      lines: [
        'Buy 25 shares at 44.50 because price broke above its recent range on strong volume.',
        'I am wrong below 42.50, which is under the last swing low.',
        'I expect 48.50, the next area where sellers showed up.',
        'That risks $50 to make $100 — two dollars of reward for each dollar at risk.',
      ],
    },
    keyPoints: [
      'A swing trade is a defined move with a defined exit.',
      'Write the exit before the entry, every time.',
      'One clean sentence should explain why you are in.',
    ],
    blindSpot: 'A tidy plan says nothing about whether the market will co-operate. Good plans still lose.',
    appliesTo: { label: 'Trading Dashboard', to: '/swingedge' },
    quiz: {
      question: 'What has to be decided before you buy?',
      options: ['The exit', 'The news catalyst', 'The analyst rating'],
      answerIndex: 0,
      why: 'The exit defines your risk. Everything else is optional.',
    },
  },
  {
    key: 'trend',
    module: 'Reading the chart',
    title: 'Trend: the tide you are swimming with',
    minutes: 5,
    summary: 'Two moving averages and the price tell you whether buyers or sellers are in charge.',
    body: [
      'A moving average is just the average closing price over a window, redrawn each day. The 20-day average reflects the last month of mood. The 50-day average reflects the last quarter.',
      'This app calls the trend up when the 20-day average is above the 50-day average and price is holding above the 50-day line. Down is the mirror image. When the two averages sit almost on top of each other, it calls the trend sideways, because there is no honest direction to report.',
      'Trend matters because it changes your odds without changing your effort. Buying breakouts in a downtrend is the most expensive habit in swing trading.',
    ],
    example: {
      title: 'How the app scores it',
      lines: [
        'Trend up: 30 of 30 points.',
        'Sideways: 12 of 30 points.',
        'Trend down: 0 points, and the verdict becomes DOES NOT QUALIFY regardless of everything else.',
      ],
    },
    keyPoints: [
      'Trend up means the 20-day average leads the 50-day average.',
      'Sideways is a real answer, not a missing one.',
      'A down trend removes a long trade from consideration here.',
    ],
    blindSpot: 'Moving averages are backward-looking. They turn after the move, never before it.',
    appliesTo: { label: 'Stock Analyzer', to: '/swingedge/analyzer' },
    quiz: {
      question: 'When does this app call the trend up?',
      options: [
        'When yesterday closed green',
        'When the 20-day average is above the 50-day and price holds above it',
        'When RSI is above 70',
      ],
      answerIndex: 1,
      why: 'It is a relationship between the two averages and price, not a single day.',
    },
  },
  {
    key: 'momentum',
    module: 'Reading the chart',
    title: 'Momentum, and why stretched is not strong',
    minutes: 5,
    summary: 'RSI and MACD describe the speed of a move — useful, and easy to misread.',
    body: [
      'RSI compares the size of recent up moves to recent down moves and reports a number from 0 to 100. Around 50 means balance. Above 70 means the move has been unusually one-sided lately.',
      'People treat RSI above 70 as strength. This app treats it as expensive. A stretched price needs a wider stop, and a wider stop means either more dollars at risk or fewer shares. That is why the scoring gives its full momentum points to RSI between 50 and 70 and cuts points above 70.',
      'MACD compares a fast average to a slow one. When its histogram is above zero, short-term momentum is running ahead of longer-term momentum. That is a confirmation, not a reason on its own.',
    ],
    example: {
      title: 'Two symbols, same trend',
      lines: [
        'Symbol A: trend up, RSI 61, MACD histogram positive — 20 momentum points plus 15 confirmation points.',
        'Symbol B: trend up, RSI 78, MACD histogram positive — 8 momentum points plus 15 confirmation points.',
        'Symbol B looks more exciting on the chart and scores 12 points lower here.',
      ],
    },
    keyPoints: [
      'RSI between 50 and 70 is the healthy zone for a new long entry.',
      'Above 70 is stretched: a pause is normal.',
      'MACD confirms momentum; it does not create a setup.',
    ],
    blindSpot: 'Strong stocks can stay stretched for weeks. This rule will keep you out of some real winners.',
    appliesTo: { label: 'Market Scanner', to: '/swingedge/scanner' },
    quiz: {
      question: 'How does this app treat RSI above 70?',
      options: ['As the strongest possible reading', 'As stretched, worth fewer points', 'As a sell signal'],
      answerIndex: 1,
      why: 'Stretched prices force wider stops, which costs you either dollars or shares.',
    },
  },
  {
    key: 'volume',
    module: 'Reading the chart',
    title: 'Volume: who else showed up',
    minutes: 3,
    summary: 'Relative volume tells you whether a move had participation or was just drift.',
    body: [
      'Relative volume compares today’s volume to the average of the last 20 sessions. 1.0 is a normal day. 1.5 means half again as many shares changed hands as usual.',
      'A breakout on light volume is a move only a few people agreed with, and those are the ones that quietly slip back inside the range. A breakout on heavy volume means real demand met real supply and demand won.',
      'Volume is also a liquidity check. Thin names have wide spreads and gap through stops, which turns a $50 planned loss into something larger.',
    ],
    example: {
      title: 'Scoring participation',
      lines: [
        '1.5x average or more: 15 of 15 points.',
        '1.0x to 1.5x: 10 points.',
        '0.7x to 1.0x: 5 points.',
        'Under 0.7x: 0 points, and the app warns that moves can reverse easily.',
      ],
    },
    keyPoints: [
      'Volume confirms a breakout; it rarely rescues one.',
      'Light volume is a warning, not a detail.',
      'Thin stocks make your stop less reliable.',
    ],
    blindSpot: 'Volume spikes also happen on news you cannot repeat and did not predict.',
    appliesTo: { label: 'Market Scanner', to: '/swingedge/scanner' },
    quiz: {
      question: 'What does relative volume of 0.6 tell you?',
      options: ['Heavy participation', 'Normal participation', 'Very light participation'],
      answerIndex: 2,
      why: 'Anything under 1.0 is below the recent average, and 0.6 is well below.',
    },
  },
  {
    key: 'setups',
    module: 'Setups',
    title: 'The only two setups this app recognises',
    minutes: 5,
    summary: 'Breakout and pullback. Everything else is called NONE, on purpose.',
    body: [
      'A breakout is when the latest close clears the highest high of the prior window on at least average volume. The idea is simple: the price left a ceiling behind.',
      'A pullback is when an uptrend eases back toward its 20-day average without breaking down. The idea is that you are buying a discount inside strength rather than paying a premium at the highs.',
      'When neither is true, the app says NONE and the verdict becomes NOT READY. That is deliberate. Without a setup, your entry price would be arbitrary, and an arbitrary entry makes your stop arbitrary too.',
    ],
    example: {
      title: 'Pullback definition in numbers',
      lines: [
        'Trend must be up.',
        'Price must sit between 4% below and 2% above the 20-day average.',
        'Outside that band it is either extended or already broken.',
      ],
    },
    keyPoints: [
      'Breakout: cleared the recent high with participation.',
      'Pullback: uptrend resting near its 20-day average.',
      'No setup means no entry, not a smaller entry.',
    ],
    blindSpot: 'Two setups will miss plenty of valid ways to trade. Narrow is a feature, not a claim of completeness.',
    appliesTo: { label: 'Stock Analyzer', to: '/swingedge/analyzer' },
    quiz: {
      question: 'What does a NONE setup mean for the verdict?',
      options: ['NOT READY', 'QUALIFIES with a smaller size', 'It is ignored'],
      answerIndex: 0,
      why: 'Without a setup there is no non-arbitrary place to enter or to be wrong.',
    },
  },
  {
    key: 'stops',
    module: 'Risk and sizing',
    title: 'The stop comes first',
    minutes: 5,
    summary: 'Decide where the idea is wrong, then let that decide everything else.',
    body: [
      'Your stop is not a loss limit you bolt on afterwards. It is the price at which your reason for buying stopped being true. Put it under the level the chart actually respects — the swing low, the base, the moving average you claimed was support.',
      'The app also uses the Average True Range, which is the typical daily range of the stock, to sanity-check the distance. A stop closer than the stock’s normal daily wobble will be hit by noise instead of by a real change.',
      'Once the stop is set, the distance between entry and stop is your risk per share, and that number drives your position size. Set the stop to fit the chart, never to fit the size you wanted.',
    ],
    example: {
      title: 'Same idea, two stops',
      lines: [
        'Entry 44.50, stop 42.50: risk per share $2.00, so a $50 budget buys 25 shares.',
        'Entry 44.50, stop 43.50: risk per share $1.00, so the same $50 buys 50 shares.',
        'The tighter stop is not safer — it is just more likely to be hit by ordinary noise.',
      ],
    },
    keyPoints: [
      'The stop is a statement about the chart, not about your wallet.',
      'Stops inside the normal daily range get hit by noise.',
      'Risk per share is entry minus stop.',
    ],
    blindSpot: 'A stop is not a guarantee. Gaps and news can take price straight past it.',
    appliesTo: { label: 'Trade Planner', to: '/swingedge/planner' },
    quiz: {
      question: 'What should set the stop price?',
      options: ['The share count you want', 'The level where your reason stops being true', 'A fixed 5%'],
      answerIndex: 1,
      why: 'The chart defines the invalidation; the size adjusts to it afterwards.',
    },
  },
  {
    key: 'position-sizing',
    module: 'Risk and sizing',
    title: 'Position sizing: the one calculation that matters',
    minutes: 6,
    summary: 'Risk budget divided by risk per share gives your share count. Nothing else does.',
    body: [
      'Pick the most you are willing to lose on one trade — this app defaults to 1% of trading capital. That is your risk budget in dollars.',
      'Divide that budget by your risk per share and round down. That is your share count. Rounding down matters: rounding up quietly breaks the limit you just set.',
      'Notice what is missing. Your conviction is not in the formula. How much you like the company is not in the formula. Sizing by feel is how one bad week erases six good ones.',
    ],
    example: {
      title: 'The reference case this app is tested against',
      lines: [
        'Trading capital $5,000, risk per trade 1% → $50 budget.',
        'Entry 44.50, stop 42.50 → $2.00 risk per share.',
        '$50 ÷ $2.00 = 25 shares, a position worth $1,112.50.',
        'Target 48.50 → potential gain $100, so reward to risk is 2 to 1.',
      ],
    },
    keyPoints: [
      'Shares = risk budget ÷ risk per share, rounded down.',
      'Position value is a by-product, not an input.',
      'Conviction never enters the arithmetic.',
    ],
    blindSpot: 'Sizing controls one loss at a time. Several correlated positions can still hit you at once.',
    appliesTo: { label: 'Trade Planner', to: '/swingedge/planner' },
    quiz: {
      question: 'With a $50 risk budget and $2.50 risk per share, how many shares?',
      options: ['25', '20', '125'],
      answerIndex: 1,
      why: '$50 ÷ $2.50 = 20 shares exactly.',
    },
  },
  {
    key: 'portfolio-risk',
    module: 'Risk and sizing',
    title: 'Total open risk and risk of ruin',
    minutes: 5,
    summary: 'Sizing each trade correctly still lets you take on too much at once.',
    body: [
      'Add up entry minus stop, times shares, across every open position. That total is what a genuinely bad day costs you. This app caps it at 5% of trading capital by default and shows the remaining room on the dashboard.',
      'Risk of ruin is the flip side. Losing 50% requires a 100% gain to get back to even, which is why a series of oversized losses is so much worse than it looks. Small consistent risk is what keeps you in the game long enough for your process to matter.',
      'Trading capital in this app is deliberately walled off from your retirement accounts, HSA, emergency fund and long-term investments. Those are not trading capital and never appear in these numbers.',
    ],
    example: {
      title: 'Four positions, one bad day',
      lines: [
        '$5,000 capital, 5% cap → $250 of open risk allowed.',
        'Four open trades risking $50 each → $200 used, $50 of room left.',
        'A fifth trade at $50 fills the budget exactly; a sixth is refused.',
      ],
    },
    keyPoints: [
      'Open risk is the sum of every position’s planned loss.',
      'A 5% cap means a very bad day costs 5%, not 25%.',
      'Deep drawdowns need outsized gains to recover.',
    ],
    blindSpot: 'The cap assumes stops fill near your price. In a gap, several can fail together.',
    appliesTo: { label: 'Trading Settings', to: '/swingedge/settings' },
    quiz: {
      question: 'Why cap total open risk?',
      options: [
        'Because correctly sized trades can still add up to a big loss',
        'Because brokers require it',
        'To increase returns',
      ],
      answerIndex: 0,
      why: 'Per-trade discipline says nothing about how many trades are open at once.',
    },
  },
  {
    key: 'managing',
    module: 'Managing and reviewing',
    title: 'Managing a trade without renegotiating it',
    minutes: 4,
    summary: 'There are three honest exits: stop, target, and the reason disappearing.',
    body: [
      'Once you are in, your job shrinks. Price hits your stop, you are out. Price hits your target, you are out. Your reason for being in stops being true, you are out — even at a profit, even at a small loss.',
      'What is not on that list is moving the stop lower because you would rather not take the loss. That single habit turns planned small losses into unplanned large ones, and it is the most common entry in most trading journals.',
      'Paper trading exists so you can practise this without paying for the lesson. Every paper trade in this app records whether you followed your own plan, and that answer is scored separately from profit.',
    ],
    example: {
      title: 'A plan that survived contact',
      lines: [
        'Bought 25 shares at 44.50 with a stop at 42.50.',
        'Price fell to 42.40 four days later; exit at 42.50 for a $50 loss.',
        'Journal entry: rules followed, yes. That is a successful trade in process terms.',
      ],
    },
    keyPoints: [
      'Stop, target, or invalidation — those are the exits.',
      'Never move a stop away from price.',
      'Following the plan and making money are two separate scores.',
    ],
    blindSpot: 'Rigid exits sometimes cut a trade that would have worked. That cost is the price of consistency.',
    appliesTo: { label: 'Paper Trading', to: '/swingedge/paper' },
    quiz: {
      question: 'Which is not a legitimate exit?',
      options: ['Target hit', 'Stop hit', 'Moving the stop lower to avoid the loss'],
      answerIndex: 2,
      why: 'Moving the stop away from price replaces your plan with your feelings.',
    },
  },
  {
    key: 'journaling',
    module: 'Managing and reviewing',
    title: 'Journaling and reviewing like a professional',
    minutes: 5,
    summary: 'Judge the process monthly, not the profit daily.',
    body: [
      'Write the entry the same day you exit, while you still remember what you were thinking. Record what you planned, what happened, whether you followed your rules, and one mistake if there was one.',
      'Then leave it alone for a month. Short stretches of results are mostly noise: a good plan can lose four in a row and a broken one can win three. Reviewing daily teaches you to react to randomness.',
      'At the month end, read your discipline score first and your profit second. Then pick exactly one mistake to work on. One. A list of ten changes nothing.',
    ],
    example: {
      title: 'A month worth being pleased about',
      lines: [
        'Eight closed trades, three winners, total result minus $40.',
        'Discipline score 100%: every stop and target honoured.',
        'Most common mistake: entered before the setup was ready, twice.',
        'Next month’s single change: no entry until the setup is confirmed at the close.',
      ],
    },
    keyPoints: [
      'Journal the same day, not at the weekend.',
      'Review monthly to cut the noise.',
      'Change one thing at a time.',
    ],
    blindSpot: 'A journal records what you noticed. The reason a trade worked may be something you never wrote down.',
    appliesTo: { label: 'Trade Journal', to: '/swingedge/journal' },
    quiz: {
      question: 'What should you read first at your monthly review?',
      options: ['Total profit', 'Your discipline score', 'Your biggest winner'],
      answerIndex: 1,
      why: 'Discipline is the part you control, so it is the part worth judging.',
    },
  },
  {
    key: 'stop-decides-size',
    module: 'Stop-loss mastery',
    title: 'The stop decides the size',
    minutes: 5,
    summary: 'Place the stop where the idea is wrong, then let that distance decide how many shares you buy.',
    body: [
      'Most losing habits start the same way: someone decides how many shares they want, then puts the stop wherever that number happens to allow. That is backwards. The chart decides where you are wrong; your account decides how much that mistake is allowed to cost.',
      'So the order is fixed. Setup, entry, invalidation, stop, risk per share, position size, target, reward-to-risk. Nothing later in that list is allowed to change anything earlier in it.',
      'A stop is not a wish about how much you want to lose. It is the price at which the reason you bought no longer exists.',
    ],
    example: {
      title: 'The reference trade',
      lines: [
        'Account $5,000, risking 1%, so the most you may lose is $50.',
        'Entry 44.50, invalidation 42.50, so risk per share is $2.00.',
        '$50 divided by $2.00 is 25 shares, rounded down.',
        'Target 48.50 gives $4.00 of reward for $2.00 of risk — 2:1.',
      ],
    },
    keyPoints: [
      'The stop determines position size, never the other way round.',
      'Shares are always rounded down.',
      'If the correct stop only allows one share, the trade is too expensive for your account.',
    ],
    blindSpot: 'Correct sizing does not make a bad setup good. It only limits the damage.',
    appliesTo: { label: 'Trade Planner', to: '/swingedge/planner' },
    quiz: {
      question: 'Which comes first?',
      options: ['The share count', 'The stop', 'The target'],
      answerIndex: 1,
      why: 'The stop distance is the input to the share count, so it has to be settled first.',
    },
  },
  {
    key: 'structure-atr-percent',
    module: 'Stop-loss mastery',
    title: 'Structure, ATR and percentage stops',
    minutes: 6,
    summary: 'Three ways to place a stop, and why structure usually wins.',
    body: [
      'A structure stop sits just below the level that holds your thesis together — a swing low, a support shelf, a broken-out level. It is the only method that carries a meaning you can say out loud.',
      'An ATR stop uses the average daily range, so it adapts to how much the stock actually moves. It is useful as a sanity check: if your structure stop is well inside one ATR, normal noise will take you out.',
      'A percentage stop is the weakest. It ignores structure and volatility entirely — the same 3% applies to a sleepy utility and to a stock that swings 6% a day. Use it only as a rough backstop.',
      'A hybrid stop takes the structural level and then checks it against ATR, placing the stop below both so ordinary movement cannot reach it.',
    ],
    example: {
      title: 'Comparing methods on the same trade',
      lines: [
        'Entry 44.50, swing low 42.50, ATR $1.20.',
        'Structure stop with a 0.25% buffer: 42.39.',
        '1.5 ATR stop: 42.70.',
        'The structure stop sits wider, so it is the one that respects the chart.',
      ],
    },
    keyPoints: [
      'Structure gives the stop a reason.',
      'ATR tells you whether the stop can survive normal noise.',
      'Percentage stops ignore both structure and volatility.',
    ],
    blindSpot: 'Every method still assumes the stock trades continuously. Gaps ignore all three.',
    appliesTo: { label: 'Trade Planner', to: '/swingedge/planner' },
    quiz: {
      question: 'What does ATR add to a structure stop?',
      options: [
        'A check on whether ordinary movement would hit it',
        'A prediction of the next move',
        'A better entry price',
      ],
      answerIndex: 0,
      why: 'ATR measures typical daily range, so it tells you if your stop sits inside the noise.',
    },
  },
  {
    key: 'never-widen',
    module: 'Stop-loss mastery',
    title: 'Why widening a stop destroys accounts',
    minutes: 5,
    summary: 'Moving a stop further away converts a planned small loss into an unplanned large one.',
    body: [
      'A widened stop feels like patience. It is not. Your risk was calculated from the original distance, so moving the stop down increases the dollars at risk on a position you already sized — often by half again or more.',
      'Worse, it breaks the only promise you made to yourself before emotion arrived. The invalidation level was chosen when you were calm. Moving it while you are losing money is exactly the wrong moment to reconsider.',
      'The disciplined direction is one-way. Stops move up as structure rises, to breakeven once a trade has proved itself, and then to trail behind higher lows. They never move down.',
    ],
    example: {
      title: 'What widening actually costs',
      lines: [
        '25 shares, entry 44.50, stop 42.50 — risk $50.',
        'Price falls to 42.60, you move the stop to 41.50.',
        'Risk is now $75, half again more than your rule allowed.',
        'Your 2:1 trade has quietly become a 1.3:1 trade.',
      ],
    },
    keyPoints: [
      'Widening a stop increases risk after the position is already sized.',
      'Every stop change is logged here, with the reason.',
      'Stops move up, to breakeven, then trail. Never down.',
    ],
    blindSpot: 'Occasionally the widened stop is rescued by a bounce. That is luck teaching you a bad lesson.',
    appliesTo: { label: 'Paper Trading', to: '/swingedge/paper' },
    quiz: {
      question: 'What happens to your risk when you widen a stop?',
      options: ['It stays the same', 'It increases', 'It decreases'],
      answerIndex: 1,
      why: 'The shares are already bought, so a wider stop means more dollars at risk.',
    },
  },
  {
    key: 'r-multiples-and-gaps',
    module: 'Stop-loss mastery',
    title: 'R-multiples, gaps and earnings',
    minutes: 5,
    summary: 'Score results in units of risk, and respect the risk a stop cannot cover.',
    body: [
      'An R-multiple expresses a result in units of the risk you accepted. Making $100 on a $50 risk is +2R. This lets you compare a small trade with a large one honestly, and it stops a lucky oversized win from looking like skill.',
      'A stop is an instruction, not a guarantee. If a stock opens far below your stop, you exit at the open price and the loss is larger than planned. That is gap risk, and position size is your only real defence.',
      'Earnings dates concentrate that risk. Holding through an earnings report is a separate decision from the swing setup, and should be made deliberately or avoided.',
    ],
    example: {
      title: 'Reading results in R',
      lines: [
        'Risk $50. A $100 gain is +2R; a $50 loss is -1R.',
        'Ten trades: six losses at -1R and four wins at +2R nets +2R.',
        'That is a 40% win rate that still makes money.',
      ],
    },
    keyPoints: [
      'R-multiples make trades of different sizes comparable.',
      'A stop cannot protect you through a gap.',
      'Earnings timing is a decision, not a detail.',
    ],
    blindSpot: 'R says nothing about how long your money was tied up, or how it felt to hold.',
    appliesTo: { label: 'Performance', to: '/swingedge/performance' },
    quiz: {
      question: 'You risked $50 and made $75. What is that in R?',
      options: ['+0.5R', '+1.5R', '+2R'],
      answerIndex: 1,
      why: '$75 divided by the $50 risked is 1.5 units of risk.',
    },
  },
];

export function lessonsByModule(): { module: string; lessons: Lesson[] }[] {
  return ACADEMY_MODULES.map((module) => ({
    module,
    lessons: LESSONS.filter((l) => l.module === module),
  })).filter((g) => g.lessons.length > 0);
}
