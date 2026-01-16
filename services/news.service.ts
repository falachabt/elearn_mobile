import { supabase } from '@/lib/supabase';
import type {
  News,
  GetActiveNewsParams,
  RecordNewsViewParams,
  RecordNewsInteractionParams,
  NewsStatistics,
} from '@/types/news.type';

/**
 * Récupère les actualités actives pour un utilisateur
 */
export const getActiveNews = async (params: GetActiveNewsParams): Promise<News[]> => {
  const {
    userId,
    userType = 'all',
    userPrograms = [],
    isNewUser = false,
    limit = 20,
  } = params;

  try {
    // Requête directe sans fonction RPC
    let query = supabase
      .from('news')
      .select('*')
      .eq('status', 'published')
      .lte('start_date', new Date().toISOString())
      .order('is_featured', { ascending: false })
      .order('priority', { ascending: false })
      .order('display_order', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);

    // Filtrer par end_date (NULL ou futur)
    query = query.or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

    // Filtrer par audience
    if (userType !== 'all') {
      query = query.or(`target_audience.eq.all,target_audience.eq.${userType}`);
    }

    // Filtrer par show_for_new_users_only
    // Si l'utilisateur n'est PAS nouveau, exclure les actualités réservées aux nouveaux
    if (!isNewUser) {
      query = query.eq('show_for_new_users_only', false);
    }
    // Si l'utilisateur EST nouveau, afficher toutes les actualités

    const { data, error } = await query;

    if (error) {
      console.error('[News Service] Error fetching active news:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[News Service] Exception in getActiveNews:', error);
    throw error;
  }
};

/**
 * Récupère une actualité par son ID
 */
export const getNewsById = async (newsId: string): Promise<News | null> => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', newsId)
      .single();

    if (error) {
      console.error('[News Service] Error fetching news by ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[News Service] Exception in getNewsById:', error);
    return null;
  }
};

/**
 * Enregistre une vue d'actualité
 */
export const recordNewsView = async (params: RecordNewsViewParams): Promise<void> => {
  const { newsId, userId, sessionId, deviceInfo } = params;

  try {
    // Insérer la vue directement
    const { error: insertError } = await supabase
      .from('news_views')
      .insert({
        news_id: newsId,
        user_id: userId,
        session_id: sessionId,
        device_info: deviceInfo,
        viewed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[News Service] Error inserting news view:', insertError);
      return;
    }

    // Incrémenter le compteur de vues
    // On récupère d'abord la valeur actuelle, puis on incrémente
    const { data: currentNews, error: fetchError } = await supabase
      .from('news')
      .select('view_count')
      .eq('id', newsId)
      .single();

    if (!fetchError && currentNews) {
      await supabase
        .from('news')
        .update({ view_count: (currentNews.view_count || 0) + 1 })
        .eq('id', newsId);
    }
  } catch (error) {
    console.error('[News Service] Exception in recordNewsView:', error);
    // Ne pas throw pour ne pas bloquer l'UI
  }
};

/**
 * Enregistre une interaction utilisateur
 */
export const recordNewsInteraction = async (
  params: RecordNewsInteractionParams
): Promise<void> => {
  const { newsId, userId, interactionType, metadata } = params;

  try {
    // Insérer l'interaction directement
    const { error: insertError } = await supabase
      .from('news_interactions')
      .insert({
        news_id: newsId,
        user_id: userId,
        interaction_type: interactionType,
        metadata,
        interacted_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[News Service] Error inserting news interaction:', insertError);
      return;
    }

    // Mettre à jour les compteurs selon le type
    const { data: currentNews, error: fetchError } = await supabase
      .from('news')
      .select('click_count, share_count')
      .eq('id', newsId)
      .single();

    if (!fetchError && currentNews) {
      if (interactionType === 'click') {
        await supabase
          .from('news')
          .update({ click_count: (currentNews.click_count || 0) + 1 })
          .eq('id', newsId);
      } else if (interactionType === 'share') {
        await supabase
          .from('news')
          .update({ share_count: (currentNews.share_count || 0) + 1 })
          .eq('id', newsId);
      }
    }
  } catch (error) {
    console.error('[News Service] Exception in recordNewsInteraction:', error);
    // Ne pas throw pour ne pas bloquer l'UI
  }
};

/**
 * Récupère les statistiques d'une actualité
 */
export const getNewsStatistics = async (newsId: string): Promise<NewsStatistics | null> => {
  try {
    const { data, error } = await supabase.rpc('get_news_statistics', {
      p_news_id: newsId,
    });

    if (error) {
      console.error('[News Service] Error fetching news statistics:', error);
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('[News Service] Exception in getNewsStatistics:', error);
    return null;
  }
};

/**
 * Vérifie si une actualité est visible pour un utilisateur
 */
export const isNewsVisibleForUser = async (
  newsId: string,
  userId: string,
  userType = 'all',
  userPrograms: string[] = [],
  isNewUser = false
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_news_visible_for_user', {
      p_news_id: newsId,
      p_user_id: userId,
      p_user_type: userType,
      p_user_programs: JSON.stringify(userPrograms),
      p_is_new_user: isNewUser,
    });

    if (error) {
      console.error('[News Service] Error checking news visibility:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[News Service] Exception in isNewsVisibleForUser:', error);
    return false;
  }
};
