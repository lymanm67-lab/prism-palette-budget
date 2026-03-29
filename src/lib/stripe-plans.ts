// Stripe product and price IDs for Prism subscription tiers
export const STRIPE_PLANS = {
  lite: {
    product_id: "free",
    monthly_price_id: null,
    annual_price_id: null,
    monthly: 0,
    yearly: 0,
  },
  personal: {
    product_id: "prod_UAv1UiRAAzrrib",
    monthly_price_id: "price_1TCZB1IbZ090SxFhaXi0N49i",
    annual_price_id: "price_1TCZB2IbZ090SxFhCldGxJAc",
    monthly: 12.99,
    yearly: 99,
  },
  premium: {
    product_id: "prod_UAv1qAGPHxfwQC",
    monthly_price_id: "price_1TCZB3IbZ090SxFh6TrDKgR8",
    annual_price_id: "price_1TCZB4IbZ090SxFhj7IhnXRy",
    monthly: 19.99,
    yearly: 149,
  },
  business: {
    product_id: "prod_UAv1k9QudNmVn7",
    monthly_price_id: "price_1TCZB6IbZ090SxFhRlu6g8JI",
    annual_price_id: "price_1TCZB7IbZ090SxFh77TWt1xs",
    monthly: 39.99,
    yearly: 349,
  },
} as const;

// Map product IDs back to tier names
export const PRODUCT_TO_TIER: Record<string, keyof typeof STRIPE_PLANS> = {
  [STRIPE_PLANS.personal.product_id]: "personal",
  // Also map the annual product IDs
  "prod_UAv1S7LbDzca2k": "personal",
  [STRIPE_PLANS.premium.product_id]: "premium",
  "prod_UAv1mUOM5MIxJ8": "premium",
  [STRIPE_PLANS.business.product_id]: "business",
  "prod_UAv1qtYevsYFcw": "business",
};

export type SubscriptionTier = keyof typeof STRIPE_PLANS | null;

// Feature gating helpers
const TIER_LEVEL: Record<string, number> = { lite: 0, personal: 1, premium: 2, business: 3 };

export const hasFeatureAccess = (userTier: SubscriptionTier, requiredTier: keyof typeof STRIPE_PLANS): boolean => {
  if (!userTier) return false;
  return (TIER_LEVEL[userTier] ?? 0) >= (TIER_LEVEL[requiredTier] ?? 0);
};

/** Plaid & AI require Premium or higher */
export const canUsePlaid = (tier: SubscriptionTier) => hasFeatureAccess(tier, 'premium');
export const canUseAI = (tier: SubscriptionTier) => hasFeatureAccess(tier, 'premium');
/** Lite is limited to 1 account */
export const getAccountLimit = (tier: SubscriptionTier): number => {
  if (!tier || tier === 'lite') return 1;
  return Infinity;
};
