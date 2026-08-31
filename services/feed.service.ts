// services/feed.service.ts
// Service de communication avec Supabase pour le fil d'actualité

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedPost = {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  updated_at: string;
  // Jointure : infos de l'auteur récupérées depuis la table users
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  // Nombre de commentaires (compté dynamiquement)
  comments_count?: number;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  score: number;
  created_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  // Vote de l'utilisateur connecté sur ce commentaire (-1, 0 ou 1)
  user_vote?: -1 | 0 | 1;
};

// ─── Fonctions du Service ─────────────────────────────────────────────────────

/**
 * Récupère la liste des posts du fil, du plus récent au plus ancien.
 * Inclut les infos de l'auteur et le nombre de commentaires.
 */
export async function getFeedPosts(): Promise<FeedPost[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('feed_posts')
      .select(`
        *,
        author:users(id, full_name, avatar_url),
        comments_count:post_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transformer le count retourné par Supabase
    return (data ?? []).map((post: any) => ({
      ...post,
      comments_count: post.comments_count?.[0]?.count ?? 0,
    }));
  } catch (err) {
    logger.error('getFeedPosts error:', err);
    return [];
  }
}

/**
 * Crée un nouveau post dans le fil.
 * @param content  - Le texte du post
 * @param mediaUrls - Tableau des URLs des images uploadées (peut être vide)
 * @param authorId  - L'ID de l'utilisateur connecté
 */
export async function createFeedPost(
  content: string,
  mediaUrls: string[],
  authorId: string
): Promise<FeedPost | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('feed_posts')
      .insert({
        content,
        media_urls: mediaUrls,
        author_id: authorId,
      })
      .select(`
        *,
        author:users(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data as FeedPost;
  } catch (err) {
    logger.error('createFeedPost error:', err);
    return null;
  }
}

/**
 * Supprime un post (seulement si l'utilisateur en est l'auteur).
 */
export async function deleteFeedPost(postId: string): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('feed_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
    return true;
  } catch (err) {
    logger.error('deleteFeedPost error:', err);
    return false;
  }
}

/**
 * Upload une image dans le bucket Supabase Storage "feed-media"
 * et retourne son URL publique.
 * @param fileUri  - URI locale du fichier (retourné par expo-image-picker)
 * @param userId   - ID de l'utilisateur (pour nommer le fichier de façon unique)
 */
export async function uploadPostImage(
  fileUri: string,
  userId: string
): Promise<string | null> {
  try {
    // Convertir l'URI locale en Blob pour l'upload
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const extension = fileUri.split('.').pop() ?? 'jpg';
    const fileName = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await (supabase.storage as any)
      .from('feed-media')
      .upload(fileName, blob, {
        contentType: `image/${extension}`,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Récupérer l'URL publique de l'image uploadée
    const { data } = (supabase.storage as any)
      .from('feed-media')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    logger.error('uploadPostImage error:', err);
    return null;
  }
}

/**
 * Upload un fichier audio dans le bucket Supabase Storage "feed-media"
 * et retourne son URL publique.
 * @param fileUri - URI locale du fichier audio (ex: .m4a)
 * @param userId  - ID de l'utilisateur (pour nommer le fichier de façon unique)
 */
export async function uploadPostAudio(
  fileUri: string,
  userId: string
): Promise<string | null> {
  try {
    // Convertir l'URI locale en Blob pour l'upload
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const extension = fileUri.split('.').pop() ?? 'm4a';
    const fileName = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await (supabase.storage as any)
      .from('feed-media')
      .upload(fileName, blob, {
        contentType: `audio/${extension}`,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Récupérer l'URL publique du fichier audio uploadé
    const { data } = (supabase.storage as any)
      .from('feed-media')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    logger.error('uploadPostAudio error:', err);
    return null;
  }
}

// ─── Commentaires ─────────────────────────────────────────────────────────────

/**
 * Récupère les commentaires d'un post, triés par score (le plus voté en premier).
 */
export async function getPostComments(
  postId: string,
  currentUserId: string
): Promise<PostComment[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('post_comments')
      .select(`
        *,
        author:users(id, full_name, avatar_url),
        votes:comment_votes(vote_type, user_id)
      `)
      .eq('post_id', postId)
      .order('score', { ascending: false });

    if (error) throw error;

    // Trouver le vote de l'utilisateur connecté sur chaque commentaire
    return (data ?? []).map((comment: any) => {
      const myVote = comment.votes?.find(
        (v: any) => v.user_id === currentUserId
      );
      return {
        ...comment,
        votes: undefined,
        user_vote: myVote ? myVote.vote_type : 0,
      } as PostComment;
    });
  } catch (err) {
    logger.error('getPostComments error:', err);
    return [];
  }
}

/**
 * Ajoute un commentaire à un post.
 */
export async function addComment(
  postId: string,
  content: string,
  authorId: string
): Promise<PostComment | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('post_comments')
      .insert({ post_id: postId, content, author_id: authorId })
      .select(`
        *,
        author:users(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return { ...data, user_vote: 0 } as PostComment;
  } catch (err) {
    logger.error('addComment error:', err);
    return null;
  }
}

// ─── Votes ────────────────────────────────────────────────────────────────────

/**
 * Vote sur un commentaire (+1 ou -1).
 * Si l'utilisateur a déjà voté dans le même sens → annule le vote.
 * Si l'utilisateur a voté dans l'autre sens → change le vote.
 */
export async function voteOnComment(
  commentId: string,
  userId: string,
  voteType: 1 | -1
): Promise<void> {
  try {
    // Vérifier si un vote existe déjà
    const { data: existing } = await (supabase as any)
      .from('comment_votes')
      .select('id, vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.vote_type === voteType) {
        // Même vote → on annule (suppression + décrémente le score)
        await (supabase as any)
          .from('comment_votes')
          .delete()
          .eq('id', existing.id);

        await (supabase.rpc as any)('increment_comment_score', {
          comment_id: commentId,
          delta: -voteType,
        });
      } else {
        // Vote inversé → on change (mise à jour + ajuste le score de 2)
        await (supabase as any)
          .from('comment_votes')
          .update({ vote_type: voteType })
          .eq('id', existing.id);

        await (supabase.rpc as any)('increment_comment_score', {
          comment_id: commentId,
          delta: voteType * 2,
        });
      }
    } else {
      // Pas de vote → on crée + incrémente le score
      await (supabase as any)
        .from('comment_votes')
        .insert({ comment_id: commentId, user_id: userId, vote_type: voteType });

      await (supabase.rpc as any)('increment_comment_score', {
        comment_id: commentId,
        delta: voteType,
      });
    }
  } catch (err) {
    logger.error('voteOnComment error:', err);
  }
}
