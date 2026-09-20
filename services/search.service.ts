// services/search.service.ts
// "Search anything" — recherche sémantique (embeddings) sur tout le contenu
// de l'app, personnalisée par le pays et les programmes suivis de
// l'utilisateur. Appelle directement l'edge function search-anything
// (verify_jwt=true), pas une RPC classique — le calcul de l'embedding de la
// requête se fait côté Cloudflare, pas dans l'app.

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import type { TaggedFeedContentType } from '@/services/feed.service';

export type SearchResult = {
  type: TaggedFeedContentType;
  id: string;
  label: string;
  subtitle: string | null;
  route: string;
  similarity: number;
  is_enrolled: boolean;
};

const SEARCH_ANYTHING_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/search-anything`;

export type SearchMode = 'results' | 'explain';

export type SearchAnythingOutcome = {
  results: SearchResult[];
  // Texte généré par l'IA à partir des résultats (mode 'explain' seulement) —
  // null si mode 'results', ou si la génération a échoué (les résultats
  // restent quand même exploitables).
  explanation: string | null;
  // true si la recherche a échoué côté réseau/serveur (timeout, HTTP error...)
  // — distinct d'une recherche qui a bien tourné mais n'a rien trouvé.
  error: boolean;
};

export async function searchAnythingWithStatus(
  query: string,
  type?: TaggedFeedContentType,
  limit = 20,
  mode: SearchMode = 'results'
): Promise<SearchAnythingOutcome> {
  if (!query.trim()) return { results: [], explanation: null, error: false };

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      logger.warn('searchAnything: no active session');
      return { results: [], explanation: null, error: true };
    }

    const response = await fetch(SEARCH_ANYTHING_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query.trim(), type, limit, mode }),
    });

    if (!response.ok) {
      logger.error('searchAnything: HTTP error', response.status);
      return { results: [], explanation: null, error: true };
    }

    const json = await response.json();
    return {
      results: (json.results ?? []) as SearchResult[],
      explanation: (json.explanation ?? null) as string | null,
      error: false,
    };
  } catch (err) {
    logger.error('searchAnything error:', err);
    return { results: [], explanation: null, error: true };
  }
}

export async function searchAnything(
  query: string,
  type?: TaggedFeedContentType,
  limit = 20
): Promise<SearchResult[]> {
  const { results } = await searchAnythingWithStatus(query, type, limit);
  return results;
}
