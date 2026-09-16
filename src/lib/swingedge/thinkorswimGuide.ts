// SwingEdge — Thinkorswim execution guides.
//
// SwingEdge decides the trade. Thinkorswim paperMoney is only where the order is
// practised. This file turns an approved SwingEdge trade into a step-by-step job
// aid that can be walked through on screen or printed as a handout.
//
// Nothing here places an order, and nothing here is invented: every price, share
// count and risk number comes from the approved plan. When a value is missing the
// guide says so instead of guessing.

export const GUIDE_VERSION = '1.0';

export type GuideKind =
  | 'BUY_WITH_STOP'
  | 'EXISTING_POSITION_STOP'
  | 'BUY_STOP_TARGET'
  | 'TROUBLESHOOTING'
  | 'QUICK_START';

export const GUIDE_KIND_LABEL: Record<GuideKind, string> = {
  BUY_WITH_STOP: 'Buy with attached stop',
  EXISTING_POSITION_STOP: 'Stop for a position you already own',
  BUY_STOP_TARGET: 'Buy with stop and target',
  TROUBLESHOOTING: 'Troubleshooting',
  QUICK_START: 'Thinkorswim quick start',
};

/** The approved trade the guide is written from. */
export interface GuideTrade {
  symbol: string;
  shares: number | null;
  entryPrice: number | null;
  entryOrderType: string;
  stopPrice: number | null;
  targetPrice: number | null;
  timeInForce: string;
  riskPerShare: number | null;
  totalRisk: number | null;
  rewardToRisk: number | null;
  /** True when the shares are already owned, so only the stop has to be placed. */
  filled: boolean;
  setup?: string | null;
  account?: string;
}

export interface GuideStep {
  n: number;
  /** Where in Thinkorswim this step happens. */
  screen: string;
  /** What to click or choose. */
  action: string;
  /** The value to type, already filled in from the plan. */
  value?: string;
  /** What should be on screen once the step is done. */
  expect: string;
  /** Shown as a warning panel inside the step when a mistake is common here. */
  warning?: string;
}

export interface OrderLine {
  text: string;
  note?: string;
}

export interface ExecutionGuide {
  key: string;
  kind: GuideKind;
  title: string;
  subtitle: string;
  /** Present for trade guides, null for troubleshooting and quick-start sheets. */
  trade: GuideTrade | null;
  /** Summary rows for the trade box at the top of the sheet. */
  summary: { label: string; value: string }[];
  steps: GuideStep[];
  shouldSee: OrderLine[];
  wouldBeWrong: OrderLine[];
  checklist: string[];
  /** Extra plain-language notes printed under the steps. */
  notes: string[];
  version: string;
}

export const PRE_SEND_CHECKLIST: string[] = [
  'Correct symbol',
  'Correct account (paperMoney, not a live account)',
  'Correct share quantity — the SwingEdge approved size',
  'Correct entry order type',
  'Correct entry price',
  'Correct stop order type (STP, not LMT)',
  'Correct stop price',
  'Correct time in force',
  'Correct trigger relationship (the stop is triggered by the buy)',
  'No duplicate sell order sitting in Working Orders',
  'Ready to confirm and send',
];

/* ------------------------------------------------------------- formatting */

const money = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n)
    ? `$${n.toFixed(2)}`
    : 'not set in the plan';

const shareText = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : 'not set in the plan';

/* ---------------------------------------------------------- guide builders */

/** Which guide fits this trade: already owned, has a target, or plain buy + stop. */
export function guideKindFor(trade: GuideTrade): GuideKind {
  if (trade.filled) return 'EXISTING_POSITION_STOP';
  if (typeof trade.targetPrice === 'number' && trade.targetPrice > 0) return 'BUY_STOP_TARGET';
  return 'BUY_WITH_STOP';
}

