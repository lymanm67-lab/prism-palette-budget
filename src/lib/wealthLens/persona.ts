export type PersonaId =
  | 'fortress' | 'stockpiler' | 'status' | 'rush'
  | 'leak' | 'architect' | 'value' | 'bridge';

export interface Persona {
  id: PersonaId;
  name: string;
  mindset: 'Scarcity' | 'Abundance';
  drives: string;
  watch: string;
  strength: string;
  action: string;
}

export const PERSONAS: Persona[] = [
  { id: 'fortress', name: 'The Fortress Keeper', mindset: 'Scarcity', drives: 'Protects savings and feels safest when money stays put.', watch: 'May put off spending that would improve daily life.', strength: 'You build a solid safety cushion.', action: 'Choose one planned purchase this month that improves daily life and fund it on purpose.' },
  { id: 'stockpiler', name: 'The Stockpiler', mindset: 'Scarcity', drives: 'Builds assets and measures progress by how much they accumulate.', watch: 'May keep building wealth without giving it a clear purpose.', strength: 'You stay consistent at growing assets.', action: 'Write down what your wealth is for and attach a date to one goal.' },
  { id: 'status', name: 'The Status Chaser', mindset: 'Scarcity', drives: 'Pursues visible signs of success and wants to keep pace with peers.', watch: "May let someone else's lifestyle set their budget.", strength: 'You are motivated by visible progress.', action: 'Wait 48 hours before any purchase that is mainly for how it looks to others.' },
  { id: 'rush', name: 'The Rush Rider', mindset: 'Scarcity', drives: 'Spots opportunities quickly and feels pressure to act before they disappear.', watch: 'May risk too much on excitement, intuition, or fear of missing out.', strength: 'You notice opportunities early.', action: 'Set a maximum dollar amount you will risk on any single opportunity.' },
  { id: 'leak', name: 'The Leak Detective', mindset: 'Abundance', drives: 'Reduces avoidable risk and finds money slipping through the cracks.', watch: 'May spend more energy cutting costs than creating value.', strength: 'You find and stop waste.', action: 'Pair each cost you cut with one way to grow income or value.' },
  { id: 'architect', name: 'The Wealth Architect', mindset: 'Abundance', drives: 'Sets priorities, builds a plan, and turns it into action.', watch: 'May keep refining the plan when it is ready to test.', strength: 'You turn goals into clear plans.', action: 'Pick one part of your plan and put it into action this week, even if it is not perfect.' },
  { id: 'value', name: 'The Value Maker', mindset: 'Abundance', drives: 'Finds new ways to solve problems and create exchanges that benefit everyone involved.', watch: 'May spread time and money across too many ideas.', strength: 'You create new value and income.', action: 'Choose your top idea and pause the rest for 90 days.' },
  { id: 'bridge', name: 'The Wealth Bridge Builder', mindset: 'Abundance', drives: 'Connects people, resources, and systems to make new opportunities possible.', watch: 'May move into a collaboration before roles and expectations are clear.', strength: 'You open doors through relationships.', action: 'Before your next partnership, write down roles, money split and an exit plan.' },
];

export const personaById = (id: PersonaId) => PERSONAS.find((p) => p.id === id)!;

export interface QuizAnswer { text: string; persona: PersonaId }
export interface QuizQuestion { id: number; prompt: string; answers: QuizAnswer[] }

// Even questions use fortress/status/leak/value; odd use stockpiler/rush/architect/bridge.
// Each persona appears exactly 8 times across the 64 answers.
type Raw = [string, string, string, string, string];
const EVEN: PersonaId[] = ['fortress', 'status', 'leak', 'value'];
const ODD: PersonaId[] = ['stockpiler', 'rush', 'architect', 'bridge'];

