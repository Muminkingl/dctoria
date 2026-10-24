import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

const STORAGE_KEY = 'dctoria:favorites:v1';

interface FavoritesState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: PropsWithChildren) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted || !value) return;
        const saved: unknown = JSON.parse(value);
        if (Array.isArray(saved) && saved.every((item) => typeof item === 'string')) {
          setFavorites(saved.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)));
        }
      })
      .catch(() => { /* A storage failure must not prevent browsing. */ })
      .finally(() => { if (mounted) setHydrated(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (hydrated) {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {});
    }
  }, [favorites, hydrated]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  const value = useMemo(() => ({ favorites, toggleFavorite }), [favorites, toggleFavorite]);
  return createElement(FavoritesContext.Provider, { value }, children);
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside FavoritesProvider');
  return context;
}