function summaryRows(trade: GuideTrade): { label: string; value: string }[] {
  return [
    { label: 'Symbol', value: trade.symbol || 'not set' },
    { label: 'Shares', value: shareText(trade.shares) },
    { label: 'Entry', value: `${money(trade.entryPrice)} ${trade.entryOrderType}` },
    { label: 'Stop', value: `${money(trade.stopPrice)} Stop` },
    {
      label: 'Target',
      value: typeof trade.targetPrice === 'number' ? `${money(trade.targetPrice)} Limit` : 'no target in the plan',
    },
    { label: 'Time in force', value: trade.timeInForce },
    { label: 'Risk per share', value: money(trade.riskPerShare) },
    { label: 'Total risk', value: money(trade.totalRisk) },
    {
      label: 'Reward to risk',
      value: typeof trade.rewardToRisk === 'number' ? `${trade.rewardToRisk}:1` : 'not calculated',
    },
    { label: 'Setup', value: trade.setup ?? 'not recorded' },
  ];
}

/** The order lines the ticket should read, in Thinkorswim shorthand. */
export function orderStructureLines(trade: GuideTrade, kind: GuideKind): OrderLine[] {
  const qty = shareText(trade.shares);
  const buy = `BUY +${qty} ${trade.symbol} @ ${money(trade.entryPrice)} ${trade.entryOrderType.toUpperCase()}`;
  const stop = `SELL -${qty} ${trade.symbol} @ ${money(trade.stopPrice)} STP ${trade.timeInForce}`;
  const target = `SELL -${qty} ${trade.symbol} @ ${money(trade.targetPrice)} LMT ${trade.timeInForce}`;

  if (kind === 'EXISTING_POSITION_STOP') {
    return [
      { text: `You already own ${qty} ${trade.symbol}`, note: 'Position Statement shows the shares' },
      { text: stop, note: 'A closing order — it protects what you own' },
    ];
  }
  if (kind === 'BUY_STOP_TARGET') {
    return [
      { text: buy, note: 'Order #1' },
      { text: 'FIRST TRIGGERS — then the pair below goes live', note: 'TRG BY #1' },
      { text: target, note: 'OCO — one cancels the other' },
      { text: 'OR' },
      { text: stop, note: 'OCO — one cancels the other' },
    ];
  }
  return [
    { text: buy, note: 'Order #1' },
    { text: `${stop} · TRG BY #1`, note: 'The stop only goes live once the buy fills' },
  ];
}

const COMMON_WRONG = (trade: GuideTrade): OrderLine[] => {
  const qty = shareText(trade.shares);
  return [
    {
      text: `SELL -${qty} ${trade.symbol} @ ${money(trade.stopPrice)} LMT`,
      note: 'Wrong. Protection has to be STP. A limit sell there is a profit order, not a stop.',
    },
    {
      text: `SELL -${qty} ${trade.symbol} TO OPEN`,
      note: 'Wrong. That opens a short position. The stop must close the shares you own.',
    },
    {
      text: 'BUY ORDER STILL WORKING',
      note: 'You do not own the shares yet. Working is not filled — check Monitor before assuming you are in.',
    },
    {
      text: `Any quantity above ${qty}`,
      note: 'Wrong. paperMoney may show far more buying power. Only the SwingEdge approved size is allowed.',
    },
    { text: 'Time in force left on DAY for the stop', note: 'The stop disappears at the close. Swing trades need GTC.' },
  ];
};

const BUY_NOTES = [
  'paperMoney buying power is not your risk budget. Size the trade in SwingEdge, then type that share count.',
  'If price has already run past the entry zone, do not chase it. Skipping is a valid outcome.',
  'Record the actual fill back in SwingEdge — the fill, not the plan, drives every later number.',
];

