// services/feed.service.ts
// Service de communication avec Supabase pour le fil d'actualité

import { Platform } from 'react-native';
import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

/**
 * Lit le contenu d'un fichier local en octets, prêt pour l'upload Supabase Storage.
 * Sur natif, `fetch(uri).blob()` produit souvent un blob vide/corrompu pour les
 * URI `file://` (bug connu Expo/RN) — on lit directement les octets via
 * expo-file-system dans ce cas précis. Les URI `content://` (retournées par
 * expo-document-picker sur Android) ne sont pas supportées par la classe
 * `File` d'expo-file-system : on garde fetch().blob() pour celles-ci, ainsi
 * que sur web où l'URI est déjà un blob:/data: valide.
 */
async function readFileBytes(fileUri: string): Promise<Blob | Uint8Array> {
  if (Platform.OS !== 'web' && fileUri.startsWith('file://')) {
    return new File(fileUri).bytes();
  }
  const response = await fetch(fileUri);
  return response.blob();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PublicUserInfo = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_xp?: number;
  current_streak?: number;
  is_online?: boolean;
};

export type PollOption = {
  id: string;
  label: string;
  votes_count: number;
};

export type FeedPost = {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  bg_color: string | null;
  created_at: string;
  updated_at: string;
  author?: PublicUserInfo;
  comments_count?: number;
  likes_count?: number;
  liked_by_me?: boolean;
  // Les 2-3 premiers commentaires (aperçu affiché dans la carte du feed)
  preview_comments?: PostComment[];
  // Présent uniquement si le post est un sondage (poll_options non vide)
  poll_options?: PollOption[];
  poll_total_votes?: number;
  // Option choisie par l'utilisateur connecté, ou null s'il n'a pas encore voté
  poll_voted_option_id?: string | null;
  best_comment_id?: string | null;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  score: number;
  parent_comment_id: string | null;
  created_at: string;
  author?: PublicUserInfo;
  // Vote de l'utilisateur connecté sur ce commentaire (-1, 0 ou 1)
  user_vote?: -1 | 0 | 1;
  replies?: PostComment[];
};

// ─── Fonctions du Service ─────────────────────────────────────────────────────

/**
 * Récupère les infos publiques (nom, avatar, xp, série) d'une liste d'utilisateurs
 * via le RPC get_users_public_info (lit auth.users côté serveur, seule façon
 * d'accéder au nom/avatar Google puisqu'il n'y a pas de FK directe ici).
 */
async function fetchAuthorsByIds(
  ids: string[]
): Promise<Record<string, PublicUserInfo>> {
  if (ids.length === 0) return {};
  const { data, error } = await (supabase.rpc as any)('get_users_public_info', {
    user_ids: ids,
  });

  if (error) {
    logger.error('fetchAuthorsByIds error:', error);
    return {};
  }
  return Object.fromEntries((data ?? []).map((u: any) => [u.id, u]));
}

/**
 * Attache les données de sondage (options + décompte de votes + vote de
 * l'utilisateur) à une liste de posts, en mutant chaque post en place.
 * Ne fait rien pour les posts qui n'ont pas d'options (posts normaux).
 */
async function attachPollData(posts: FeedPost[], currentUserId?: string): Promise<void> {
  const postIds = posts.map((p) => p.id);
  if (postIds.length === 0) return;

  const { data: options, error: optionsError } = await (supabase as any)
    .from('poll_options')
    .select('id, post_id, label, position')
    .in('post_id', postIds)
    .order('position', { ascending: true });

  if (optionsError || !options || options.length === 0) return;

  const pollPostIds = [...new Set(options.map((o: any) => o.post_id))];

  const { data: votes } = await (supabase as any)
    .from('poll_votes')
    .select('post_id, option_id, user_id')
    .in('post_id', pollPostIds);

  const votesByOption = new Map<string, number>();
  const myVoteByPost = new Map<string, string>();
  (votes ?? []).forEach((v: any) => {
    votesByOption.set(v.option_id, (votesByOption.get(v.option_id) ?? 0) + 1);
    if (currentUserId && v.user_id === currentUserId) {
      myVoteByPost.set(v.post_id, v.option_id);
    }
  });

  const optionsByPost = new Map<string, PollOption[]>();
  options.forEach((o: any) => {
    const list = optionsByPost.get(o.post_id) ?? [];
    list.push({ id: o.id, label: o.label, votes_count: votesByOption.get(o.id) ?? 0 });
    optionsByPost.set(o.post_id, list);
  });

  posts.forEach((post) => {
    const opts = optionsByPost.get(post.id);
    if (opts) {
      post.poll_options = opts;
      post.poll_total_votes = opts.reduce((sum, o) => sum + o.votes_count, 0);
      post.poll_voted_option_id = myVoteByPost.get(post.id) ?? null;
    }
  });
}

