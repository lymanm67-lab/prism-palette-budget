// Guided meditation / prayer scripts for the Morning Kickstart timer.
// Cues are placed by percentage of elapsed session so any duration works.
import type { MindfulnessType } from '@/lib/health/kickstart';

export type GuidedCue = { atPct: number; text: string };

export type GuidedSession = {
  id: string;
  title: string;
  type: MindfulnessType;
  summary: string;
  cues: GuidedCue[];
};

export const GUIDED_SESSIONS: GuidedSession[] = [
  {
    id: 'morning-prayer',
    title: 'Morning Prayer',
    type: 'Prayer',
    summary: 'Thanksgiving, surrender, and one request for the day ahead.',
    cues: [
      { atPct: 0, text: 'Sit upright, hands open. Begin by simply saying thank you for this morning.' },
      { atPct: 15, text: 'Name three specific things you are grateful for. Say them slowly.' },
      { atPct: 35, text: 'Now bring your family to mind. Ask for protection and patience over each name.' },
      { atPct: 55, text: 'Hand over the thing you are carrying today. Release it, do not rehearse it.' },
      { atPct: 75, text: 'Ask for one thing only: the strength to do the next right step.' },
      { atPct: 92, text: 'Close in your own words. Amen. Carry that quiet with you.' },
    ],
  },
  {
    id: 'scripture-reflection',
    title: 'Scripture Reflection',
    type: 'Scripture',
    summary: 'Read one short passage, then sit with a single verse.',
    cues: [
      { atPct: 0, text: 'Read your passage once, out loud, at half speed.' },
      { atPct: 20, text: 'Read it again. Notice the one phrase that catches you.' },
      { atPct: 45, text: 'Repeat that phrase silently. Let it settle instead of explaining it.' },
      { atPct: 70, text: 'Ask what this asks of you today. One action, not a plan.' },
      { atPct: 90, text: 'Give thanks for the word. Hold that phrase into the morning.' },
    ],
  },
  {
    id: 'breath-body-scan',
    title: 'Breath and Body Scan',
    type: 'Meditation',
    summary: 'Settle attention with the breath, then release tension head to toe.',
    cues: [
      { atPct: 0, text: 'Close your eyes. In through the nose for four, out for six.' },
      { atPct: 18, text: 'Soften your jaw and forehead. Let the face go slack.' },
      { atPct: 36, text: 'Drop the shoulders. Feel the arms get heavy.' },
      { atPct: 54, text: 'Notice the chest and belly rising. Nothing to fix here.' },
      { atPct: 72, text: 'Release the hips, legs, and feet. Let the floor hold you.' },
      { atPct: 90, text: 'Take one full breath. Open your eyes when you are ready.' },
    ],
  },
  {
    id: 'gratitude-walkthrough',
    title: 'Gratitude Walkthrough',
    type: 'Gratitude',
    summary: 'Walk through people, provision, and progress.',
    cues: [
      { atPct: 0, text: 'Breathe out. Start with one person who made your life easier this week.' },
      { atPct: 25, text: 'Now something practical you have: a roof, food, work, health.' },
      { atPct: 50, text: 'Name one piece of progress, however small, from the last seven days.' },
      { atPct: 75, text: 'Name one hard thing you are grateful for because it shaped you.' },
      { atPct: 92, text: 'Sit in that for a moment. Gratitude first, then the day.' },
    ],
  },
  {
    id: 'box-breathing',
    title: 'Box Breathing',
    type: 'Breathwork',
    summary: 'Four-count square breathing to steady the nervous system.',
    cues: [
      { atPct: 0, text: 'In for four. Hold four. Out for four. Hold four. Follow my pace.' },
      { atPct: 20, text: 'In. Hold. Out. Hold. Keep the count even.' },
      { atPct: 45, text: 'Halfway. Same square, a little slower now.' },
      { atPct: 70, text: 'In. Hold. Out. Hold. Notice the heart rate settling.' },
      { atPct: 90, text: 'Let the count go. Breathe normally. You are ready.' },
    ],
  },
  {
    id: 'silent',
    title: 'Silent timer (no guidance)',
    type: 'Meditation',
    summary: 'Just the countdown, no narration.',
    cues: [],
  },
];

export function sessionsForType(type: string): GuidedSession[] {
  const matching = GUIDED_SESSIONS.filter((s) => s.type === type);
  const silent = GUIDED_SESSIONS.filter((s) => s.id === 'silent');
  return matching.length ? [...matching, ...silent.filter((s) => !matching.includes(s))] : GUIDED_SESSIONS;
}

/** The cue that should fire when `elapsed` of `total` seconds has passed, if any. */
export function cueAt(session: GuidedSession, elapsed: number, total: number): GuidedCue | null {
  if (!session.cues.length || total <= 0) return null;
  const pct = (elapsed / total) * 100;
  let current: GuidedCue | null = null;
  for (const c of session.cues) {
    if (pct + 0.0001 >= c.atPct) current = c;
  }
  return current;
}