/** Fifteen-step guide for a trade that is not filled yet. */
function buyWithStopGuide(trade: GuideTrade, withTarget: boolean): ExecutionGuide {
  const qty = shareText(trade.shares);
  const kind: GuideKind = withTarget ? 'BUY_STOP_TARGET' : 'BUY_WITH_STOP';
  const steps: GuideStep[] = [
    {
      n: 1,
      screen: 'Thinkorswim',
      action: 'Log in and switch the account selector to paperMoney',
      expect: 'The top of the platform reads paperMoney, not a live account.',
      warning: 'If it does not say paperMoney, stop. Do not place practice orders in a live account.',
    },
    {
      n: 2,
      screen: 'Top menu',
      action: 'Open Trade, then All Products',
      expect: 'The order-entry screen with a symbol box appears.',
    },
    {
      n: 3,
      screen: 'Trade — All Products',
      action: 'Type the symbol in the symbol box and press Enter',
      value: trade.symbol,
      expect: `The ${trade.symbol} bid, ask and chart load.`,
    },
    {
      n: 4,
      screen: 'Trade — All Products',
      action: 'Right-click the Ask price',
      expect: 'A menu of buy order choices opens.',
      warning: 'Right-click the Ask, not the Bid. The Bid side sets up a sell.',
    },
    {
      n: 5,
      screen: 'Right-click menu',
      action: withTarget ? 'Choose Buy Custom, then with Stop and Target (OCO bracket)' : 'Choose Buy Custom, then with STOP',
      expect: withTarget
        ? 'Three order lines appear: one buy and two linked sells.'
        : 'Two order lines appear: one buy and one sell.',
    },
    {
      n: 6,
      screen: 'Order ticket',
      action: 'Set the quantity on the buy line',
      value: `${qty} shares`,
      expect: `The buy line reads BUY +${qty} ${trade.symbol}.`,
      warning: `SwingEdge approved ${qty} shares. Any larger number breaks your risk limit even though paperMoney allows it.`,
    },
    {
      n: 7,
      screen: 'Order ticket',
      action: `Set the buy order type to ${trade.entryOrderType} and type the entry price`,
      value: money(trade.entryPrice),
      expect: `The buy line reads @ ${money(trade.entryPrice)} ${trade.entryOrderType.toUpperCase()}.`,
      warning: 'A market order can fill far away from your plan. Use the limit price from the plan.',
    },
    {
      n: 8,
      screen: 'Order ticket',
      action: 'Type the stop price on the sell line and confirm the type is STP',
      value: money(trade.stopPrice),
      expect: `The sell line reads SELL -${qty} @ ${money(trade.stopPrice)} STP.`,
      warning: 'If that line says LMT, it is not a stop. Change the order type to STP.',
    },
    ...(withTarget
      ? [
          {
            n: 9,
            screen: 'Order ticket',
            action: 'Type the target price on the second sell line and set it to LMT',
            value: money(trade.targetPrice),
            expect: `The target line reads SELL -${qty} @ ${money(trade.targetPrice)} LMT, linked OCO with the stop.`,
            warning: 'The two sells must be OCO. Otherwise a fill on one leaves the other live and you go short.',
          } as GuideStep,
        ]
      : []),
    {
      n: withTarget ? 10 : 9,
      screen: 'Order ticket',
      action: `Set the time in force on every sell line to ${trade.timeInForce}`,
      value: trade.timeInForce,
      expect: `Each protective line shows ${trade.timeInForce}.`,
      warning: 'DAY cancels the stop at the close and leaves the position unprotected overnight.',
    },
    {
      n: withTarget ? 11 : 10,
      screen: 'Order ticket',
      action: 'Read the order rules line at the bottom of the ticket',
      expect: 'It describes the buy first, then the protective order or OCO pair.',
    },
    {
      n: withTarget ? 12 : 11,
      screen: 'Order ticket',
      action: 'Check the trigger relationship',
      expect: 'The protective lines show TRG BY #1 — they only go live when the buy fills.',
      warning: 'Without the trigger the stop can fire before you own anything, opening a short.',
    },
    {
      n: withTarget ? 13 : 12,
      screen: 'Order ticket',
      action: 'Click Confirm and Send, read the confirmation, then Send',
      expect: 'The confirmation repeats the same symbol, quantity, prices and time in force.',
      warning: 'This is your last read. If anything differs from the plan, cancel instead of sending.',
    },
    {
      n: withTarget ? 14 : 13,
      screen: 'Monitor',
      action: 'Open Monitor, then Activity and Positions',
      expect: 'The buy shows under Working Orders until it fills.',
    },
    {
      n: withTarget ? 15 : 14,
      screen: 'Monitor',
      action: 'Check Working Orders and the Position Statement',
      expect: 'Once filled, the position shows the shares and the stop stays listed as working.',
      warning: 'Working means not filled. Filled means you own it. Do not confuse the two.',
    },
    {
      n: withTarget ? 16 : 15,
      screen: 'SwingEdge — Practice Lab',
      action: 'Record the actual fill price, share count and time',
      expect: 'SwingEdge recalculates your real risk, reward-to-risk and execution variance from the fill.',
      warning: 'Do not enter the planned price as the fill. The actual fill is what you traded.',
    },
  ];

  return {
    key: `trade-${kind}-${trade.symbol}`,
    kind,
    title: withTarget
      ? `Buy ${trade.symbol} with a stop and a target`
      : `Buy ${trade.symbol} with an attached stop`,
    subtitle: 'Step by step in Thinkorswim paperMoney, using your approved SwingEdge plan.',
    trade,
    summary: summaryRows(trade),
    steps,
    shouldSee: orderStructureLines(trade, kind),
    wouldBeWrong: COMMON_WRONG(trade),
    checklist: PRE_SEND_CHECKLIST,
    notes: BUY_NOTES,
    version: GUIDE_VERSION,
  };
}