const RAW: Raw[] = [
  ['You get an unexpected $2,000 bonus. What do you do first?', 'Put it all in savings and leave it alone.', 'Upgrade something people will notice, like your phone or car.', 'Check which bills or fees it could wipe out.', 'Use it to start a side project that could earn more.'],
  ['A friend says a stock is about to take off. You…', 'Add it to your long-term holdings and keep building.', 'Buy in today before you miss it.', 'Check whether it fits your plan first.', 'Ask who else is involved and how you could team up.'],
  ['Your car needs a $900 repair. How do you feel?', 'Uneasy about dipping into savings at all.', 'Tempted to trade it in for something nicer.', 'Glad you can shop around for the best price.', 'Curious whether you could earn the cost back with extra work.'],
  ['Payday arrives. Your first move is…', 'Move money into investments before anything else.', 'Look for something to put it into right away.', 'Follow the spending plan you already set.', 'Check in with your partner or team on shared goals.'],
  ['Friends plan an expensive trip. You…', 'Skip it to keep your savings safe.', 'Go, because everyone else is going.', 'Go, but find ways to cut the cost.', 'Offer to organize it in a way that adds value for the group.'],
  ['You hear about a limited-time business deal. You…', 'Prefer something that keeps adding to your net worth.', 'Jump in quickly so you don’t lose the chance.', 'Run the numbers against your plan.', 'Look for partners who can make it work.'],
  ['How do you feel about your monthly subscriptions?', 'Fewer is safer; you rarely add any.', 'You keep the ones that show you’re up to date.', 'You review them often and cancel what you don’t use.', 'You keep tools that help you create or earn.'],
  ['Your retirement account drops 10%. You…', 'Keep contributing so the pile keeps growing.', 'Want to move money somewhere hotter.', 'Check your plan and stay the course.', 'Talk with people you trust about next steps.'],
  ['A coworker shows off a new luxury purchase. You…', 'Feel relieved you saved instead.', 'Start thinking about getting something similar.', 'Wonder what it really cost them.', 'Think about what business could serve buyers like them.'],
  ['Someone offers you a side gig. You…', 'Take it and invest every extra dollar.', 'Say yes immediately; it could be big.', 'Check how it fits your time and goals.', 'Bring in someone else so it can grow.'],
  ['When money is tight, you mostly…', 'Stop spending on anything extra.', 'Keep up appearances anyway.', 'Hunt for leaks and wasted spending.', 'Look for a way to earn more.'],
  ['What does "wealthy" mean to you?', 'Having a large balance that keeps growing.', 'Being able to act fast on great chances.', 'Having a plan that runs on its own.', 'Having a network that creates opportunity.'],
  ['You find $40 you forgot about in an account. You…', 'Leave it there; it’s safer saved.', 'Treat yourself to something nice.', 'Use it to pay down a fee or balance.', 'Put it toward a tool for a new idea.'],
  ['A big decision must be made in 24 hours. You…', 'Pick the option that adds the most to your assets.', 'Go with your gut right away.', 'Make a quick list of pros, cons and numbers.', 'Call someone who has done this before.'],
  ['Thinking about insurance, you…', 'Buy extra coverage just to feel safe.', 'Choose what people in your circle have.', 'Compare policies to avoid overlap and waste.', 'Make sure your work and income are protected.'],
  ['Your ideal next five years look like…', 'A bigger portfolio every single year.', 'Several bold bets that pay off.', 'A clear plan you follow step by step.', 'Partnerships that open new doors.'],
];

export const QUESTIONS: QuizQuestion[] = RAW.map(([prompt, ...texts], i) => {
  const map = i % 2 === 0 ? EVEN : ODD;
  const answers = texts.map((text, k) => ({ text, persona: map[k] }));
  const rot = i % 4; // vary display order
  return { id: i + 1, prompt, answers: [...answers.slice(rot), ...answers.slice(0, rot)] };
});

export function personaCounts(questions = QUESTIONS): Record<PersonaId, number> {
  const c = Object.fromEntries(PERSONAS.map((p) => [p.id, 0])) as Record<PersonaId, number>;
  questions.forEach((q) => q.answers.forEach((a) => { c[a.persona] += 1; }));
  return c;
}

export function scoreAnswers(selected: Record<number, PersonaId>): Record<PersonaId, number> {
  const s = Object.fromEntries(PERSONAS.map((p) => [p.id, 0])) as Record<PersonaId, number>;
  Object.values(selected).forEach((p) => { s[p] += 1; });
  return s;
}

export interface PersonaResult {
  primary: PersonaId[]; // length > 1 means a tie (blended if tie-breaker skipped)
  secondary: PersonaId[];
  needsTieBreaker: boolean;
  scores: Record<PersonaId, number>;
}

export function resolveResult(scores: Record<PersonaId, number>, tieBreak?: PersonaId | 'skip'): PersonaResult {
  const distinct = [...new Set(Object.values(scores))].filter((v) => v > 0).sort((a, b) => b - a);
  const top = distinct[0] ?? 0;
  let primary = PERSONAS.filter((p) => scores[p.id] === top && top > 0).map((p) => p.id);
  const needsTieBreaker = primary.length > 1 && !tieBreak;
  let secondary: PersonaId[];
  if (primary.length > 1 && tieBreak && tieBreak !== 'skip' && primary.includes(tieBreak)) {
    secondary = primary.filter((p) => p !== tieBreak);
    primary = [tieBreak];
  } else {
    const second = distinct[1];
    secondary = second ? PERSONAS.filter((p) => scores[p.id] === second).map((p) => p.id) : [];
  }
  return { primary, secondary, needsTieBreaker, scores };
}
