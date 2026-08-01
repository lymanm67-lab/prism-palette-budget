import { detectContentKind, humanizeKey, type ContentKind } from '@/lib/contentKeys';

export type ContentField = {
  /** Fully qualified key, e.g. `hero.headline` */
  key: string;
  label: string;
  /** The original hardcoded copy that ships with the app. */
  defaultValue: string;
  kind: ContentKind;
};

export type ContentGroup = {
  id: string;
  label: string;
  description: string;
  fields: ContentField[];
};

type FieldSpec = { field: string; label?: string; default: string; kind?: ContentKind };

const group = (
  id: string,
  label: string,
  description: string,
  specs: FieldSpec[],
): ContentGroup => ({
  id,
  label,
  description,
  fields: specs.map((s) => {
    const key = `${id}.${s.field}`;
    return {
      key,
      label: s.label ?? humanizeKey(key),
      defaultValue: s.default,
      kind: s.kind ?? detectContentKind(key, s.default),
    };
  }),
});

export const CONTENT_GROUPS: ContentGroup[] = [
  group('nav', 'Top Navigation', 'The header bar on the landing page.', [
    { field: 'brand', label: 'Brand name', default: 'PrismMoney™' },
    { field: 'link_benefits', label: 'Link: Benefits', default: 'Benefits' },
    { field: 'link_features', label: 'Link: Features', default: 'Features' },
    { field: 'link_pricing', label: 'Link: Pricing', default: 'Pricing' },
    { field: 'link_faq', label: 'Link: FAQ', default: 'FAQ' },
    { field: 'link_whats_new', label: "Link: What's New", default: "What's New" },
    { field: 'cta_signin', label: 'Button: Sign In', default: 'Sign In' },
    { field: 'cta_trial', label: 'Button: Start Free Trial', default: 'Start Free Trial' },
    { field: 'logo_image', label: 'Logo image', default: '', kind: 'image' },
  ]),

  group('hero', 'Hero Section', 'The first thing visitors see at the top of the landing page.', [
    { field: 'badge', label: 'Badge text', default: 'Your financial control system' },
    {
      field: 'headline',
      label: 'Headline',
      default:
        "You're making money, but you still don't have a clear picture of where it's going.",
    },
    {
      field: 'subheadline',
      label: 'Subheadline',
      default: 'Prism shows you exactly where your money is going and what you can safely spend.',
    },
    {
      field: 'supporting',
      label: 'Supporting line',
      default:
        'Know exactly what you can safely spend today, this week, and this month without guessing.',
    },
    { field: 'cta', label: 'Button label', default: 'Start Your Free Trial' },
    {
      field: 'cta_note',
      label: 'Text under button',
      default: 'See your full financial picture in the next 10 minutes.',
    },
    { field: 'product_image', label: 'Product screenshot', default: '', kind: 'image' },
  ]),

  group('value', 'First 10 Minutes', 'The "what you\'ll see" value section.', [
    { field: 'heading', label: 'Heading', default: "What you'll see in the first 10 minutes" },
  ]),

  group('sts', 'Safe-to-Spend Section', 'The Safe-to-Spend explainer block.', [
    { field: 'eyebrow', label: 'Eyebrow label', default: 'Your Safe-to-Spend Right Now' },
    { field: 'heading', label: 'Heading', default: 'Know exactly what you can safely spend' },
    {
      field: 'subheading',
      label: 'Subheading',
      default: 'No guessing. No spreadsheets. Just a clear number you can trust.',
    },
  ]),

  group('problem', 'Problem Section', 'Why managing money feels hard.', [
    {
      field: 'heading',
      label: 'Heading',
      default: 'Why managing money still feels harder than it should',
    },
  ]),

  group('benefits', 'Benefits Section', 'Why Prism beats a basic budget app.', [
    {
      field: 'eyebrow',
      label: 'Intro line',
      default: 'Prism replaces all of that with one clear system you can actually trust.',
    },
    { field: 'heading', label: 'Heading', default: 'Why Prism Is Worth More Than a Basic Budget App' },
  ]),

  group('bridge', 'Pre-Pricing Bridge', 'The short nudge right before pricing.', [
    {
      field: 'headline',
      label: 'Headline',
      default:
        'You can see exactly where your money is going and what you can safely spend — in the next 10 minutes.',
    },
    { field: 'cta', label: 'Button label', default: 'Start Your Free Trial' },
  ]),

  group('pricing', 'Pricing Section', 'Plan headline and reassurance copy.', [
    {
      field: 'guidance',
      label: 'Guidance line',
      default: 'Most users start with Premium for full financial clarity.',
    },
    {
      field: 'note',
      label: 'Value note',
      default: 'Most users recover the cost within the first 30 days.',
    },
    {
      field: 'footnote',
      label: 'Trial footnote',
      default: '14-day free trial · Cancel anytime · No credit card charged until trial ends',
    },
  ]),

  group('final_cta', 'Final Call to Action', 'The closing section of the landing page.', [
    { field: 'heading', label: 'Heading', default: 'Your money needs more than another tracker' },
    {
      field: 'subheading',
      label: 'Subheading',
      default:
        'Get clear, stay in control, and make confident decisions with your money — starting today.',
    },
    { field: 'cta', label: 'Button label', default: 'Start Your Free Trial' },
  ]),

  group('footer', 'Footer', 'Footer brand, links, and copyright.', [
    { field: 'brand', label: 'Brand name', default: 'PrismMoney™' },
    { field: 'link_privacy', label: 'Link: Privacy Policy', default: 'Privacy Policy' },
    { field: 'link_terms', label: 'Link: Terms of Service', default: 'Terms of Service' },
    { field: 'link_cookie', label: 'Link: Cookie Policy', default: 'Cookie Policy' },
    { field: 'link_whats_new', label: "Link: What's New", default: "What's New" },
    { field: 'copyright', label: 'Copyright suffix', default: 'PrismMoney™. All rights reserved.' },
    { field: 'logo_image', label: 'Footer logo image', default: '', kind: 'image' },
  ]),

  group('about', 'About Page', 'The story, designer bio, and mission copy.', [
    { field: 'hero_heading', label: 'Hero heading', default: 'The Story Behind PrismMoney™' },
    {
      field: 'hero_subheading',
      label: 'Hero subheading',
      default:
        'Built by someone who lived the financial struggle — and decided to build the tool they wished existed.',
    },
    { field: 'designer_eyebrow', label: 'Designer eyebrow', default: 'Meet the Designer' },
    { field: 'designer_heading', label: 'Designer heading', default: 'The Creator of PrismMoney™' },
    {
      field: 'designer_bio',
      label: 'Designer bio',
      default:
        "Designer, developer, and someone who understands what it's like to stare at a bank account and feel lost. PrismMoney™ was born out of a personal mission to make financial clarity accessible to everyone — not just those who can afford a financial advisor.",
    },
    {
      field: 'designer_credits',
      label: 'Designer credits',
      default: 'Designer · Developer · Financial Advocate',
    },
    { field: 'designer_photo', label: 'Designer photo', default: '', kind: 'image' },
    { field: 'origin_heading', label: 'Origin story heading', default: 'Why I Built This' },
    { field: 'mission_heading', label: 'Mission heading', default: 'The Mission' },
    {
      field: 'mission_body',
      label: 'Mission body',
      default:
        'Make financial literacy accessible to everyone — regardless of income, background, or financial education. No jargon, no judgment, just a clear path forward.',
    },
    { field: 'join_heading', label: 'Join heading', default: 'Join the Movement' },
  ]),
];

export const ALL_CONTENT_FIELDS: ContentField[] = CONTENT_GROUPS.flatMap((g) => g.fields);

export const FIELD_BY_KEY: Record<string, ContentField> = Object.fromEntries(
  ALL_CONTENT_FIELDS.map((f) => [f.key, f]),
);

/** Look up the shipped default for a key (empty string if unregistered). */
export const defaultFor = (key: string): string => FIELD_BY_KEY[key]?.defaultValue ?? '';

/** Look up the editor kind for a key. */
export const kindFor = (key: string): ContentKind =>
  FIELD_BY_KEY[key]?.kind ?? detectContentKind(key);