/** Guide for shares already owned — only the stop still has to be placed. */
function existingPositionStopGuide(trade: GuideTrade): ExecutionGuide {
  const qty = shareText(trade.shares);
  const steps: GuideStep[] = [
    {
      n: 1,
      screen: 'Thinkorswim',
      action: 'Confirm the account selector reads paperMoney',
      expect: 'You are in the practice account.',
    },
    {
      n: 2,
      screen: 'Monitor',
      action: 'Open Monitor, then Activity and Positions',
      expect: `The Position Statement shows ${qty} ${trade.symbol} already owned.`,
      warning: 'If the buy is still under Working Orders you do not own the shares yet — wait for the fill.',
    },
    {
      n: 3,
      screen: 'Position Statement',
      action: `Right-click the ${trade.symbol} position row`,
      expect: 'A menu with Create Closing Order appears.',
    },
    {
      n: 4,
      screen: 'Right-click menu',
      action: 'Choose Create Closing Order, then Sell with STOP',
      expect: `A single sell line appears, already marked SELL -${qty} to close.`,
      warning: 'Do not use Sell To Open. That opens a short on top of the shares you own.',
    },
    {
      n: 5,
      screen: 'Order ticket',
      action: 'Check the quantity matches the shares you hold',
      value: `${qty} shares`,
      expect: `The line reads SELL -${qty} ${trade.symbol}.`,
      warning: 'A quantity larger than the position leaves you short once the stop fires.',
    },
    {
      n: 6,
      screen: 'Order ticket',
      action: 'Set the order type to STP and type the stop price',
      value: money(trade.stopPrice),
      expect: `The line reads @ ${money(trade.stopPrice)} STP.`,
      warning: 'LMT there is a profit order, not protection.',
    },
    {
      n: 7,
      screen: 'Order ticket',
      action: `Set the time in force to ${trade.timeInForce}`,
      value: trade.timeInForce,
      expect: `The line shows ${trade.timeInForce}.`,
    },
    {
      n: 8,
      screen: 'Order ticket',
      action: 'Click Confirm and Send, read the confirmation, then Send',
      expect: 'The confirmation repeats the symbol, quantity, stop price and time in force.',
    },
    {
      n: 9,
      screen: 'Monitor',
      action: 'Check Working Orders',
      expect: 'The stop is listed as working against the open position.',
      warning: 'Two sell orders means a duplicate. Cancel the extra one before it fires.',
    },
    {
      n: 10,
      screen: 'SwingEdge',
      action: 'Record the stop you actually placed',
      expect: 'SwingEdge stores the stop and flags it if the risk went up.',
    },
  ];

  return {
    key: `trade-EXISTING_POSITION_STOP-${trade.symbol}`,
    kind: 'EXISTING_POSITION_STOP',
    title: `Attach a stop to your ${trade.symbol} position`,
    subtitle: 'You already own the shares. This adds the protection you planned.',
    trade,
    summary: summaryRows(trade),
    steps,
    shouldSee: orderStructureLines(trade, 'EXISTING_POSITION_STOP'),
    wouldBeWrong: COMMON_WRONG(trade),
    checklist: PRE_SEND_CHECKLIST,
    notes: [
      'A position without a stop has no defined loss. Place it in the same session you were filled.',
      'If you tighten the stop later, record the reason in SwingEdge. Widening it to avoid a loss is a discipline violation.',
    ],
    version: GUIDE_VERSION,
  };
}

