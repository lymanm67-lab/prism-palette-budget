import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PROFILE, loadProfile, saveProfile, type HomeSearchProfile } from '@/lib/home-buying/search-profile';

export function useHomeSearchProfile() {
  const [profile, setProfileState] = useState<HomeSearchProfile>(DEFAULT_PROFILE);

  useEffect(() => { setProfileState(loadProfile()); }, []);

  const setProfile = useCallback((next: HomeSearchProfile | ((p: HomeSearchProfile) => HomeSearchProfile)) => {
    setProfileState((prev) => {
      const value = typeof next === 'function' ? (next as (p: HomeSearchProfile) => HomeSearchProfile)(prev) : next;
      saveProfile(value);
      return value;
    });
  }, []);

  const update = useCallback(<K extends keyof HomeSearchProfile>(key: K, value: HomeSearchProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, [setProfile]);

  const reset = useCallback(() => { setProfile(DEFAULT_PROFILE); }, [setProfile]);

  return { profile, setProfile, update, reset };
}

// -- Favorites --

export interface FavoriteEntry {
  id: string;
  address: string;
  url: string;
  price: number;
  savedAt: number;
  rank: number;
  notes: string;
  showingDate?: string;
  offerAmount?: number;
  offerStatus?: 'none' | 'submitted' | 'accepted' | 'rejected';
  inspectionNotes?: string;
  closingDate?: string;
  photos?: string[];
}

const FAV_KEY = 'prism.home-favorites.v1';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persist = (next: FavoriteEntry[]) => {
    setFavorites(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const add = (entry: Omit<FavoriteEntry, 'id' | 'savedAt' | 'rank' | 'notes'>) => {
    if (favorites.some((f) => f.url === entry.url)) return;
    persist([...favorites, {
      ...entry,
      id: crypto.randomUUID(),
      savedAt: Date.now(),
      rank: favorites.length + 1,
      notes: '',
    }]);
  };

  const remove = (id: string) => persist(favorites.filter((f) => f.id !== id));

  const update = (id: string, patch: Partial<FavoriteEntry>) =>
    persist(favorites.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const isFavorite = (url: string) => favorites.some((f) => f.url === url);

  return { favorites, add, remove, update, isFavorite };
}
