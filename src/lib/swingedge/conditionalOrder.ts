// SwingEdge — Thinkorswim conditional order preview and mirror guide.
//
// The preview is written in Thinkorswim's own order shorthand so what is typed
// into paperMoney matches what SwingEdge approved. Every number comes from the
// plan; nothing is invented, and a missing value says so.

import {
  GUIDE_VERSION,
  PRE_SEND_CHECKLIST,
  type ExecutionGuide,
  type GuideStep,
  type GuideTrade,
  type OrderLine,
} from './thinkorswimGuide';
import { CONDITION_LOGIC_TEXT, conditionSentences, type EntryCondition } from './conditionalStaging';

const money = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) ? `$${n.toFixed(2)}` : 'not set in the plan';

const qtyText = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : 'not set in the plan';

export interface ConditionalOrderPreview {
  parent: OrderLine;
  submitWhen: string[];
  logic: string;
  then: string;
  oco: OrderLine[];
}

/**
 * The order the user will build: one parent buy held back until the conditions
 * are true, then a one-cancels-the-other pair for the target and the stop.
 */
export function conditionalOrderPreview(
  trade: GuideTrade,
  conditions: EntryCondition[],
): ConditionalOrderPreview {
  const qty = qtyText(trade.shares);
  const submitWhen = conditionSentences(conditions);
  return {
    parent: {
      text: `BUY +${qty} ${trade.symbol} @ ${money(trade.entryPrice)} ${trade.entryOrderType.toUpperCase()}`,
      note: 'Parent order — held until every condition below is true',
    },
    submitWhen: submitWhen.length ? submitWhen : ['No conditions defined yet.'],
    logic: CONDITION_LOGIC_TEXT,
    then: '1ST TRIGGERS OCO',
    oco: [
      {
        text: `SELL -${qty} ${trade.symbol} @ ${money(trade.targetPrice)} LMT ${trade.timeInForce}`,
        note: 'Target — cancels the stop if it fills',
      },
      { text: 'OR' },
      {
        text: `SELL -${qty} ${trade.symbol} @ ${money(trade.stopPrice)} STP ${trade.timeInForce}`,
        note: 'Protective stop — cancels the target if it fills',
      },
    ],
  };
}

/** Flat text of the preview, ready to copy or read out while typing. */
export function conditionalOrderText(preview: ConditionalOrderPreview): string {
  return [
    preview.parent.text,
    'SUBMIT WHEN:',
    ...preview.submitWhen.map((s) => `  ${s}`),
    `  (${preview.logic})`,
    preview.then,
    ...preview.oco.map((o) => `  ${o.text}`),
  ].join('\n');
}

export const CONDITIONAL_GUIDE_KEY = 'conditional-entry';

/**
 * The mirror guide: an educational SwingEdge representation of the Thinkorswim
 * conditional-order workflow, not a copy of their screens.
 */