/** Build the guide for an approved trade. Pass a kind to force a specific sheet. */
export function buildExecutionGuide(trade: GuideTrade, kind?: GuideKind): ExecutionGuide {
  const resolved = kind ?? guideKindFor(trade);
  if (resolved === 'EXISTING_POSITION_STOP') return existingPositionStopGuide(trade);
  if (resolved === 'BUY_STOP_TARGET') return buyWithStopGuide(trade, true);
  return buyWithStopGuide(trade, false);
}

/* --------------------------------------------------------- practice sample */

/** Sample trade so the workflow can be practised with no approved trade open. */
export const SAMPLE_TRADE: GuideTrade = {
  symbol: 'SCHD',
  shares: 5,
  entryPrice: 34.12,
  entryOrderType: 'Limit',
  stopPrice: 32.51,
  targetPrice: 37.34,
  timeInForce: 'GTC',
  riskPerShare: 1.61,
  totalRisk: 8.05,
  rewardToRisk: 2,
  filled: false,
  setup: 'Pullback (sample)',
};

export const SAMPLE_NOTICE =
  'Sample trade for practice only. These are not live SwingEdge levels — build a real plan in the Trade Planner before trading.';

/* -------------------------------------------------- troubleshooting sheets */

function sheet(
  key: string,
  kind: GuideKind,
  title: string,
  subtitle: string,
  steps: GuideStep[],
  shouldSee: OrderLine[],
  wouldBeWrong: OrderLine[],
  notes: string[],
): ExecutionGuide {
  return {
    key,
    kind,
    title,
    subtitle,
    trade: null,
    summary: [],
    steps,
    shouldSee,
    wouldBeWrong,
    checklist: PRE_SEND_CHECKLIST,
    notes,
    version: GUIDE_VERSION,
  };
}

