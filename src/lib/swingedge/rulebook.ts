// SwingEdge — the personal rulebook.
//
// Rules are written in plain English. Each built-in rule carries an optional
// number the owner can change (a percent, a multiple, a count). Every rule is
// checked against what is actually measured on the screen; when a piece of data
// is missing the check reports NOT CHECKED instead of guessing.

export type RuleStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';

export type RuleTone = 'STOP' | 'CAUTION';

export interface RuleTemplate {
  key: string;
  /** Plain-English sentence. `{n}` is replaced by the owner's number. */
  sentence: string;
  /** Short label for tables and badges. */
  label: string;
  /** Null when the rule has no number to set. */
  defaultThreshold: number | null;
  unit: '%' | 'x' | 'points' | 'trades' | 'days' | null;
  min: number;
  max: number;
  step: number;
  /** How loudly a break should be flagged. */
  tone: RuleTone;
  why: string;
}

/** What the planner (or analyzer) measured right now. */
export interface RuleContext {
  riskPct: number | null;
  rewardRisk: number | null;
  openHeatPct: number | null;
  maxHeatPct: number | null;
  readinessScore: number | null;
  trendAligned: boolean | null;
  earningsDaysAway: number | null;
  eventDecision: string | null;
  stopWidened: boolean | null;
  tradesToday: number | null;
  invalidation: string | null;
  biasDirection: string | null;
}

export interface RuleRow {
  id: string;
  rule_key: string;
  enabled: boolean;
  threshold: number | null;
  custom_text: string | null;
  sort_order: number;
}

export interface RuleCheck {
  key: string;
  sentence: string;
  label: string;
  status: RuleStatus;
  tone: RuleTone;
  detail: string;
  custom: boolean;
}

export const CUSTOM_RULE_KEY = 'CUSTOM';

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    key: 'MAX_RISK_PCT',
    label: 'Risk per trade',
    sentence: 'I never risk more than {n}% of my trading capital on one trade.',
    defaultThreshold: 1,
    unit: '%',
    min: 0.1,
    max: 5,
    step: 0.1,
    tone: 'STOP',
    why: 'One oversized trade can undo a month of good ones.',
  },
  {
    key: 'MIN_REWARD_RISK',
    label: 'Reward vs risk',
    sentence: 'I only take a trade when the reward is at least {n} times the risk.',
    defaultThreshold: 2,
    unit: 'x',
    min: 1,
    max: 5,
    step: 0.25,
    tone: 'STOP',
    why: 'A smaller payoff needs a win rate most people never hold.',
  },
  {
    key: 'MAX_OPEN_HEAT',
    label: 'Total open risk',
    sentence: 'I keep all my open trades risking no more than {n}% of capital combined.',
    defaultThreshold: 5,
    unit: '%',
    min: 1,
    max: 20,
    step: 0.5,
    tone: 'STOP',
    why: 'Several small trades that fail together is still one big loss.',
  },
  {
    key: 'MIN_READINESS',
    label: 'Readiness score',
    sentence: 'I only enter when the trade readiness score is at least {n}.',
    defaultThreshold: 70,
    unit: 'points',
    min: 40,
    max: 95,
    step: 5,
    tone: 'CAUTION',
    why: 'A low score means several parts of the setup are not lined up.',
  },
  {
    key: 'TREND_ALIGNED',
    label: 'Trade with the trend',
    sentence: 'I only buy when price is holding above both the 20 EMA and the 50 SMA.',
    defaultThreshold: null,
    unit: null,
    min: 0,
    max: 0,
    step: 0,
    tone: 'CAUTION',
    why: 'Buying under the averages is fighting the direction of the chart.',
  },
  {
    key: 'NO_EARNINGS_HOLD',
    label: 'Clear of earnings',
    sentence: 'I stay out when earnings are within {n} days.',
    defaultThreshold: 5,
    unit: 'days',
    min: 1,
    max: 21,
    step: 1,
    tone: 'STOP',
    why: 'An earnings gap ignores your stop entirely.',
  },
  {
    key: 'EVENT_CALL_GO',
    label: 'Event check',
    sentence: 'I do not enter while the event check says wait or review.',
    defaultThreshold: null,
    unit: null,
    min: 0,
    max: 0,
    step: 0,
    tone: 'STOP',
    why: 'The calendar is the one risk you can see coming.',
  },
  {
    key: 'NO_WIDEN_STOP',
    label: 'Never widen a stop',
    sentence: 'I never move my stop further away from price.',
    defaultThreshold: null,
    unit: null,
    min: 0,
    max: 0,
    step: 0,
    tone: 'STOP',
    why: 'Widening a stop turns a planned loss into an unplanned one.',
  },
  {
    key: 'MAX_TRADES_PER_DAY',
    label: 'Trades per day',
    sentence: 'I open no more than {n} new trades in one day.',
    defaultThreshold: 3,
    unit: 'trades',
    min: 1,
    max: 10,
    step: 1,
    tone: 'CAUTION',
    why: 'Rapid entries are usually mood, not signal.',
  },
  {
    key: 'WRITTEN_INVALIDATION',
    label: 'Write the exit first',
    sentence: 'I write down what would prove me wrong before I enter.',
    defaultThreshold: null,
    unit: null,
    min: 0,
    max: 0,
    step: 0,
    tone: 'CAUTION',
    why: 'If you cannot name it now, you will argue with it later.',
  },
  {
    key: 'BIAS_NOT_AGAINST',
    label: 'Not against the tendency',
    sentence: 'I do not buy when similar past setups leaned downward.',
    defaultThreshold: null,
    unit: null,
    min: 0,
    max: 0,
    step: 0,
    tone: 'CAUTION',
    why: 'The measured tendency is the closest thing you have to an edge.',
  },
];

