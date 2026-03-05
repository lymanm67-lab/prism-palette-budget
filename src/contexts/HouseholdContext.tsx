import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Household = Tables<'households'>;

interface HouseholdContextType {
  household: Household | null;
  loading: boolean;
}

const HouseholdContext = createContext<HouseholdContextType>({ household: null, loading: true });

export const useHousehold = () => useContext(HouseholdContext);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    const fetchOrCreate = async () => {
      // Check for existing membership
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
        const { data: hh } = await supabase
          .from('households')
          .select('*')
          .eq('id', membership.household_id)
          .single();
        setHousehold(hh);
      } else {
        // Create default household + membership + seed categories
        const { data: hh } = await supabase
          .from('households')
          .insert({ name: 'My Household' })
          .select()
          .single();

        if (hh) {
          await supabase.from('household_members').insert({
            household_id: hh.id,
            user_id: user.id,
            role: 'owner',
          });

          // Seed default category groups and categories
          const groups = [
            { name: 'Housing', color: '#7c5cf5', sort_order: 0 },
            { name: 'Food & Drink', color: '#2eb88a', sort_order: 1 },
            { name: 'Transportation', color: '#e5a525', sort_order: 2 },
            { name: 'Shopping', color: '#e5547a', sort_order: 3 },
            { name: 'Entertainment', color: '#3b9fe5', sort_order: 4 },
            { name: 'Health', color: '#5cb850', sort_order: 5 },
            { name: 'Income', color: '#2d9e6f', sort_order: 6 },
          ];

          for (const g of groups) {
            const { data: cg } = await supabase
              .from('category_groups')
              .insert({ ...g, household_id: hh.id })
              .select()
              .single();

            if (cg) {
              const cats: Record<string, string[]> = {
                Housing: ['Rent/Mortgage', 'Utilities'],
                'Food & Drink': ['Groceries', 'Restaurants'],
                Transportation: ['Gas', 'Public Transit'],
                Shopping: ['Clothing', 'Electronics'],
                Entertainment: ['Subscriptions', 'Movies & Games'],
                Health: ['Doctor', 'Pharmacy'],
                Income: ['Salary', 'Freelance'],
              };
              const catNames = cats[g.name] || [];
              for (let i = 0; i < catNames.length; i++) {
                await supabase.from('categories').insert({
                  group_id: cg.id,
                  household_id: hh.id,
                  name: catNames[i],
                  color: cg.color,
                  sort_order: i,
                });
              }
            }
          }

          setHousehold(hh);
        }
      }
      setLoading(false);
    };

    fetchOrCreate();
  }, [user]);

  return (
    <HouseholdContext.Provider value={{ household, loading }}>
      {children}
    </HouseholdContext.Provider>
  );
};