export const TROUBLESHOOTING_GUIDES: ExecutionGuide[] = [
  sheet(
    'ts-working-vs-filled',
    'TROUBLESHOOTING',
    'Working versus filled',
    'The single most common confusion. Working means the order is waiting. Filled means you own it.',
    [
      { n: 1, screen: 'Monitor', action: 'Open Monitor, then Activity and Positions', expect: 'Two panels: Working Orders and Position Statement.' },
      { n: 2, screen: 'Working Orders', action: 'Read the status column', expect: 'WORKING means nothing has traded yet.' },
      { n: 3, screen: 'Position Statement', action: 'Look for the symbol and a share count', expect: 'A row with quantity means the shares are owned.', warning: 'No row means no position, no matter what the order screen shows.' },
      { n: 4, screen: 'Working Orders', action: 'Check whether your stop is triggered by the buy', expect: 'TRG BY #1 means the stop waits for the fill.' },
    ],
    [
      { text: 'Working Orders: BUY +5 SCHD @ 34.12 LMT — WORKING', note: 'Not owned yet' },
      { text: 'Position Statement: SCHD 5 shares', note: 'Owned' },
    ],
    [{ text: 'Assuming a working buy means you are in the trade', note: 'Your stop is not protecting anything yet.' }],
    ['Only record a fill in SwingEdge once the Position Statement shows the shares.'],
  ),
  sheet(
    'ts-open-vs-close',
    'TROUBLESHOOTING',
    'To open versus to close',
    'To open starts a new position. To close exits one you already have.',
    [
      { n: 1, screen: 'Order ticket', action: 'Read the wording on the sell line', expect: 'A protective stop should be a closing order.' },
      { n: 2, screen: 'Position Statement', action: 'Create the stop by right-clicking the position row', expect: 'Thinkorswim marks it as a closing order for you.', warning: 'Building a sell from scratch can default to opening a short.' },
      { n: 3, screen: 'Monitor', action: 'After the stop fires, confirm the position is flat', expect: 'No SCHD row, and no negative share count.' },
    ],
    [{ text: 'SELL -5 SCHD @ 32.51 STP GTC (closing)', note: 'Exits the 5 shares you own' }],
    [{ text: 'SELL -5 SCHD TO OPEN', note: 'Opens a short. You now have two positions fighting each other.' }],
    ['If you ever see a negative share count you did not intend, close it immediately and journal what happened.'],
  ),
  sheet(
    'ts-limit-vs-stop',
    'TROUBLESHOOTING',
    'Limit versus stop',
    'A limit sits above the market for profit. A stop sits below for protection.',
    [
      { n: 1, screen: 'Order ticket', action: 'Set the profit exit to LMT above your entry', expect: 'It fills only at your price or better.' },
      { n: 2, screen: 'Order ticket', action: 'Set the protective exit to STP below your entry', expect: 'It becomes a market order once the stop price trades.', warning: 'A stop does not guarantee your price — a gap can fill lower.' },
      { n: 3, screen: 'Order ticket', action: 'Read both lines out loud before sending', expect: 'Target above, stop below, both attached to the same shares.' },
    ],
    [
      { text: 'SELL -5 SCHD @ 37.34 LMT GTC', note: 'Target' },
      { text: 'SELL -5 SCHD @ 32.51 STP GTC', note: 'Protection' },
    ],
    [{ text: 'SELL -5 SCHD @ 32.51 LMT GTC', note: 'Below the market as a limit — it fills at once and closes the trade for a loss you never planned.' }],
    ['If the two prices are swapped the trade is inverted. Cancel and rebuild the ticket.'],
  ),
  sheet(
    'ts-add-stop-to-filled',
    'TROUBLESHOOTING',
    'How to add a stop to a filled position',
    'You bought, and there is no protection on the position yet.',
    [
      { n: 1, screen: 'Monitor', action: 'Open Activity and Positions and find the position row', expect: 'The symbol with its share count.' },
      { n: 2, screen: 'Position Statement', action: 'Right-click the row and choose Create Closing Order, Sell with STOP', expect: 'A closing sell line with your share count already filled in.' },
      { n: 3, screen: 'Order ticket', action: 'Type your planned stop price and set GTC', expect: 'SELL -qty @ your stop STP GTC.' },
      { n: 4, screen: 'Order ticket', action: 'Confirm and send, then verify it is working', expect: 'The stop appears in Working Orders.' },
    ],
    [{ text: 'SELL -5 SCHD @ 32.51 STP GTC', note: 'Working against the open position' }],
    [{ text: 'Leaving the position with no stop overnight', note: 'The loss is then undefined.' }],
    ['Use the stop from the original plan, not a wider one chosen because price already moved against you.'],
  ),
  sheet(
    'ts-first-triggers-all',
    'TROUBLESHOOTING',
    'How to use First Triggers All',
    'The entry goes live first. The protective orders only activate once it fills.',
    [
      { n: 1, screen: 'Order ticket', action: 'Build the buy line first', expect: 'It is numbered Order #1.' },
      { n: 2, screen: 'Order ticket', action: 'Add the protective lines below it', expect: 'Each shows TRG BY #1.' },
      { n: 3, screen: 'Order ticket', action: 'Read the order rules text', expect: 'It says the first order triggers the others.', warning: 'No trigger means the stop is live immediately and can open a short.' },
    ],
    [{ text: 'BUY +5 SCHD @ 34.12 LMT', note: 'Order #1' }, { text: 'SELL -5 SCHD @ 32.51 STP GTC · TRG BY #1' }],
    [{ text: 'SELL -5 SCHD @ 32.51 STP GTC with no trigger', note: 'Fires before you own anything.' }],
    ['If the trigger text is missing, cancel and rebuild from the right-click Buy Custom menu.'],
  ),
  sheet(
    'ts-oco',
    'TROUBLESHOOTING',
    'How to use OCO',
    'One cancels the other: when the target fills the stop is removed, and the other way round.',
    [
      { n: 1, screen: 'Order ticket', action: 'Add both a target LMT and a stop STP for the same shares', expect: 'Two sell lines.' },
      { n: 2, screen: 'Order ticket', action: 'Group them as OCO', expect: 'The rules text says one cancels the other.', warning: 'Without OCO, one fill leaves the other order live and you end up short.' },
      { n: 3, screen: 'Monitor', action: 'After an exit, check Working Orders is clear', expect: 'No leftover sell order for that symbol.' },
    ],
    [{ text: 'SELL -5 SCHD @ 37.34 LMT GTC' }, { text: 'OR' }, { text: 'SELL -5 SCHD @ 32.51 STP GTC' }],
    [{ text: 'Two independent sell orders', note: 'Both can fill — the second one shorts the stock.' }],
    ['Check Working Orders after every exit. A leftover order is the quiet way to end up in an unplanned trade.'],
  ),
  sheet(
    'ts-stop-rejected',
    'TROUBLESHOOTING',
    'Why a stop was rejected',
    'Rejections are almost always one of five things.',
    [
      { n: 1, screen: 'Order ticket', action: 'Check the stop is below the current price for a long', expect: 'A stop above the market is rejected or fills instantly.' },
      { n: 2, screen: 'Order ticket', action: 'Check the quantity does not exceed the shares owned', expect: 'Quantity matches the position.' },
      { n: 3, screen: 'Order ticket', action: 'Check the order is a closing order, not opening', expect: 'It is marked to close.' },
      { n: 4, screen: 'Order ticket', action: 'Check the session and time in force', expect: 'Some stop types are not accepted outside regular hours.' },
      { n: 5, screen: 'Account', action: 'Confirm you are in the paperMoney account', expect: 'A wrong account is a common cause.' },
    ],
    [{ text: 'Stop accepted and listed under Working Orders' }],
    [{ text: 'Resending the same rejected ticket unchanged', note: 'Fix the cause first, or you will get duplicates.' }],
    ['If it keeps failing, cancel everything, verify the position, and rebuild the order from the position row.'],
  ),
  sheet(
    'ts-check-working-orders',
    'TROUBLESHOOTING',
    'How to check working orders',
    'A thirty-second habit that prevents most accidental positions.',
    [
      { n: 1, screen: 'Monitor', action: 'Open Monitor, then Activity and Positions', expect: 'Working Orders panel is visible.' },
      { n: 2, screen: 'Working Orders', action: 'Read every row: symbol, side, quantity, type, price, time in force', expect: 'Each row matches something in your plan.' },
      { n: 3, screen: 'Working Orders', action: 'Cancel anything you cannot explain', expect: 'Only intended orders remain.', warning: 'An order you cannot explain is a position waiting to happen.' },
      { n: 4, screen: 'SwingEdge', action: 'Note any cancellation in the journal', expect: 'The record matches what the platform shows.' },
    ],
    [{ text: 'One protective order per open position, and nothing else' }],
    [{ text: 'Two stops on the same shares', note: 'The second one shorts the stock after the first exits.' }],
    ['Do this at the end of every practice session, not just after placing an order.'],
  ),
];

