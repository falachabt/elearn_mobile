// hooks/usePollVoting.ts
// Vote sur un sondage du fil et bascule automatique à l'heure de révélation :
// l'écran peut rester ouvert quand la date de correction arrive, l'app relit
// alors l'état du sondage côté serveur au lieu d'attendre un rechargement.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FeedPost, refreshPostPoll, votePollOption } from '@/services/feed.service';

const REVEAL_POLL_INTERVAL_MS = 30 * 1000;

/** Applique un état relu aux posts affichés. */
function mergeRefreshedPost(
  previous: FeedPost[],
  refreshed: FeedPost | null
): FeedPost[] {
  if (!refreshed) return previous;
  return previous.map((post) => (post.id === refreshed.id ? refreshed : post));
}

/** Sondages dont la date de révélation vient d'être atteinte. */
export function getRevealDuePostIds(posts: FeedPost[], now: Date): string[] {
  return posts
    .filter((post) => {
      if (!post.poll_options?.length || post.poll_revealed) return false;
      if (!post.poll_reveal_at) return false;
      const revealAt = new Date(post.poll_reveal_at);
      return !Number.isNaN(revealAt.getTime()) && revealAt.getTime() <= now.getTime();
    })
    .map((post) => post.id);
}

/**
 * @param posts         Les posts affichés (sondages inclus)
 * @param setPosts      Le setter d'état correspondant, pour appliquer le vote et
 *                      la correction relue sans recharger toute la liste.
 * @param currentUserId Id de l'élève connecté (auteur du vote côté serveur).
 */
export function usePollVoting(
  posts: FeedPost[],
  setPosts: React.Dispatch<React.SetStateAction<FeedPost[]>>,
  currentUserId?: string | null
) {
  const [revealNow, setRevealNow] = useState(() => new Date());
  const revealDueIds = useMemo(
    () => getRevealDuePostIds(posts, revealNow),
    [posts, revealNow]
  );
  const revealDueKey = revealDueIds.join(',');

  // Toujours la dernière liste affichée, pour les effets qui n'ont pas `posts`
  // dans leurs dépendances (sinon l'horloge serait relancée à chaque rendu).
  const postsRef = useRef(posts);
  postsRef.current = posts;

  // Dates de révélation encore à venir : dépendance stable pour l'horloge.
  const pendingRevealKey = posts
    .filter((post) => post.poll_options?.length && !post.poll_revealed && post.poll_reveal_at)
    .map((post) => `${post.id}:${post.poll_reveal_at}`)
    .join(',');
  const refreshingRevealRef = useRef(false);

  // Une seule horloge pour tous les sondages affichés.
  useEffect(() => {
    const interval = setInterval(() => {
      setRevealNow((previous) =>
        getRevealDuePostIds(postsRef.current, new Date()).length > 0 ? new Date() : previous
      );
    }, REVEAL_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pendingRevealKey]);

  // Relit les sondages dont la correction vient d'être révélée, en une passe.
  useEffect(() => {
    if (revealDueIds.length === 0 || refreshingRevealRef.current) return;
    refreshingRevealRef.current = true;

    const ids = revealDueIds;
    const targets = postsRef.current.filter((post) => ids.includes(post.id));

    void (async () => {
      try {
        const results = await Promise.all(targets.map((post) => refreshPostPoll(post)));
        const byId = new Map(
          results.filter((post): post is FeedPost => !!post).map((post) => [post.id, post])
        );
        if (byId.size > 0) {
          setPosts((previous) => previous.map((post) => byId.get(post.id) ?? post));
        }
      } finally {
        refreshingRevealRef.current = false;
      }
    })();
    // revealDueKey résume les sondages dus ; posts est lu via postsRef.
  }, [revealDueKey, setPosts]);

  /** Vote sur une option, puis relit l'état du sondage (résultats, correction). */
  const votePoll = useCallback(
    async (post: FeedPost, optionId: string) => {
      if (post.poll_voted_option_id) return;

      const success = await votePollOption(post.id, optionId, currentUserId ?? '');

      // Que le vote soit accepté ou refusé (sondage déjà corrigé côté serveur),
      // on relit l'état réel plutôt que de deviner.
      const refreshed = await refreshPostPoll(post);
      if (refreshed) {
        setPosts((previous) => mergeRefreshedPost(previous, refreshed));
        return;
      }

      if (!success) return;

      setPosts((previous) =>
        previous.map((item) =>
          item.id !== post.id
            ? item
            : {
                ...item,
                poll_voted_option_id: optionId,
                poll_results_visible: true,
                poll_options: item.poll_options?.map((option) => ({
                  ...option,
                  is_mine: option.id === optionId,
                })),
              }
        )
      );
    },
    [setPosts, currentUserId]
  );

  /** Relit un sondage : date de révélation atteinte pendant que l'écran est ouvert. */
  const revealPoll = useCallback(
    async (post: FeedPost) => {
      const refreshed = await refreshPostPoll(post);
      setPosts((previous) => mergeRefreshedPost(previous, refreshed));
    },
    [setPosts]
  );

  return { votePoll, revealPoll, revealDueIds };
}