export const templateFor = (key: string): RuleTemplate | undefined =>
  RULE_TEMPLATES.find((t) => t.key === key);

export const ruleSentence = (template: RuleTemplate, threshold: number | null): string => {
  const n = threshold ?? template.defaultThreshold;
  if (n === null) return template.sentence;
  const shown = Number.isInteger(n) ? String(n) : String(n);
  return template.sentence.replace('{n}', shown);
};

/** The set of rules a brand-new owner starts with. */
export const defaultRuleSeeds = (): Array<Pick<RuleRow, 'rule_key' | 'threshold' | 'sort_order'>> =>
  RULE_TEMPLATES.map((t, i) => ({ rule_key: t.key, threshold: t.defaultThreshold, sort_order: i }));

const pass = (detail: string): { status: RuleStatus; detail: string } => ({ status: 'PASS', detail });
const fail = (detail: string): { status: RuleStatus; detail: string } => ({ status: 'FAIL', detail });
const unknown = (detail: string): { status: RuleStatus; detail: string } => ({
  status: 'NOT_CHECKED',
  detail,
});

const round = (n: number, dp = 2) => Number(n.toFixed(dp));

function evaluate(
  key: string,
  threshold: number | null,
  ctx: RuleContext,
): { status: RuleStatus; detail: string } {
  switch (key) {
    case 'MAX_RISK_PCT': {
      if (ctx.riskPct === null) return unknown('No position size worked out yet.');
      const limit = threshold ?? 1;
      return ctx.riskPct <= limit + 1e-9
        ? pass(`Risking ${round(ctx.riskPct)}% of capital.`)
        : fail(`Risking ${round(ctx.riskPct)}% — your rule is ${limit}%.`);
    }
    case 'MIN_REWARD_RISK': {
      if (!ctx.rewardRisk) return unknown('Set an entry, stop and target first.');
      const limit = threshold ?? 2;
      return ctx.rewardRisk >= limit - 1e-9
        ? pass(`Reward is ${round(ctx.rewardRisk)} times the risk.`)
        : fail(`Reward is only ${round(ctx.rewardRisk)} times the risk — your rule is ${limit}.`);
    }
    case 'MAX_OPEN_HEAT': {
      if (ctx.openHeatPct === null) return unknown('Open risk not available.');
      const limit = threshold ?? ctx.maxHeatPct ?? 5;
      return ctx.openHeatPct <= limit + 1e-9
        ? pass(`Open trades risk ${round(ctx.openHeatPct)}% of capital.`)
        : fail(`Open trades already risk ${round(ctx.openHeatPct)}% — your rule is ${limit}%.`);
    }
    case 'MIN_READINESS': {
      if (ctx.readinessScore === null) return unknown('Readiness score not worked out for this name.');
      const limit = threshold ?? 70;
      return ctx.readinessScore >= limit
        ? pass(`Readiness is ${Math.round(ctx.readinessScore)}.`)
        : fail(`Readiness is ${Math.round(ctx.readinessScore)} — your rule is ${limit}.`);
    }
    case 'TREND_ALIGNED': {
      if (ctx.trendAligned === null) return unknown('Not enough chart history to read the averages.');
      return ctx.trendAligned
        ? pass('Price is holding above both averages.')
        : fail('Price is not above both averages.');
    }
    case 'NO_EARNINGS_HOLD': {
      if (ctx.earningsDaysAway === null) return unknown('No earnings date on file for this name.');
      const limit = threshold ?? 5;
      return ctx.earningsDaysAway > limit
        ? pass(`Next earnings are ${Math.round(ctx.earningsDaysAway)} days out.`)
        : fail(`Earnings are ${Math.round(ctx.earningsDaysAway)} days away — your rule is ${limit}.`);
    }
    case 'EVENT_CALL_GO': {
      if (!ctx.eventDecision) return unknown('Event check has not run for this name.');
      return ctx.eventDecision === 'GO'
        ? pass('Event check says go.')
        : fail(`Event check says ${ctx.eventDecision.toLowerCase()}.`);
    }
    case 'NO_WIDEN_STOP': {
      if (ctx.stopWidened === null) return unknown('No original stop recorded to compare against.');
      return ctx.stopWidened
        ? fail('This stop sits further from price than the one your stop method suggests.')
        : pass('Stop is no wider than the one your method suggests.');
    }
    case 'MAX_TRADES_PER_DAY': {
      if (ctx.tradesToday === null) return unknown('Today\u2019s entries not counted yet.');
      const limit = threshold ?? 3;
      return ctx.tradesToday < limit
        ? pass(`${ctx.tradesToday} entries today.`)
        : fail(`${ctx.tradesToday} entries today — your rule is ${limit}.`);
    }
    case 'WRITTEN_INVALIDATION': {
      const text = (ctx.invalidation ?? '').trim();
      return text.length >= 10
        ? pass('You have written what would prove this wrong.')
        : fail('Nothing written yet for what would prove this wrong.');
    }
    case 'BIAS_NOT_AGAINST': {
      if (!ctx.biasDirection) return unknown('Not enough similar past setups to read a tendency.');
      return ctx.biasDirection === 'DOWN'
        ? fail('Similar past setups leaned downward.')
        : pass(`Similar past setups leaned ${ctx.biasDirection.toLowerCase()}.`);
    }
    default:
      return unknown('This is your own rule — check it yourself before you enter.');
  }
}