/**
 * Récupère les infos publiques d'un seul utilisateur (profil public : avatar,
 * nom, xp, série). Utilisé par le bottom sheet de profil public.
 */
export async function getUserPublicProfile(
  userId: string
): Promise<PublicUserInfo | null> {
  const authors = await fetchAuthorsByIds([userId]);
  return authors[userId] ?? null;
}

/**
 * Récupère la liste des posts du fil, du plus récent au plus ancien.
 * Inclut auteur, nombre de commentaires, likes, et un aperçu des 2-3
 * meilleurs commentaires (pour affichage direct dans la carte du feed).
 */
export const FEED_PAGE_SIZE = 12;

const FEED_POST_SELECT = `
  *,
  comments:post_comments(id, post_id, author_id, content, score, parent_comment_id, created_at),
  likes:post_likes(user_id)
`;

async function mapAndEnrichPosts(rows: any[], currentUserId?: string): Promise<FeedPost[]> {
  const authorIds = new Set<string>();
  rows.forEach((p: any) => {
    authorIds.add(p.author_id);
    (p.comments ?? []).forEach((c: any) => authorIds.add(c.author_id));
  });
  const authors = await fetchAuthorsByIds([...authorIds]);

  const mapped = rows.map((post: any) => {
    const topLevelComments = (post.comments ?? [])
      .filter((c: any) => !c.parent_comment_id)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3)
      .map((c: any) => ({ ...c, author: authors[c.author_id] }));

    const likes = post.likes ?? [];

    return {
      ...post,
      author: authors[post.author_id],
      comments_count: (post.comments ?? []).length,
      likes_count: likes.length,
      liked_by_me: currentUserId
        ? likes.some((l: any) => l.user_id === currentUserId)
        : false,
      preview_comments: topLevelComments,
      comments: undefined,
      likes: undefined,
    } as FeedPost;
  });

  await attachPollData(mapped, currentUserId);
  return mapped;
}

export async function getFeedPosts(
  currentUserId?: string,
  options?: { limit?: number; beforeCreatedAt?: string }
): Promise<FeedPost[]> {
  try {
    let query = (supabase as any)
      .from('feed_posts')
      .select(FEED_POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? FEED_PAGE_SIZE);

    if (options?.beforeCreatedAt) {
      query = query.lt('created_at', options.beforeCreatedAt);
    }

    const { data, error } = await query;

    if (error) throw error;

    return await mapAndEnrichPosts(data ?? [], currentUserId);
  } catch (err) {
    logger.error('getFeedPosts error:', err);
    return [];
  }
}

/**
 * Récupère les posts "tendance" des 7 derniers jours (score = likes + 2*commentaires),
 * via le RPC get_trending_feed_post_ids. Liste bornée (top 20), pas de pagination :
 * la tendance est une vue "en ce moment", pas un flux à défilement infini.
 */
export async function getTrendingFeedPosts(currentUserId?: string): Promise<FeedPost[]> {
  try {
    const { data: idRows, error: idError } = await (supabase.rpc as any)(
      'get_trending_feed_post_ids',
      { p_limit: 20 }
    );
    if (idError) throw idError;

    const ids = (idRows ?? []).map((r: any) => r.id);
    if (ids.length === 0) return [];

    const { data, error } = await (supabase as any)
      .from('feed_posts')
      .select(FEED_POST_SELECT)
      .in('id', ids);

    if (error) throw error;

    const mapped = await mapAndEnrichPosts(data ?? [], currentUserId);

    const orderIndex = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
    mapped.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

    return mapped;
  } catch (err) {
    logger.error('getTrendingFeedPosts error:', err);
    return [];
  }
}

/**
 * Récupère un post unique par id (page de détail).
 */
