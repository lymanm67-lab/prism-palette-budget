import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Map of known merchant names to their website domains for logo fetching.
 * Add entries as needed for common merchants.
 */
const MERCHANT_DOMAINS: Record<string, string> = {
  amazon: 'amazon.com',
  'amazon prime': 'amazon.com',
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  apple: 'apple.com',
  google: 'google.com',
  uber: 'uber.com',
  'uber eats': 'ubereats.com',
  lyft: 'lyft.com',
  doordash: 'doordash.com',
  grubhub: 'grubhub.com',
  instacart: 'instacart.com',
  walmart: 'walmart.com',
  target: 'target.com',
  costco: 'costco.com',
  starbucks: 'starbucks.com',
  'chick-fil-a': 'chick-fil-a.com',
  mcdonalds: 'mcdonalds.com',
  "mcdonald's": 'mcdonalds.com',
  chipotle: 'chipotle.com',
  'taco bell': 'tacobell.com',
  venmo: 'venmo.com',
  paypal: 'paypal.com',
  zelle: 'zellepay.com',
  'cash app': 'cash.app',
  hulu: 'hulu.com',
  'disney+': 'disneyplus.com',
  'disney plus': 'disneyplus.com',
  hbo: 'hbomax.com',
  youtube: 'youtube.com',
  twitch: 'twitch.tv',
  steam: 'store.steampowered.com',
  'whole foods': 'wholefoodsmarket.com',
  kroger: 'kroger.com',
  'trader joes': 'traderjoes.com',
  "trader joe's": 'traderjoes.com',
  aldi: 'aldi.us',
  cvs: 'cvs.com',
  walgreens: 'walgreens.com',
  'home depot': 'homedepot.com',
  lowes: 'lowes.com',
  "lowe's": 'lowes.com',
  ikea: 'ikea.com',
  t_mobile: 't-mobile.com',
  't-mobile': 't-mobile.com',
  verizon: 'verizon.com',
  'at&t': 'att.com',
  att: 'att.com',
  spectrum: 'spectrum.com',
  comcast: 'xfinity.com',
  xfinity: 'xfinity.com',
  lovable: 'lovable.dev',
  github: 'github.com',
  adobe: 'adobe.com',
  microsoft: 'microsoft.com',
  dropbox: 'dropbox.com',
  slack: 'slack.com',
  zoom: 'zoom.us',
  'planet fitness': 'planetfitness.com',
  'la fitness': 'lafitness.com',
  starz: 'starz.com',
  'spectrum mobile': 'spectrum.com',
  'best buy': 'bestbuy.com',
  nike: 'nike.com',
  adidas: 'adidas.com',
  sephora: 'sephora.com',
  nordstrom: 'nordstrom.com',
  'old navy': 'oldnavy.com',
  gap: 'gap.com',
  chase: 'chase.com',
  'wells fargo': 'wellsfargo.com',
  'bank of america': 'bankofamerica.com',
  citi: 'citi.com',
  citibank: 'citi.com',
  capital_one: 'capitalone.com',
  'capital one': 'capitalone.com',
};

function getDomain(merchant: string): string | null {
  const lower = merchant.toLowerCase().trim();
  // Direct match
  if (MERCHANT_DOMAINS[lower]) return MERCHANT_DOMAINS[lower];
  // Partial match: check if merchant starts with a known name
  for (const [key, domain] of Object.entries(MERCHANT_DOMAINS)) {
    if (lower.startsWith(key)) return domain;
  }
  return null;
}

interface MerchantIconProps {
  merchant: string | null;
  isIncome?: boolean;
  isDuplicate?: boolean;
  className?: string;
}

const MerchantIcon: React.FC<MerchantIconProps> = ({ merchant, isIncome, isDuplicate, className }) => {
  const [imgError, setImgError] = useState(false);
  const name = merchant || '?';
  const domain = merchant ? getDomain(merchant) : null;
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}?size=64` : null;

  const letter = name[0].toUpperCase();

  return (
    <div className={cn(
      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
      isDuplicate ? "bg-amber-100 dark:bg-amber-900/30" :
      isIncome ? "bg-emerald-100 dark:bg-emerald-900/30" :
      "bg-muted",
      className
    )}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-full w-full object-cover rounded-full"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span className={cn(
          "text-xs font-bold",
          isDuplicate ? "text-amber-600 dark:text-amber-400" :
          isIncome ? "text-emerald-600 dark:text-emerald-400" :
          "text-muted-foreground"
        )}>
          {letter}
        </span>
      )}
    </div>
  );
};

export default MerchantIcon;
