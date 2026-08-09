// Morning Kickstart: the ordered wake-up ritual. Prayer/meditation first, then
// hydration, breakfast, Total Gym, walk, supplements.

export type KickstartStepKey =
  | 'mindfulness'
  | 'hydrate'
  | 'breakfast'
  | 'strength'
  | 'walk'
  | 'supplements';

export type KickstartStep = {
  key: KickstartStepKey;
  order: number;
  title: string;
  detail: string;
  action: string;
};

export const KICKSTART_STEPS: KickstartStep[] = [
  {
    key: 'mindfulness',
    order: 1,
    title: 'Prayer / meditation',
    detail: 'Sit still before the day starts. Set one intention you can carry into everything else.',
    action: 'Start the timer',
  },
  {
    key: 'hydrate',
    order: 2,
    title: 'Hydrate — 16 oz',
    detail: 'You wake up dehydrated. Water first, coffee second.',
    action: 'Log 16 oz',
  },
  {
    key: 'breakfast',
    order: 3,
    title: 'Healthy breakfast',
    detail: 'Protein-forward: eggs and 45-cal wheat toast, or oatmeal with almond milk.',
    action: 'Log breakfast',
  },
  {
    key: 'strength',
    order: 4,
    title: 'Total Gym session',
    detail: 'Coach Arty runs the sets, reps and rest so you only have to move.',
    action: 'Start with Coach Arty',
  },
  {
    key: 'walk',
    order: 5,
    title: 'Walk',
    detail: 'Thirty easy minutes after strength work burns fat and clears the head.',
    action: 'Log a walk',
  },
  {
    key: 'supplements',
    order: 6,
    title: 'Supplements',
    detail: 'Two Veyttisy Men’s 50+ gummies with food.',
    action: 'Mark taken',
  },
];

export const MINDFULNESS_TYPES = [
  'Prayer',
  'Meditation',
  'Scripture',
  'Gratitude',
  'Breathwork',
] as const;

export type MindfulnessType = (typeof MINDFULNESS_TYPES)[number];

export type KickstartState = Partial<Record<KickstartStepKey, boolean>>;

export function parseKickstart(raw: unknown): KickstartState {
  if (!raw || typeof raw !== 'object') return {};
  const out: KickstartState = {};
  for (const s of KICKSTART_STEPS) {
    const v = (raw as Record<string, unknown>)[s.key];
    if (v) out[s.key] = true;
  }
  return out;
}

export function kickstartProgress(state: KickstartState) {
  const done = KICKSTART_STEPS.filter((s) => state[s.key]).length;
  const total = KICKSTART_STEPS.length;
  return {
    done,
    total,
    pct: Math.round((done / total) * 100),
    complete: done === total,
    nextStep: KICKSTART_STEPS.find((s) => !state[s.key]) ?? null,
  };
}

/** Bonus points for a full ritual; partial credit per step. */
export function kickstartPoints(state: KickstartState) {
  const { done, complete } = kickstartProgress(state);
  return done * 10 + (complete ? 30 : 0);
}

export const MINDFULNESS_PRESETS = [3, 5, 10, 20];