export async function getPost(
  postId: string,
  currentUserId?: string
): Promise<FeedPost | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('feed_posts')
      .select(`
        *,
        likes:post_likes(user_id)
      `)
      .eq('id', postId)
      .single();

    if (error) throw error;

    const authors = await fetchAuthorsByIds([data.author_id]);
    const likes = data.likes ?? [];

    const post = {
      ...data,
      author: authors[data.author_id],
      likes_count: likes.length,
      liked_by_me: currentUserId
        ? likes.some((l: any) => l.user_id === currentUserId)
        : false,
      likes: undefined,
    } as FeedPost;

    await attachPollData([post], currentUserId);
    return post;
  } catch (err) {
    logger.error('getPost error:', err);
    return null;
  }
}

/**
 * Récupère les posts publiés par un utilisateur donné (utilisé par "Mes posts").
 */
export async function getUserPosts(authorId: string): Promise<FeedPost[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('feed_posts')
      .select(`
        *,
        comments_count:post_comments(count),
        likes:post_likes(user_id)
      `)
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const posts = data ?? [];
    const authors = await fetchAuthorsByIds([authorId]);

    const mapped = posts.map((post: any) => ({
      ...post,
      author: authors[authorId],
      comments_count: post.comments_count?.[0]?.count ?? 0,
      likes_count: (post.likes ?? []).length,
      liked_by_me: (post.likes ?? []).some((l: any) => l.user_id === authorId),
      likes: undefined,
    })) as FeedPost[];

    await attachPollData(mapped, authorId);
    return mapped;
  } catch (err) {
    logger.error('getUserPosts error:', err);
    return [];
  }
}

/**
 * Crée un nouveau post dans le fil.
 * @param content  - Le texte du post
 * @param mediaUrls - Tableau des URLs des images uploadées (peut être vide)
 * @param authorId  - L'ID de l'utilisateur connecté
 * @param bgColor   - Couleur de fond (hex) pour un post texte seul court, ou null
 */
export async function createFeedPost(
  content: string,
  mediaUrls: string[],
  authorId: string,
  bgColor?: string | null,
  pollOptions?: string[]
): Promise<FeedPost | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('feed_posts')
      .insert({
        content,
        media_urls: mediaUrls,
        author_id: authorId,
        bg_color: bgColor ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;

    const authors = await fetchAuthorsByIds([authorId]);
    const post = { ...data, author: authors[authorId] } as FeedPost;

    const cleanOptions = (pollOptions ?? []).map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length >= 2) {
      const { data: insertedOptions, error: pollError } = await (supabase as any)
        .from('poll_options')
        .insert(
          cleanOptions.map((label, index) => ({
            post_id: post.id,
            label,
            position: index,
          }))
        )
        .select('id, label');

      if (!pollError && insertedOptions) {
        post.poll_options = insertedOptions.map((o: any) => ({
          id: o.id,
          label: o.label,
          votes_count: 0,
        }));
        post.poll_total_votes = 0;
        post.poll_voted_option_id = null;
      }
    }

    return post;
  } catch (err) {
    logger.error('createFeedPost error:', err);
    return null;
  }
}

// ─── Sondages ─────────────────────────────────────────────────────────────────

/**
 * Enregistre le vote d'un utilisateur sur une option de sondage.
 * Un seul vote par utilisateur et par post (contrainte unique côté DB) ;
 * le vote n'est jamais modifiable une fois posé.
 */
/**
 * Marque (ou retire, si commentId est null) un commentaire comme "meilleure
 * réponse" du post. Réservé à l'auteur du post (vérifié côté serveur).
 */
