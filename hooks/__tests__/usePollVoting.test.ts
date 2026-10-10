// hooks/__tests__/usePollVoting.test.ts
// Détection des sondages dont la correction doit être relue au serveur.
jest.mock('@/services/feed.service', () => ({
  refreshPostPoll: jest.fn(),
  votePollOption: jest.fn(),
}));

import { getRevealDuePostIds } from '../usePollVoting';
import type { FeedPost } from '@/services/feed.service';

const post = (overrides: Partial<FeedPost>): FeedPost =>
  ({ id: 'p1', poll_options: [{ id: 'o1', label: 'oui', votes_count: 0 }], ...overrides }) as FeedPost;

const NOW = new Date('2026-10-10T10:00:00.000Z');

describe('getRevealDuePostIds', () => {
  it('ignore un post sans sondage', () => {
    expect(getRevealDuePostIds([post({ poll_options: [] })], NOW)).toEqual([]);
  });

  it('ignore un sondage sans date de révélation (sondage d\'opinion)', () => {
    expect(getRevealDuePostIds([post({ poll_reveal_at: null })], NOW)).toEqual([]);
  });

  it('ignore un sondage dont la révélation est à venir', () => {
    expect(
      getRevealDuePostIds([post({ poll_reveal_at: '2026-10-11T12:00:00.000Z' })], NOW)
    ).toEqual([]);
  });

  it('ignore un sondage déjà révélé', () => {
    expect(
      getRevealDuePostIds(
        [post({ poll_reveal_at: '2026-10-09T12:00:00.000Z', poll_revealed: true })],
        NOW
      )
    ).toEqual([]);
  });

  it('retient un sondage dont la date vient d\'être atteinte', () => {
    expect(
      getRevealDuePostIds(
        [
          post({ id: 'due', poll_reveal_at: '2026-10-10T09:59:00.000Z' }),
          post({ id: 'later', poll_reveal_at: '2026-10-10T10:01:00.000Z' }),
        ],
        NOW
      )
    ).toEqual(['due']);
  });

  it('ignore une date invalide', () => {
    expect(getRevealDuePostIds([post({ poll_reveal_at: 'pas une date' })], NOW)).toEqual([]);
  });
});
