/**
 * Experiment definitions for seeding.
 * Each experiment targets a specific landing page element.
 */

export const EXPERIMENT_DEFINITIONS = {
  hero_headline: {
    name: 'Hero Headline Test',
    description: 'Test different hero headlines for conversion impact',
    target_element: 'hero_headline',
    variants: [
      {
        variant_key: 'control',
        name: 'Current Headline',
        is_control: true,
        config: {
          headline: "You're making money, but you still don't have a clear picture of where it's going.",
          subheadline: 'Prism shows you exactly where your money is going and what you can safely spend.',
          supporting: 'Know exactly what you can safely spend today, this week, and this month without guessing.',
        },
      },
      {
        variant_key: 'safe_spend',
        name: 'Safe-to-Spend Focus',
        is_control: false,
        config: {
          headline: 'Know exactly what you can safely spend — without guessing.',
          subheadline: 'Prism gives you one clear number based on your real income, bills, and spending.',
          supporting: 'See your full financial picture in the next 10 minutes.',
        },
      },
      {
        variant_key: 'ten_minutes',
        name: '10-Minute Promise',
        is_control: false,
        config: {
          headline: 'See exactly where your money is going — in the next 10 minutes.',
          subheadline: 'Prism replaces budgeting apps, spreadsheets, and guesswork with one clear system.',
          supporting: 'Know what you can safely spend today, this week, and this month.',
        },
      },
    ],
  },

  hero_cta: {
    name: 'Hero CTA Test',
    description: 'Test different CTA button text for click-through rate',
    target_element: 'hero_cta',
    variants: [
      { variant_key: 'control', name: 'Start Free Trial', is_control: true, config: { text: 'Start Your Free Trial' } },
      { variant_key: 'see_numbers', name: 'See My Numbers', is_control: false, config: { text: 'See My Numbers' } },
      { variant_key: 'clarity', name: 'Get Financial Clarity', is_control: false, config: { text: 'Get Financial Clarity' } },
      { variant_key: 'safe_spend', name: 'Show Safe-to-Spend', is_control: false, config: { text: 'Show Me My Safe-to-Spend' } },
    ],
  },

  safe_to_spend_visual: {
    name: 'Safe-to-Spend Visual Test',
    description: 'Test static numbers vs highlighted card vs interactive calculator',
    target_element: 'safe_to_spend_visual',
    variants: [
      { variant_key: 'control', name: 'Static Numbers', is_control: true, config: { style: 'static' } },
      { variant_key: 'highlighted', name: 'Highlighted Card', is_control: false, config: { style: 'highlighted' } },
      { variant_key: 'interactive', name: 'Interactive Calculator', is_control: false, config: { style: 'interactive' } },
    ],
  },

  pricing_headline: {
    name: 'Pricing Headline Test',
    description: 'Test different pricing section headlines',
    target_element: 'pricing_headline',
    variants: [
      { variant_key: 'control', name: 'Full Control', is_control: true, config: { headline: 'Choose the plan that gives you full control' } },
      { variant_key: 'one_system', name: 'One System', is_control: false, config: { headline: 'One system. Three ways to take control of your money' } },
    ],
  },

  pricing_guidance: {
    name: 'Pricing Guidance Test',
    description: 'Test with/without "Most users choose Premium" guidance',
    target_element: 'pricing_guidance',
    variants: [
      { variant_key: 'control', name: 'With Guidance', is_control: true, config: { showGuidance: true } },
      { variant_key: 'no_guidance', name: 'Without Guidance', is_control: false, config: { showGuidance: false } },
    ],
  },

  guardrail_visibility: {
    name: 'Guardrail System Visibility',
    description: 'Test how prominently the progression system is displayed',
    target_element: 'guardrail_visibility',
    variants: [
      { variant_key: 'control', name: 'Current', is_control: true, config: { visibility: 'normal' } },
      { variant_key: 'reduced', name: 'Reduced', is_control: false, config: { visibility: 'reduced' } },
      { variant_key: 'prominent', name: 'Prominent with Progress Bar', is_control: false, config: { visibility: 'prominent' } },
    ],
  },
} as const;
