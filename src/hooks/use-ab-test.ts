import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Stable visitor ID (persisted in localStorage)
function getVisitorId(): string {
  const key = 'prism_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// Deterministic variant assignment based on visitor ID + experiment name
function assignVariant(visitorId: string, experimentName: string, variantCount: number): number {
  let hash = 0;
  const str = visitorId + ':' + experimentName;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % variantCount;
}

export interface ABVariant {
  id: string;
  variant_key: string;
  name: string;
  config: Record<string, any>;
  is_control: boolean;
}

interface ExperimentData {
  experiment_id: string;
  variant: ABVariant;
  loading: boolean;
}

// Cache to avoid re-fetching experiments on every render
const experimentCache = new Map<string, { experiment_id: string; variants: ABVariant[] }>();

/**
 * Hook to run an A/B test. Automatically assigns a variant based on visitor ID
 * and tracks impressions.
 * 
 * @param experimentName - The target_element field matching the experiment
 * @param fallbackVariantKey - Default variant key if no experiment is running
 */
export function useABTest(experimentName: string, fallbackVariantKey = 'control'): ExperimentData & {
  trackClick: () => void;
  trackConversion: () => void;
  trackEvent: (eventType: string, metadata?: Record<string, any>) => void;
} {
  const [data, setData] = useState<{ experiment_id: string; variants: ABVariant[] } | null>(
    experimentCache.get(experimentName) || null
  );
  const [loading, setLoading] = useState(!experimentCache.has(experimentName));
  const visitorId = useMemo(() => getVisitorId(), []);
  const impressionSent = useRef(false);

  // Fetch experiment + variants
  useEffect(() => {
    if (experimentCache.has(experimentName)) {
      setData(experimentCache.get(experimentName)!);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchExperiment = async () => {
      try {
        const { data: experiments } = await supabase
          .from('ab_experiments')
          .select('id, name, target_element, status')
          .eq('target_element', experimentName)
          .eq('status', 'running')
          .limit(1);

        if (cancelled || !experiments?.length) {
          setLoading(false);
          return;
        }

        const exp = experiments[0];
        const { data: variants } = await supabase
          .from('ab_variants')
          .select('id, variant_key, name, config, is_control')
          .eq('experiment_id', exp.id)
          .order('created_at');

        if (cancelled || !variants?.length) {
          setLoading(false);
          return;
        }

        const cached = { experiment_id: exp.id, variants: variants as ABVariant[] };
        experimentCache.set(experimentName, cached);
        setData(cached);
      } catch {
        // silently fail – show default
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExperiment();
    return () => { cancelled = true; };
  }, [experimentName]);

  // Determine assigned variant
  const variant = useMemo<ABVariant>(() => {
    if (!data || !data.variants.length) {
      return { id: '', variant_key: fallbackVariantKey, name: 'Default', config: {}, is_control: true };
    }
    const idx = assignVariant(visitorId, experimentName, data.variants.length);
    return data.variants[idx];
  }, [data, visitorId, experimentName, fallbackVariantKey]);

  const experimentId = data?.experiment_id || '';

  // Track event helper
  const trackEvent = useCallback(
    async (eventType: string, metadata?: Record<string, any>) => {
      if (!experimentId || !variant.id) return;
      try {
        await supabase.from('ab_events').insert({
          experiment_id: experimentId,
          variant_id: variant.id,
          visitor_id: visitorId,
          event_type: eventType,
          metadata: metadata || null,
        });
      } catch {
        // silently fail
      }
    },
    [experimentId, variant.id, visitorId]
  );

  // Auto-track impression once
  useEffect(() => {
    if (!impressionSent.current && experimentId && variant.id) {
      impressionSent.current = true;
      trackEvent('impression');
    }
  }, [experimentId, variant.id, trackEvent]);

  const trackClick = useCallback(() => trackEvent('click'), [trackEvent]);
  const trackConversion = useCallback(() => trackEvent('conversion'), [trackEvent]);

  return { experiment_id: experimentId, variant, loading, trackClick, trackConversion, trackEvent };
}

/**
 * Track scroll depth for any experiment. Call once on page mount.
 */
export function useScrollDepthTracking(experimentName: string) {
  const { experiment_id, variant, trackEvent } = useABTest(experimentName);
  const milestones = useRef(new Set<number>());

  useEffect(() => {
    if (!experiment_id) return;

    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const m of [25, 50, 75, 100]) {
        if (pct >= m && !milestones.current.has(m)) {
          milestones.current.add(m);
          trackEvent('scroll_depth', { depth: m });
        }
      }
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [experiment_id, trackEvent]);
}

/**
 * Track time on page.
 */
export function useTimeOnPageTracking(experimentName: string) {
  const { experiment_id, trackEvent } = useABTest(experimentName);
  const startTime = useRef(Date.now());
  const reported = useRef(false);

  useEffect(() => {
    if (!experiment_id) return;

    const handler = () => {
      if (reported.current) return;
      reported.current = true;
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      trackEvent('time_on_page', { seconds });
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      handler();
      window.removeEventListener('beforeunload', handler);
    };
  }, [experiment_id, trackEvent]);
}
