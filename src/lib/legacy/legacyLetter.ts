// Legacy Letter templates — personal letters to heirs alongside legal documents.

export interface LegacyLetterTemplate {
  id: string;
  recipient: string;
  title: string;
  prompts: string[];
  starter: string;
}

export const LEGACY_LETTER_TEMPLATES: LegacyLetterTemplate[] = [
  {
    id: "to-children",
    recipient: "Children",
    title: "To My Children",
    prompts: [
      "What do you most hope they carry forward from you?",
      "A story about a hard time you overcame and what it taught you.",
      "The values you want to see live on in the family.",
      "One piece of financial wisdom that took you years to learn.",
      "What legacy — beyond money — you want to leave.",
    ],
    starter: "My dear children,\n\nIf you are reading this, it means life has taken its natural course. I want you to know...",
  },
  {
    id: "to-spouse",
    recipient: "Spouse",
    title: "To My Beloved",
    prompts: [
      "Practical guidance on immediate financial next steps",
      "The password vault / advisor contacts",
      "Permission to grieve, and permission to move forward",
      "A love letter — not a memo",
    ],
    starter: "My love,\n\nBefore anything practical, I want you to know...",
  },
  {
    id: "to-grandchildren",
    recipient: "Grandchildren",
    title: "To My Grandchildren",
    prompts: [
      "The world you were born into, from my perspective",
      "Family stories you might not otherwise hear",
      "What I hope the family wealth accomplishes",
      "A blessing for your life",
    ],
    starter: "To the next generation,\n\nYou may not remember me well, but I want you to know who I was and what I hoped for you...",
  },
];
