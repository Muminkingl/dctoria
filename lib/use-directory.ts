import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { photoUrl, supabase } from '@/lib/supabase';
import { services, type CategoryId, type City, type Provider } from '@/lib/directory';

export interface ProviderRow {
  id: string; category: CategoryId; name: string; specialty: string; specialty_id: string;
  city: string; address: string; description: string; phone: string | null;
  latitude: number | null; longitude: number | null; services: string[]; available: boolean;
  rating_average: number; rating_count: number; cover_photo_path: string | null; created_at: string;
}
export const isProviderId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export function toProvider(row: ProviderRow): Provider {
  const theme = services.find(service => service.id === row.category)!;
  return {
    id: row.id, name: row.name, specialty: row.specialty, specialtyId: row.specialty_id,
    category: row.category, city: row.city, address: row.address, description: row.description,
    phone: row.phone, latitude: row.latitude, longitude: row.longitude, services: row.services,
    rating: row.rating_count ? Number(row.rating_average).toFixed(1) : '—', reviews: row.rating_count,
    initials: row.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join(''),
    photoUrl: photoUrl(row.cover_photo_path), color: theme.color, background: theme.iconBackground, available: row.available,
  };
}

function useDebouncedQuery(value: string) {
  const [query, setQuery] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setQuery(value), 250); return () => clearTimeout(timer); }, [value]);
  return query;
}

interface DirectoryFilters { query: string; category: CategoryId | null; city: City | null; specialty: string | null; favorites?: string[] }
interface Cursor { date: string; id: string }
const PAGE_SIZE = 20;

export function useDirectory(filters: DirectoryFilters) {
  const query = useDebouncedQuery(filters.query.trim());
  const ids = filters.favorites?.filter(isProviderId).sort();
  return useInfiniteQuery({
    queryKey: ['directory', query, filters.category, filters.city, filters.specialty, ids],
    initialPageParam: null as Cursor | null,
    queryFn: async ({ pageParam, signal }) => {
      if (ids && !ids.length) return [] as ProviderRow[];
      const { data, error } = await supabase.rpc('search_directory', {
        p_query: query, p_category: filters.category, p_city: filters.city, p_specialty: filters.specialty,
        p_ids: ids ?? null, p_limit: PAGE_SIZE, p_after: pageParam?.date ?? null, p_after_id: pageParam?.id ?? null,
      }).abortSignal(signal);
      if (error) throw error;
      return data as ProviderRow[];
    },
    getNextPageParam: rows => rows.length === PAGE_SIZE ? { date: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id } : undefined,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ['provider', id],
    enabled: isProviderId(id),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('directory_entries').select('*').eq('id', id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const photos = await supabase.from('provider_photos').select('id,storage_path,caption').eq('provider_id', id).order('position').abortSignal(signal);
      if (photos.error) throw photos.error;
      return { ...toProvider(data as ProviderRow), photos: photos.data.map(photo => ({ id: photo.id as string, url: photoUrl(photo.storage_path)!, caption: photo.caption as string })) };
    },
  });
}
