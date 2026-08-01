import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  contentKey,
  detectContentKind,
  isBlankValue,
  mergeNamespace,
  resolveValue,
  type ContentKind,
} from '@/lib/contentKeys';

export type SiteContentRow = {
  key: string;
  value: string | null;
  kind: string;
  updated_at: string;
  updated_by: string | null;
};

export type SiteContentMap = Record<string, string | null>;

export const SITE_CONTENT_QUERY_KEY = ['site-content'] as const;

/**
 * Loads every site_content row once and caches it for the session.
 * Exposes `get(key, fallback)` for resolving a single value.
 */
export function useSiteContent() {
  const query = useQuery({
    queryKey: SITE_CONTENT_QUERY_KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ map: SiteContentMap; rows: SiteContentRow[] }> => {
      const { data, error } = await supabase
        .from('site_content')
        .select('key, value, kind, updated_at, updated_by');
      if (error) throw error;
      const rows = (data ?? []) as SiteContentRow[];
      const map: SiteContentMap = {};
      for (const row of rows) map[row.key] = row.value;
      return { map, rows };
    },
  });

  const map = query.data?.map;

  const get = useCallback(
    (key: string, fallback = '') => resolveValue(key, fallback, map),
    [map],
  );

  const has = useCallback((key: string) => !isBlankValue(map?.[key]), [map]);

  return {
    map: map ?? {},
    rows: query.data?.rows ?? [],
    get,
    has,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** Overlay saved values for a whole namespace on top of a defaults object. */
export function useContentNamespace<T extends Record<string, string>>(
  namespace: string,
  defaults: T,
): { content: T; get: (field: keyof T & string) => string; isLoading: boolean } {
  const { map, isLoading } = useSiteContent();
  const content = mergeNamespace(namespace, defaults, map);
  const get = (field: keyof T & string) => content[field];
  return { content, get, isLoading };
}

/** Upsert a single content value (on conflict key). */
export function useSaveContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      key,
      value,
      kind,
    }: {
      key: string;
      value: string;
      kind?: ContentKind;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('site_content').upsert(
        {
          key,
          value,
          kind: kind ?? detectContentKind(key, value),
          updated_by: auth.user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );
      if (error) throw error;
      return { key, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SITE_CONTENT_QUERY_KEY });
    },
  });
}

/** Delete the row so the original hardcoded copy returns. */
export function useResetContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.from('site_content').delete().eq('key', key);
      if (error) throw error;
      return key;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SITE_CONTENT_QUERY_KEY });
    },
  });
}

export { contentKey };
