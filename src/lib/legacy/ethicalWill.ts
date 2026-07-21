// Ethical Will — non-legal document capturing values, wisdom, and life lessons.

export const ETHICAL_WILL_SECTIONS = [
  {
    key: "values" as const,
    label: "Values",
    prompt: "What principles have guided your life? What do you refuse to compromise on?",
    examples: ["Integrity above income", "Family before career", "Generosity as a discipline"],
  },
  {
    key: "wisdom" as const,
    label: "Wisdom & Life Lessons",
    prompt: "What did you learn the hard way? What do you wish someone had told you at 25?",
    examples: ["Compound interest works on habits too", "Say the hard thing early"],
  },
  {
    key: "lessons" as const,
    label: "Failures I Learned From",
    prompt: "What mistakes shaped you? What would you do differently?",
    examples: ["The business I closed too late", "The relationship I neglected"],
  },
  {
    key: "blessings" as const,
    label: "Blessings & Hopes",
    prompt: "What do you hope for the family, the community, and the future?",
    examples: ["May your work matter", "May you know when to stop working"],
  },
] as const;

export type EthicalWillDraft = Record<
  (typeof ETHICAL_WILL_SECTIONS)[number]["key"],
  string
>;