/* ------------------------------------------------------- quick-start sheets */

export const QUICK_START_GUIDES: ExecutionGuide[] = [
  sheet(
    'qs-navigation',
    'QUICK_START',
    'Thinkorswim navigation',
    'The four screens you actually need, and nothing else.',
    [
      { n: 1, screen: 'Login', action: 'Log in and select paperMoney', expect: 'The platform header reads paperMoney.' },
      { n: 2, screen: 'Charts', action: 'Open Charts and set a daily chart with 20 EMA and 50 SMA', expect: 'The same two averages SwingEdge reads.' },
      { n: 3, screen: 'Trade', action: 'Open Trade, then All Products', expect: 'The order-entry screen.' },
      { n: 4, screen: 'Monitor', action: 'Open Monitor, then Activity and Positions', expect: 'Working Orders and the Position Statement.' },
      { n: 5, screen: 'Workspace', action: 'Save the layout', expect: 'The same four tabs open every session.' },
    ],
    [{ text: 'Charts · Trade · Monitor · paperMoney account selected' }],
    [{ text: 'Trading from a layout where you cannot see Working Orders', note: 'You will not notice unfilled or duplicate orders.' }],
    ['Week 1 of the course only asks you to navigate. No orders yet.'],
  ),
  sheet(
    'qs-compare-charts',
    'QUICK_START',
    'Open a candidate and compare charts',
    'Read the same chart in SwingEdge and Thinkorswim so the two never disagree.',
    [
      { n: 1, screen: 'SwingEdge Scanner', action: 'Pick a candidate and open it in the Analyzer', expect: 'Trend, levels and bias on screen.' },
      { n: 2, screen: 'Thinkorswim Charts', action: 'Load the same symbol on a daily chart', expect: 'Same candles as SwingEdge.' },
      { n: 3, screen: 'Thinkorswim Charts', action: 'Add the 20 EMA and 50 SMA', expect: 'The averages line up with the SwingEdge reading.' },
      { n: 4, screen: 'Both', action: 'Mark the support and resistance SwingEdge listed', expect: 'The same levels on both screens.', warning: 'If they disagree, check the timeframe before changing your plan.' },
    ],
    [{ text: 'Daily chart, 20 EMA, 50 SMA, your support and resistance marked' }],
    [{ text: 'Planning on a daily chart and executing off a 15-minute one', note: 'The daily thesis is what you are trading.' }],
    ['Week 2 of the course: build the watchlist and compare charts, still no orders.'],
  ),
];

