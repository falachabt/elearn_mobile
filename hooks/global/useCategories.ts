import useSWR from 'swr';

import { supabase } from '@/lib/supabase';

/**
 * Hook to fetch categories from the database.
 *
 * @returns An object containing the categories data, loading state, and any error encountered.
 */
export function useCategories() {
  const { data : categories, error, isLoading } = useSWR("/categories", async () => (await supabase.from("courses_categories").select("*")).data);

  return { categories, isLoading, error };
}
