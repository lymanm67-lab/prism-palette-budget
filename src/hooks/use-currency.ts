import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', CAD: 'en-CA',
  AUD: 'en-AU', JPY: 'ja-JP', CHF: 'de-CH', INR: 'en-IN',
  BRL: 'pt-BR', MXN: 'es-MX',
};

export function useCurrency() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const currency = profile?.currency || 'USD';
  const locale = CURRENCY_LOCALES[currency] || 'en-US';

  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      }).format(amount),
    [currency, locale]
  );

  const formatCompact = useCallback(
    (amount: number) => {
      const abs = Math.abs(amount);
      if (abs >= 1000) {
        const symbol = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(0).replace(/\d/g, '').trim();
        return `${symbol}${(amount / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
      }
      return formatCurrency(amount);
    },
    [currency, locale, formatCurrency]
  );

  return { currency, formatCurrency, formatCompact };
}