/* ------------------------------------------------------- course integration */

export interface CourseHandout {
  week: number;
  title: string;
  description: string;
  /** Key of the guide to open, from any of the guide collections. */
  guideKey: string;
}

export const COURSE_HANDOUTS: CourseHandout[] = [
  { week: 1, title: 'Thinkorswim navigation guide', description: 'Find the four screens and save your layout. No trades this week.', guideKey: 'qs-navigation' },
  { week: 2, title: 'Open a candidate and compare charts', description: 'Read the same symbol in SwingEdge and Thinkorswim.', guideKey: 'qs-compare-charts' },
  { week: 3, title: 'Enter a pullback trade with a stop', description: 'Sample pullback trade, buy with an attached stop.', guideKey: 'sample-buy-with-stop' },
  { week: 4, title: 'Enter a breakout trade with a stop', description: 'Same order structure, breakout entry above the range.', guideKey: 'sample-breakout-with-stop' },
  { week: 5, title: 'Add a stop, a target, and manage the trade', description: 'Bracket order with OCO, plus stop modification rules.', guideKey: 'sample-buy-stop-target' },
  { week: 6, title: 'Complete execution workflow guide', description: 'Analyze, plan, execute, record, review — end to end.', guideKey: 'sample-buy-stop-target' },
];

export const STANDALONE_LESSON_KEY = 'enter-a-swing-trade-in-thinkorswim';

/* ------------------------------------------------------------- guide lookup */

const SAMPLE_BREAKOUT: GuideTrade = {
  ...SAMPLE_TRADE,
  entryPrice: 35.4,
  stopPrice: 33.62,
  targetPrice: 38.96,
  riskPerShare: 1.78,
  totalRisk: 8.9,
  setup: 'Breakout (sample)',
};

const SAMPLE_FILLED: GuideTrade = { ...SAMPLE_TRADE, filled: true, setup: 'Pullback (sample), already filled' };

/** Every ready-made guide the library can open, keyed for saving and reopening. */
export function libraryGuides(): ExecutionGuide[] {
  const samples: ExecutionGuide[] = [
    { ...buildExecutionGuide(SAMPLE_TRADE, 'BUY_WITH_STOP'), key: 'sample-buy-with-stop', title: 'Sample: buy a pullback with an attached stop' },
    { ...buildExecutionGuide(SAMPLE_BREAKOUT, 'BUY_WITH_STOP'), key: 'sample-breakout-with-stop', title: 'Sample: buy a breakout with an attached stop' },
    { ...buildExecutionGuide(SAMPLE_TRADE, 'BUY_STOP_TARGET'), key: 'sample-buy-stop-target', title: 'Sample: buy with a stop and a target (OCO)' },
    { ...buildExecutionGuide(SAMPLE_FILLED, 'EXISTING_POSITION_STOP'), key: 'sample-existing-stop', title: 'Sample: attach a stop to a position you already own' },
  ];
  return [...samples, ...QUICK_START_GUIDES, ...TROUBLESHOOTING_GUIDES];
}

export function guideByKey(key: string): ExecutionGuide | null {
  return libraryGuides().find((g) => g.key === key) ?? null;
}

/** True when a SwingEdge verdict or readiness band means the trade is approved. */
export function isApprovedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return s.includes('GO') || s.includes('READY') || s.includes('QUALIF');
}
