import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const TRIAL_DAYS = 14;

export function useTrialCountdown() {
  const { user, subscribed, subscriptionTier, isFounder } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile-trial', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('trial_started_at')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const trialStartedAt = profile?.trial_started_at ? new Date(profile.trial_started_at) : null;
  const now = new Date();

  const trialEndDate = trialStartedAt
    ? new Date(trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    : null;

  const daysRemaining = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  const hasFullAccess = subscribed || isFounder || !!subscriptionTier;
  const trialExpired = daysRemaining === 0 && !hasFullAccess;
  const showTrialBanner = !hasFullAccess && !!trialStartedAt;

  return {
    daysRemaining,
    trialExpired,
    trialEndDate,
    showTrialBanner,
    trialStartedAt,
  };
}
