import { describe, it, expect } from 'vitest';
import { pickMentorTop5, type MentorCandidate } from './mentorTop5';

const base: MentorCandidate = {
  symbol: 'AAA',
  verdict: 'QUALIFIES',
  score: 80,
  setup: 'PULLBACK',
  rewardRisk: 2.2,
  eventBand: 'LOW',
  liquidityGrade: 'HIGH',
  pressureState: 'BUYERS_IN_CONTROL',
  biasDirection: 'UP',
};

const cand = (over: Partial<MentorCandidate>): MentorCandidate => ({ ...base, ...over });

describe('mentor top 5 — quality bar', () => {
  it('excludes names that fail the selection criteria', () => {
    const result = pickMentorTop5(
      [
        cand({ symbol: 'GOOD1' }),
        cand({ symbol: 'LOWRR', rewardRisk: 1.8 }),
        cand({ symbol: 'SEVERE', eventBand: 'SEVERE' }),
        cand({ symbol: 'THIN', liquidityGrade: 'THIN' }),
        cand({ symbol: 'SELLERS', pressureState: 'SELLERS_IN_CONTROL' }),
        cand({ symbol: 'DOWN', biasDirection: 'DOWN' }),
        cand({ symbol: 'NOSETUP', setup: 'NONE' }),
        cand({ symbol: 'DNQ', verdict: 'DOES_NOT_QUALIFY' }),
        cand({ symbol: 'NOGEO', rewardRisk: null }),
      ],
      [],
    );
    expect(result.picks.map((p) => p.symbol)).toEqual(['GOOD1']);
    expect(result.short).toBe(true);
  });

  it('caps the list at five and prefers QUALIFIES over WATCH', () => {
    const symbols = ['XLE', 'SMH', 'XLF', 'TLT', 'GLD', 'XLV', 'XLU'];
    const result = pickMentorTop5(
      symbols.map((s, i) => cand({ symbol: s, score: 90 - i, verdict: i === 6 ? 'WATCH' : 'QUALIFIES' })),
      [],
    );
    expect(result.picks).toHaveLength(5);
    expect(result.picks.map((p) => p.symbol)).toEqual(['XLE', 'SMH', 'XLF', 'TLT', 'GLD']);
    expect(result.short).toBe(false);
  });
});

describe('mentor top 5 — diversification', () => {
  it('never picks two names from the same exposure family', () => {
    const result = pickMentorTop5(
      [
        cand({ symbol: 'XLE', score: 90 }),
        cand({ symbol: 'XOP', score: 88 }),
        cand({ symbol: 'USO', score: 86 }),
        cand({ symbol: 'SMH', score: 84 }),
      ],
      [],
    );
    expect(result.picks.map((p) => p.symbol)).toEqual(['XLE', 'SMH']);
    expect(result.skippedForDiversity.map((s) => s.symbol)).toEqual(['XOP', 'USO']);
  });

  it('skips families already held in open trades', () => {
    const result = pickMentorTop5(
      [cand({ symbol: 'XLE', score: 90 }), cand({ symbol: 'XLV', score: 85 })],
      ['XOP'], // already holding energy
    );
    expect(result.picks.map((p) => p.symbol)).toEqual(['XLV']);
    expect(result.skippedForDiversity.map((s) => s.symbol)).toEqual(['XLE']);
  });

  it('treats energy and oil-commodity as one concentration group', () => {
    const result = pickMentorTop5([cand({ symbol: 'USO' })], ['XLE']);
    expect(result.picks).toHaveLength(0);
  });
});

describe('mentor top 5 — honesty', () => {
  it('returns an empty list rather than padding with weak names', () => {
    const result = pickMentorTop5([cand({ symbol: 'WEAK', score: 20, rewardRisk: 1 })], []);
    expect(result.picks).toHaveLength(0);
    expect(result.short).toBe(true);
  });
});
