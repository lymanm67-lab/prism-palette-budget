// SwingEdge — Buy Zone alerts. Turns "price walked into the estimated entry
// zone" into an entry in the existing alert feed, at most once per symbol per
// day. Detection is pure; this hook only records what was detected.

import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  alertKey,
  buyZoneHits,
  todayKey,
  type BuyZoneHit,
  type BuyZoneRow,
} from '@/lib/swingedge/buyZoneAlerts';

const STORE_KEY = 'se-buyzone-alerts';

function sentToday(): Set<string> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { day: string; keys: string[] };
    if (parsed.day !== todayKey()) return new Set();
    return new Set(parsed.keys);
  } catch {
    return new Set();
  }
}

function remember(keys: Set<string>) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ day: todayKey(), keys: [...keys] }));
  } catch {
    /* storage unavailable — alerts still show on screen */
  }
}

/**
 * @param rows      scored watchlist rows
 * @param notify    false for demo data, so practice numbers never raise alerts
 */
export function useBuyZoneAlerts(rows: BuyZoneRow[], notify = true) {
  const { household } = useHousehold();
  const householdId = household?.id;
  const inFlight = useRef(false);

  const hits: BuyZoneHit[] = useMemo(() => buyZoneHits(rows), [rows]);

  useEffect(() => {
    if (!notify || !householdId || hits.length === 0 || inFlight.current) return;
    const already = sentToday();
    const day = todayKey();
    const fresh = hits.filter((h) => !already.has(alertKey(h.symbol, day)));
    if (fresh.length === 0) return;

    inFlight.current = true;
    (async () => {
      const { error } = await supabase.from('financial_insights').insert(
        fresh.map((h) => ({
          household_id: householdId,
          insight_type: 'trading',
          severity: 'info',
          message: `🎯 ${h.message}`,
          metadata: {
            type: 'swingedge_buy_zone',
            symbol: h.symbol,
            price: h.price,
            zone_low: h.low,
            zone_high: h.high,
            verdict: h.verdict,
          },
        })),
      );
      if (!error) {
        for (const h of fresh) already.add(alertKey(h.symbol, day));
        remember(already);
      }
      inFlight.current = false;
    })();
  }, [hits, householdId, notify]);

  return { hits };
}
