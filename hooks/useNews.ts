import { useState, useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import type { News, NewsInteractionType, GetActiveNewsParams } from '@/types/news.type';
import {
  getActiveNews,
  recordNewsView,
  recordNewsInteraction,
  getNewsById,
} from '@/services/news.service';

/**
 * Hook pour récupérer les actualités actives
 */
export const useActiveNews = (params: GetActiveNewsParams) => {
  const { userId, userType, userPrograms, isNewUser, limit } = params;

  const shouldFetch = !!userId;

  const { data, error, isLoading, mutate } = useSWR<News[]>(
    shouldFetch ? ['active-news', userId, userType, userPrograms, isNewUser, limit] : null,
    () => getActiveNews(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      revalidateOnReconnect: false,
    }
  );

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    news: data || [],
    error,
    isLoading,
    refresh,
  };
};

/**
 * Hook pour gérer les interactions avec les actualités
 */
export const useNewsInteraction = (newsId: string, userId: string) => {
  const [hasViewed, setHasViewed] = useState(false);
  const [isRecordingView, setIsRecordingView] = useState(false);

  /**
   * Enregistre une vue d'actualité
   */
  const recordView = useCallback(async () => {
    if (!newsId || !userId || hasViewed || isRecordingView) {
      return;
    }

    setIsRecordingView(true);

    try {
      // Récupérer les infos de l'appareil
      const deviceInfo = {
        platform: Platform.OS,
        model: Device.modelName,
        osVersion: Device.osVersion,
        appVersion: Constants.expoConfig?.version,
      };

      await recordNewsView({
        newsId,
        userId,
        deviceInfo,
      });

      setHasViewed(true);

      // Invalider le cache des actualités pour mettre à jour les compteurs
      globalMutate((key) => Array.isArray(key) && key[0] === 'active-news');
    } catch (error) {
      // Erreur lors de l'enregistrement de la vue
    } finally {
      setIsRecordingView(false);
    }
  }, [newsId, userId, hasViewed, isRecordingView]);

  /**
   * Enregistre une interaction (click, share, like, bookmark, dismiss)
   */
  const recordInteraction = useCallback(
    async (interactionType: NewsInteractionType, metadata?: Record<string, unknown>) => {
      if (!newsId || !userId) {
        return;
      }

      try {
        await recordNewsInteraction({
          newsId,
          userId,
          interactionType,
          metadata,
        });

        // Invalider le cache des actualités
        globalMutate((key) => Array.isArray(key) && key[0] === 'active-news');
      } catch (error) {
        // Erreur lors de l'enregistrement de l'interaction
      }
    },
    [newsId, userId]
  );

  /**
   * Enregistre un clic
   */
  const recordClick = useCallback(
    async (metadata?: Record<string, unknown>) => {
      await recordInteraction('click', metadata);
    },
    [recordInteraction]
  );

  /**
   * Enregistre un partage
   */
  const recordShare = useCallback(
    async (metadata?: Record<string, unknown>) => {
      await recordInteraction('share', metadata);
    },
    [recordInteraction]
  );

  /**
   * Enregistre un like
   */
  const recordLike = useCallback(
    async (metadata?: Record<string, unknown>) => {
      await recordInteraction('like', metadata);
    },
    [recordInteraction]
  );

  /**
   * Enregistre un bookmark
   */
  const recordBookmark = useCallback(
    async (metadata?: Record<string, unknown>) => {
      await recordInteraction('bookmark', metadata);
    },
    [recordInteraction]
  );

  /**
   * Enregistre un dismiss
   */
  const recordDismiss = useCallback(
    async (metadata?: Record<string, unknown>) => {
      await recordInteraction('dismiss', metadata);
    },
    [recordInteraction]
  );

  return {
    recordView,
    recordClick,
    recordShare,
    recordLike,
    recordBookmark,
    recordDismiss,
    hasViewed,
  };
};

/**
 * Hook pour récupérer une actualité par ID
 */
export const useNewsById = (newsId: string | undefined) => {
  const shouldFetch = !!newsId;

  const { data, error, isLoading } = useSWR<News | null>(
    shouldFetch ? ['news-by-id', newsId] : null,
    () => getNewsById(newsId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    news: data || null,
    error,
    isLoading,
  };
};