export async function markBestAnswer(
  postId: string,
  commentId: string | null
): Promise<boolean> {
  try {
    const { error } = await (supabase.rpc as any)('set_best_answer', {
      p_post_id: postId,
      p_comment_id: commentId,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    logger.error('markBestAnswer error:', err);
    return false;
  }
}

export async function votePollOption(
  postId: string,
  optionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('poll_votes')
      .insert({ post_id: postId, option_id: optionId, user_id: userId });

    if (error) throw error;
    return true;
  } catch (err) {
    logger.error('votePollOption error:', err);
    return false;
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
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export async function uploadPostImage(
  fileUri: string,
  userId: string,
  mimeType?: string
): Promise<string | null> {
  try {
    const fileContent = await readFileBytes(fileUri);

    // Les URI content:// (expo-document-picker sur Android) n'ont souvent pas
    // d'extension dans l'URI elle-même : on préfère le mimeType renvoyé par le
    // picker, avec un fallback sur l'extension présente dans l'URI si besoin.
    const uriExtensionMatch = fileUri.match(/\.([a-zA-Z0-9]{2,5})(?:\?.*)?$/);
    const extension = (mimeType && MIME_TO_EXTENSION[mimeType]) ?? uriExtensionMatch?.[1] ?? 'jpg';
    const fileName = `${userId}/${Date.now()}.${extension}`;
    const contentType = mimeType ?? `image/${extension}`;

    const { error: uploadError } = await (supabase.storage as any)
      .from('feed-media')
      .upload(fileName, fileContent, {
        contentType,
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
    const fileContent = await readFileBytes(fileUri);

    const extension = fileUri.split('.').pop() ?? 'm4a';
    const fileName = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await (supabase.storage as any)
      .from('feed-media')
      .upload(fileName, fileContent, {
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

// ─── Likes ────────────────────────────────────────────────────────────────────

/**
 * Bascule le like d'un utilisateur sur un post (ajoute ou retire).
 * Retourne le nouvel état (true = liké).
 */
export async function toggleLikePost(
  postId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<boolean> {
  try {
    if (currentlyLiked) {
      const { error } = await (supabase as any)
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (error) throw error;
      return false;
    }

    const { error } = await (supabase as any)
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    return true;
  } catch (err) {
    logger.error('toggleLikePost error:', err);
    return currentlyLiked;
  }
}

// ─── Commentaires ─────────────────────────────────────────────────────────────

/**
 * Récupère les commentaires d'un post (triés par score), organisés en arbre :
 * commentaires de premier niveau avec leurs réponses (`replies`) imbriquées.
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
        votes:comment_votes(vote_type, user_id)
      `)
      .eq('post_id', postId)
      .order('score', { ascending: false });

    if (error) throw error;

    const rows = data ?? [];
    const authorIds = [...new Set(rows.map((c: any) => c.author_id))] as string[];
    const authors = await fetchAuthorsByIds(authorIds);

    const withAuthorAndVote = rows.map((comment: any) => {
      const myVote = comment.votes?.find(
        (v: any) => v.user_id === currentUserId
      );
      return {
        ...comment,
        author: authors[comment.author_id],
        votes: undefined,
        user_vote: myVote ? myVote.vote_type : 0,
        replies: [] as PostComment[],
      } as PostComment;
    });

    const byId = new Map<string, PostComment>(withAuthorAndVote.map((c: any) => [c.id, c]));
    const roots: PostComment[] = [];

    withAuthorAndVote.forEach((comment: any) => {
      if (comment.parent_comment_id && byId.has(comment.parent_comment_id)) {
        byId.get(comment.parent_comment_id)!.replies!.push(comment);
      } else {
        roots.push(comment);
      }
    });

    return roots;
  } catch (err) {
    logger.error('getPostComments error:', err);
    return [];
  }
}

/**
 * Ajoute un commentaire à un post, ou une réponse à un commentaire si
 * parentCommentId est fourni.
 */
export async function addComment(
  postId: string,
  content: string,
  authorId: string,
  parentCommentId?: string | null,
  mentionedUserIds?: string[]
): Promise<PostComment | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('post_comments')
      .insert({
        post_id: postId,
        content,
        author_id: authorId,
        parent_comment_id: parentCommentId ?? null,
        mentioned_user_ids: mentionedUserIds ?? [],
      })
      .select('*')
      .single();

    if (error) throw error;

    const authors = await fetchAuthorsByIds([authorId]);
    return { ...data, author: authors[authorId], user_vote: 0, replies: [] } as PostComment;
  } catch (err) {
    logger.error('addComment error:', err);
    return null;
  }
}

export type MentionCandidate = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * Recherche des comptes par préfixe prénom/nom, pour l'autocomplete @mention.
 */
export async function searchAccountsForMention(query: string): Promise<MentionCandidate[]> {
  if (!query.trim()) return [];
  try {
    const { data, error } = await (supabase.rpc as any)('search_accounts_for_mention', {
      p_query: query.trim(),
      p_limit: 8,
    });
    if (error) throw error;
    return (data ?? []).filter((c: MentionCandidate) => !!c.full_name);
  } catch (err) {
    logger.error('searchAccountsForMention error:', err);
    return [];
  }
}

export type LeaderboardEntry = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  gradelevel: string | null;
};

/**
 * Classement par XP total, global ou filtré sur une filière (gradelevel).
 */
export async function getLeaderboard(gradelevel?: string | null): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_leaderboard', {
      p_gradelevel: gradelevel ?? null,
      p_limit: 50,
    });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    logger.error('getLeaderboard error:', err);
    return [];
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