export function buildConditionalGuide(trade: GuideTrade, conditions: EntryCondition[]): ExecutionGuide {
  const preview = conditionalOrderPreview(trade, conditions);
  const qty = qtyText(trade.shares);
  const timeframe = conditions.find((c) => c.enabled)?.timeframe ?? '1 hour';

  const steps: GuideStep[] = [
    {
      n: 1,
      screen: 'paperMoney — Trade tab',
      action: `Load ${trade.symbol} and check the price on screen against your plan.`,
      value: trade.symbol,
      expect: 'The symbol and a live price are showing before you touch the order ticket.',
      warning: 'Confirm the account selector says paperMoney, not a live account.',
    },
    {
      n: 2,
      screen: 'Order ticket',
      action: 'Build the parent buy order with the approved share count and entry price.',
      value: preview.parent.text,
      expect: `The ticket reads BUY +${qty} ${trade.symbol} at ${money(trade.entryPrice)}.`,
      warning: 'Never raise the share count above the approved size, whatever buying power is shown.',
    },
    {
      n: 3,
      screen: 'Order ticket — gear icon',
      action: 'Open the order rules (the small gear on the order row).',
      expect: 'A rules panel appears with submission and cancellation settings.',
    },
    {
      n: 4,
      screen: 'Order rules — Submit',
      action: 'Choose to submit the order only when your conditions are true.',
      expect: 'The order is marked as conditional rather than sending straight away.',
    },
    {
      n: 5,
      screen: 'Order rules — Aggregation period',
      action: `Set the aggregation period to ${timeframe}.`,
      value: timeframe,
      expect: 'Every study condition below is read on that same period.',
      warning: 'A condition read on the wrong period is the most common cause of a surprise fill.',
    },
    {
      n: 6,
      screen: 'Order rules — Study conditions',
      action: 'Add each condition from your plan, then set the logic so all of them are required.',
      value: preview.submitWhen.join(' AND '),
      expect: `The rules panel lists every condition and reads "${preview.logic}"`,
    },
    {
      n: 7,
      screen: 'Order ticket — right click the parent order',
      action: 'Attach a 1st Triggers OCO bracket to the buy.',
      value: preview.then,
      expect: 'Two child orders appear underneath the buy, marked as one-cancels-the-other.',
    },
    {
      n: 8,
      screen: 'OCO — first leg',
      action: 'Set the profit target as a limit order, good till canceled.',
      value: preview.oco[0].text,
      expect: 'A closing sell limit sits at your target price.',
    },
    {
      n: 9,
      screen: 'OCO — second leg',
      action: 'Set the protective stop as a stop order, good till canceled.',
      value: preview.oco[2].text,
      expect: 'A closing sell stop sits at your stop price.',
      warning: 'STP, not LMT. A limit at your stop price will not protect you.',
    },
    {
      n: 10,
      screen: 'Confirm and Send',
      action: 'Read the confirmation screen line by line against the checklist below, then send.',
      expect: 'The confirmation shows one buy held by conditions and two closing orders paired as OCO.',
    },
    {
      n: 11,
      screen: 'Monitor — Working Orders',
      action: 'Check the parent order is listed as Working, not Filled.',
      expect: 'Working means it is waiting for the conditions. Filled means you are already in the trade.',
    },
    {
      n: 12,
      screen: 'SwingEdge — Trade Planner',
      action: 'Come back and mark the plan as armed, then record the fill when it happens.',
      expect: 'The plan reads "Waiting for condition" until you record the fill.',
      warning:
        'SwingEdge cannot see your broker. If you change or cancel the order in Thinkorswim, update the plan here too.',
    },
  ];

  return {
    key: CONDITIONAL_GUIDE_KEY,
    kind: 'BUY_STOP_TARGET',
    title: `Stage a conditional ${trade.symbol} entry in Thinkorswim`,
    subtitle: 'One buy held back by your conditions, with the target and stop attached as OCO.',
    trade,
    summary: [
      { label: 'Symbol', value: trade.symbol || 'not set' },
      { label: 'Shares', value: qty },
      { label: 'Entry', value: `${money(trade.entryPrice)} ${trade.entryOrderType}` },
      { label: 'Stop', value: `${money(trade.stopPrice)} Stop` },
      { label: 'Target', value: `${money(trade.targetPrice)} Limit` },
      { label: 'Time in force', value: trade.timeInForce },
      { label: 'Risk per share', value: money(trade.riskPerShare) },
      { label: 'Total risk', value: money(trade.totalRisk) },
      {
        label: 'Reward to risk',
        value: typeof trade.rewardToRisk === 'number' ? `${trade.rewardToRisk}:1` : 'not calculated',
      },
      { label: 'Conditions', value: String(preview.submitWhen.length) },
    ],
    steps,
    shouldSee: [
      preview.parent,
      { text: `SUBMIT WHEN: ${preview.submitWhen.join(' AND ')}`, note: preview.logic },
      { text: preview.then },
      ...preview.oco,
    ],
    wouldBeWrong: [
      { text: 'The buy shows as Filled straight away', note: 'The conditions were not attached to the order' },
      { text: 'The stop is a LMT order', note: 'A limit at the stop price gives no protection' },
      { text: 'Two sell orders both Working outside an OCO pair', note: 'You would sell twice' },
      { text: 'A share count larger than the approved size', note: 'That breaks your risk limit, not just the plan' },
    ],
    checklist: [
      ...PRE_SEND_CHECKLIST,
      'Conditions attached to the parent order',
      'Aggregation period matches the plan',
      'Parent order shows as Working, not Filled',
    ],
    notes: [
      'Conditions delay the order — they do not improve the trade. Read the setup again when they trigger.',
      'Thinkorswim remains the real record of your broker orders. SwingEdge records your plan.',
    ],
    version: GUIDE_VERSION,
  };
}
