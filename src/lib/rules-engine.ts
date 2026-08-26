/**
 * Confidence-based categorization engine.
 *
 * Matches transactions against the household's merchant normalization rules and
 * category rules, scoring every match so the UI can auto-apply only what it is
 * sure about and ask the user to confirm anything uncertain.
 */

export interface NormalizationRule {
  id: string;
  raw_pattern: string;
  normalized_name: string;
  is_global: boolean;
  household_id: string | null;
}

export interface CategoryRule {
  id: string;
  merchant_pattern: string;
  category_id: string;
  is_ai_generated: boolean;
  match_count: number;
}

export interface TxnLite {
  id: string;
  merchant: string | null;
  normalized_merchant: string | null;
  category_id: string | null;
  date: string;
  amount: number;
}

export type MatchKind = 'exact' | 'prefix' | 'contains' | 'fuzzy';

export interface ProposedChange {
  txnId: string;
  date: string;
  amount: number;
  beforeMerchant: string | null;
  afterMerchant: string | null;
  beforeCategoryId: string | null;
  afterCategoryId: string | null;
  ruleKey: string;
  ruleName: string;
  source: 'normalize_merchant' | 'auto_categorize';
  confidence: number;
  matchKind: MatchKind;
}

/** Threshold at or above which a match is safe to apply without confirmation. */
export const AUTO_APPLY_THRESHOLD = 0.85;

export const clean = (s: string | null | undefined) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Levenshtein similarity, 0..1. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const prev = new Array(n + 1).fill(0).map((_, i) => i);
  const cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return 1 - prev[n] / Math.max(m, n);
}

/** Score how confidently `pattern` describes `merchant`. */
export function scoreMatch(merchant: string, pattern: string): { confidence: number; kind: MatchKind } | null {
  const m = clean(merchant);
  const p = clean(pattern);
  if (!m || !p) return null;

  if (m === p) return { confidence: 1, kind: 'exact' };

  const boundary = new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
  if (boundary.test(m)) return { confidence: 0.92, kind: 'prefix' };
  if (m.startsWith(p)) return { confidence: 0.9, kind: 'prefix' };

  if (m.includes(p)) {
    // Short patterns inside long strings are risky ("dash" inside "dashboard").
    const ratio = p.length / m.length;
    const conf = p.length <= 4 ? 0.55 : ratio > 0.5 ? 0.82 : 0.7;
    return { confidence: conf, kind: 'contains' };
  }

  const sim = similarity(m, p);
  if (sim >= 0.72) return { confidence: Math.min(0.8, sim * 0.85), kind: 'fuzzy' };
  return null;
}

/**
 * Builds the list of changes the rules would make to the given transactions.
 * Merchant renames and category assignments are proposed independently so a
 * transaction can appear once for a rename and once for a re-category.
 */
export function buildRulePlan(
  txns: TxnLite[],
  normalizations: NormalizationRule[],
  categoryRules: CategoryRule[],
  categoryName: (id: string | null) => string
): ProposedChange[] {
  const out: ProposedChange[] = [];

  for (const t of txns) {
    const label = t.merchant || t.normalized_merchant || '';
    if (!label) continue;

    // --- merchant normalization ---
    let bestNorm: { rule: NormalizationRule; confidence: number; kind: MatchKind } | null = null;
    for (const r of normalizations) {
      const s = scoreMatch(label, r.raw_pattern);
      if (!s) continue;
      if (clean(label) === clean(r.normalized_name)) continue; // already normalized
      if (!bestNorm || s.confidence > bestNorm.confidence) {
        bestNorm = { rule: r, confidence: s.confidence, kind: s.kind };
      }
    }
    if (bestNorm) {
      out.push({
        txnId: t.id,
        date: t.date,
        amount: t.amount,
        beforeMerchant: t.merchant,
        afterMerchant: bestNorm.rule.normalized_name,
        beforeCategoryId: t.category_id,
        afterCategoryId: t.category_id,
        ruleKey: `norm:${bestNorm.rule.id}`,
        ruleName: `${bestNorm.rule.raw_pattern} → ${bestNorm.rule.normalized_name}`,
        source: 'normalize_merchant',
        confidence: bestNorm.confidence,
        matchKind: bestNorm.kind,
      });
    }

    // --- category assignment ---
    const effectiveMerchant = bestNorm ? bestNorm.rule.normalized_name : label;
    let bestCat: { rule: CategoryRule; confidence: number; kind: MatchKind } | null = null;
    for (const r of categoryRules) {
      const s = scoreMatch(effectiveMerchant, r.merchant_pattern);
      if (!s) continue;
      if (!bestCat || s.confidence > bestCat.confidence) {
        bestCat = { rule: r, confidence: s.confidence, kind: s.kind };
      }
    }
    if (bestCat && bestCat.rule.category_id !== t.category_id) {
      // AI-generated rules carry slightly less trust than ones the user created.
      const confidence = bestCat.rule.is_ai_generated
        ? Math.min(bestCat.confidence, 0.84)
        : bestCat.confidence;
      out.push({
        txnId: t.id,
        date: t.date,
        amount: t.amount,
        beforeMerchant: t.merchant,
        afterMerchant: null,
        beforeCategoryId: t.category_id,
        afterCategoryId: bestCat.rule.category_id,
        ruleKey: `cat:${bestCat.rule.id}`,
        ruleName: `${bestCat.rule.merchant_pattern} → ${categoryName(bestCat.rule.category_id)}`,
        source: 'auto_categorize',
        confidence,
        matchKind: bestCat.kind,
      });
    }
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

export interface RuleGroup {
  ruleKey: string;
  ruleName: string;
  source: ProposedChange['source'];
  confidence: number;
  matchKind: MatchKind;
  changes: ProposedChange[];
}

export function groupPlan(plan: ProposedChange[]): RuleGroup[] {
  const map = new Map<string, RuleGroup>();
  for (const c of plan) {
    let g = map.get(c.ruleKey);
    if (!g) {
      g = { ruleKey: c.ruleKey, ruleName: c.ruleName, source: c.source, confidence: c.confidence, matchKind: c.matchKind, changes: [] };
      map.set(c.ruleKey, g);
    }
    g.changes.push(c);
    g.confidence = Math.min(g.confidence, c.confidence);
    if (c.matchKind === 'fuzzy' || c.matchKind === 'contains') g.matchKind = c.matchKind;
  }
  return [...map.values()].sort((a, b) => b.changes.length - a.changes.length);
}