/** Check every switched-on rule against what is measured right now. */
export function checkRules(rules: RuleRow[], ctx: RuleContext): RuleCheck[] {
  return rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => {
      const template = templateFor(r.rule_key);
      const custom = !template;
      const result = evaluate(r.rule_key, r.threshold, ctx);
      return {
        key: r.id,
        sentence: template
          ? ruleSentence(template, r.threshold)
          : (r.custom_text ?? 'Your own rule').trim(),
        label: template?.label ?? 'My own rule',
        status: result.status,
        tone: template?.tone ?? 'CAUTION',
        detail: result.detail,
        custom,
      };
    });
}

export interface RuleVerdict {
  breaks: RuleCheck[];
  cautions: RuleCheck[];
  kept: RuleCheck[];
  unchecked: RuleCheck[];
  /** True only when nothing switched-on is failing. */
  clear: boolean;
  hardBreak: boolean;
}

export function summariseRules(checks: RuleCheck[]): RuleVerdict {
  const failed = checks.filter((c) => c.status === 'FAIL');
  return {
    breaks: failed.filter((c) => c.tone === 'STOP'),
    cautions: failed.filter((c) => c.tone === 'CAUTION'),
    kept: checks.filter((c) => c.status === 'PASS'),
    unchecked: checks.filter((c) => c.status === 'NOT_CHECKED'),
    clear: failed.length === 0,
    hardBreak: failed.some((c) => c.tone === 'STOP'),
  };
}
