// Coach Arty — the guided exercise timer engine and cue script.
// Pure logic: builds a work/rest phase queue and the phrases Arty speaks.

export type WorkoutItem = {
  name: string;
  sets: number;
  reps: number;
  workSeconds: number;
  restSeconds: number;
};

export type Phase = {
  kind: 'prep' | 'work' | 'rest' | 'done';
  exercise: string;
  exerciseIndex: number;
  setIndex: number; // 1-based
  setsTotal: number;
  reps: number;
  seconds: number;
  label: string;
};

export const DEFAULT_ITEM: Omit<WorkoutItem, 'name'> = {
  sets: 3,
  reps: 12,
  workSeconds: 45,
  restSeconds: 45,
};

const PREP_SECONDS = 10;

export function buildPhases(items: WorkoutItem[]): Phase[] {
  const phases: Phase[] = [];
  items.forEach((item, ei) => {
    for (let s = 1; s <= Math.max(1, item.sets); s += 1) {
      if (ei === 0 && s === 1) {
        phases.push({
          kind: 'prep',
          exercise: item.name,
          exerciseIndex: ei,
          setIndex: s,
          setsTotal: item.sets,
          reps: item.reps,
          seconds: PREP_SECONDS,
          label: `Get set — ${item.name}`,
        });
      }
      phases.push({
        kind: 'work',
        exercise: item.name,
        exerciseIndex: ei,
        setIndex: s,
        setsTotal: item.sets,
        reps: item.reps,
        seconds: Math.max(5, item.workSeconds),
        label: `${item.name} — set ${s} of ${item.sets}`,
      });
      const isLast = ei === items.length - 1 && s === item.sets;
      if (!isLast) {
        phases.push({
          kind: 'rest',
          exercise: item.name,
          exerciseIndex: ei,
          setIndex: s,
          setsTotal: item.sets,
          reps: item.reps,
          seconds: Math.max(5, item.restSeconds),
          label: 'Rest',
        });
      }
    }
  });
  phases.push({
    kind: 'done',
    exercise: 'Session complete',
    exerciseIndex: items.length - 1,
    setIndex: 0,
    setsTotal: 0,
    reps: 0,
    seconds: 0,
    label: 'Session complete',
  });
  return phases;
}

export function totalSeconds(phases: Phase[]) {
  return phases.reduce((s, p) => s + p.seconds, 0);
}

/** Calorie burn from a timed session. MET defaults to ~3.5 for resistance work; 2.5 for static stretching. */
export function sessionCalories(seconds: number, weightLb: number, met = 3.5) {
  const kg = weightLb / 2.205;
  return Math.round((met * 3.5 * kg) / 200 * (seconds / 60));
}

const PUSH_LINES = [
  'Own this set.',
  'Slow on the way back — that is where the work is.',
  'Chest up, core tight.',
  'This is the rep that changes the number on the scale.',
  'Breathe out on the press.',
  'Steady tempo. No rushing.',
];

const REST_LINES = [
  'Rest. Shake it out and breathe.',
  'Easy breaths through the nose. Let the heart rate settle.',
  'Good work. Reset your grip.',
  'Rest up — next set is waiting.',
];

const pick = (arr: string[], seed: number) => arr[Math.abs(seed) % arr.length];

export type Verbosity = 'cues' | 'full';

/** What Arty says when a phase begins. */
export function phaseCue(
  phase: Phase,
  next: Phase | undefined,
  verbosity: Verbosity,
  seed: number,
  isStretch = false,
): string {
  const unit = isStretch ? 'breaths' : 'reps';
  if (phase.kind === 'prep') {
    return `Coach Arty here. We are starting ${phase.exercise}. ${phase.setsTotal} sets of ${phase.reps} ${unit}. Get set.`;
  }
  if (phase.kind === 'work') {
    const base = isStretch
      ? `Set ${phase.setIndex} of ${phase.setsTotal}. Hold for ${phase.reps} ${unit}. Settle into the stretch.`
      : `Set ${phase.setIndex} of ${phase.setsTotal}. ${phase.reps} ${unit}. Go.`;
    return verbosity === 'full' && !isStretch ? `${base} ${pick(PUSH_LINES, seed + phase.setIndex)}` : base;
  }
  if (phase.kind === 'rest') {
    const base = pick(REST_LINES, seed + phase.setIndex);
    const preview =
      next && next.kind === 'work' && next.exercise !== phase.exercise
        ? ` Next up, ${next.exercise}.`
        : '';
    return verbosity === 'full' ? `${base}${preview}` : `Rest.${preview}`;
  }
  return '';
}

/** Mid-phase cues keyed off the remaining seconds. */
export function tickCue(phase: Phase, remaining: number, verbosity: Verbosity): string | null {
  if (phase.kind === 'work') {
    if (remaining === 10) return 'Ten seconds.';
    if (remaining === 3) return 'Three, two, one.';
    if (verbosity === 'full' && remaining === Math.round(phase.seconds / 2)) return 'Halfway. Keep the form.';
    return null;
  }
  if (phase.kind === 'rest') {
    if (remaining === 5) return 'Five seconds. Get set.';
    return null;
  }
  if (phase.kind === 'prep' && remaining === 3) return 'Three, two, one.';
  return null;
}

export const WATER_CUE = 'Grab water. A few good sips before the next set.';

export function finishCue(setsDone: number, minutes: number, calories: number) {
  return `That is the session. ${setsDone} sets, ${minutes} minutes, about ${calories} calories burned. Logged it for you. Proud of you — same time tomorrow.`;
}
