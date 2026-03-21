import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCT_TO_TIER, type SubscriptionTier } from '@/lib/stripe-plans';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  subscribed: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionEnd: string | null;
  isTrial: boolean;
  isFounder: boolean;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  subscribed: false,
  subscriptionTier: null,
  subscriptionEnd: null,
  isTrial: false,
  isFounder: false,
  refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscribed(data.subscribed ?? false);
      setIsTrial(data.is_trial ?? false);
      setSubscriptionEnd(data.subscription_end ?? null);
      if (data.product_id && PRODUCT_TO_TIER[data.product_id]) {
        setSubscriptionTier(PRODUCT_TO_TIER[data.product_id]);
      } else {
        setSubscriptionTier(null);
      }
    } catch (err) {
      console.error('check-subscription error:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check founder role when session changes
  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'founder')
        .maybeSingle()
        .then(({ data }) => {
          setIsFounder(!!data);
        });
    } else {
      setIsFounder(false);
    }
  }, [session]);

  // Check subscription when session changes
  useEffect(() => {
    if (session) {
      checkSubscription();
      const interval = setInterval(checkSubscription, 60_000);
      return () => clearInterval(interval);
    } else {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setIsTrial(false);
    }
  }, [session, isFounder]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
      subscribed: subscribed || isFounder,
      subscriptionTier: isFounder ? 'business' : subscriptionTier,
      subscriptionEnd,
      isTrial,
      isFounder,
      refreshSubscription: checkSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
