// services/__tests__/feed.poll.test.ts
// Lecture du fil : les sondages passent par le RPC poll_state, qui porte la date
// de révélation, la bonne réponse (après révélation) et le masquage des votes.
jest.mock('expo-file-system', () => ({
  File: class {
    bytes() {
      return Promise.resolve(new Uint8Array());
    }
  },
}));

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { getFeedPosts } from '../feed.service';

const POST_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const CORRECT_OPTION = 'option-bonne';

/** Rangée poll_state telle que le serveur la renvoie (cf. migration SQL). */
const pollRow = (overrides: Record<string, unknown>) => ({
  option_id: 'option-1',
  label: 'Option',
  position: 0,
  votes: null,
  mine: false,
  correct: null,
  voted: false,
  revealed: false,
  total: null,
  explanation: null,
  reveal_at: null,
  ...overrides,
});

const serverRows = (rows: ReturnType<typeof pollRow>[]) => rows;

describe('getFeedPosts — sondages', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  const mockFeed = () => {
    const feedPosts = {
      select: () => feedPosts,
      order: () => feedPosts,
      limit: () => feedPosts,
      lt: () => feedPosts,
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [{ id: POST_ID, author_id: USER_ID, content: 'Question ?' }], error: null }).then(
          resolve
        ),
    };
    return feedPosts;
  };

  it('masque les résultats et la bonne réponse avant la révélation', async () => {
    const revealAt = '2026-10-11T12:00:00.000Z';
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_users_public_info') {
        return Promise.resolve({ data: [{ id: USER_ID, full_name: 'Awa' }], error: null });
      }
      if (name === 'poll_state') {
        return Promise.resolve({
          data: serverRows([
            pollRow({ reveal_at: revealAt }),
            pollRow({ option_id: 'option-2', label: 'Autre', position: 1, reveal_at: revealAt }),
          ]),
          error: null,
        });
      }
      throw new Error(`RPC inattendue: ${name}`);
    });

    const { supabase } = jest.requireMock('@/lib/supabase');
    supabase.from.mockReturnValue(mockFeed());

    const posts = await getFeedPosts(USER_ID);
    const [post] = posts;

    expect(post.poll_reveal_at).toBe(revealAt);
    expect(post.poll_revealed).toBe(false);
    expect(post.poll_explanation).toBeNull();
    expect(post.poll_results_visible).toBe(false);
    expect(post.poll_total_votes).toBe(0);
    expect(post.poll_options?.map((o) => o.votes_count)).toEqual([0, 0]);
    expect(post.poll_options?.every((o) => o.is_correct === null)).toBe(true);
  });

  it('affiche la date, la bonne réponse et l\'explication après la révélation', async () => {
    const revealAt = '2026-10-09T12:00:00.000Z';
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_users_public_info') {
        return Promise.resolve({ data: [{ id: USER_ID, full_name: 'Awa' }], error: null });
      }
      if (name === 'poll_state') {
        return Promise.resolve({
          data: serverRows([
            pollRow({
              votes: 3,
              voted: true,
              revealed: true,
              total: 5,
              reveal_at: revealAt,
              explanation: 'On factorise par x.',
              correct: false,
            }),
            pollRow({
              option_id: CORRECT_OPTION,
              label: 'Bonne',
              position: 1,
              votes: 2,
              mine: true,
              correct: true,
              voted: true,
              revealed: true,
              total: 5,
              reveal_at: revealAt,
              explanation: 'On factorise par x.',
            }),
          ]),
          error: null,
        });
      }
      throw new Error(`RPC inattendue: ${name}`);
    });

    const { supabase } = jest.requireMock('@/lib/supabase');
    supabase.from.mockReturnValue(mockFeed());

    const posts = await getFeedPosts(USER_ID);
    const [post] = posts;

    expect(post.poll_revealed).toBe(true);
    expect(post.poll_reveal_at).toBe(revealAt);
    expect(post.poll_explanation).toBe('On factorise par x.');
    expect(post.poll_voted_option_id).toBe(CORRECT_OPTION);
    expect(post.poll_total_votes).toBe(5);
    expect(post.poll_results_visible).toBe(true);
    expect(post.poll_options?.find((o) => o.id === CORRECT_OPTION)).toMatchObject({
      is_correct: true,
      is_mine: true,
      votes_count: 2,
    });
    expect(post.poll_options?.find((o) => o.id === 'option-1')?.is_correct).toBe(false);
  });

  it('n\'expose pas la correction quand le serveur ne l\'a pas révélée', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_users_public_info') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'poll_state') {
        return Promise.resolve({
          data: serverRows([
            // Le serveur masque `correct` (null) tant que poll_reveal_at est futur
            pollRow({ voted: true, votes: 1, total: 1, correct: null, revealed: false }),
          ]),
          error: null,
        });
      }
      throw new Error(`RPC inattendue: ${name}`);
    });

    const { supabase } = jest.requireMock('@/lib/supabase');
    supabase.from.mockReturnValue(mockFeed());

    const posts = await getFeedPosts(USER_ID);
    const [post] = posts;

    expect(post.poll_revealed).toBe(false);
    expect(post.poll_options?.[0].is_correct).toBeNull();
    expect(post.poll_results_visible).toBe(true);
  });

  it('retombe sur les votes bruts si poll_state est indisponible', async () => {
    const legacyOptions = {
      select: () => legacyOptions,
      in: () => legacyOptions,
      order: () => legacyOptions,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [
            { id: 'option-1', post_id: POST_ID, label: 'Oui', position: 0 },
            { id: 'option-2', post_id: POST_ID, label: 'Non', position: 1 },
          ],
          error: null,
        }).then(resolve),
    };
    const legacyVotes = {
      select: () => legacyVotes,
      in: () => legacyVotes,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [{ post_id: POST_ID, option_id: 'option-2', user_id: USER_ID }],
          error: null,
        }).then(resolve),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_users_public_info') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'poll_state') {
        return Promise.resolve({
          data: null,
          error: { code: 'PGRST202', message: 'function not found' },
        });
      }
      throw new Error(`RPC inattendue: ${name}`);
    });

    const { supabase } = jest.requireMock('@/lib/supabase');
    supabase.from
      .mockReturnValueOnce(mockFeed())
      .mockReturnValueOnce(legacyOptions)
      .mockReturnValueOnce(legacyVotes);

    const posts = await getFeedPosts(USER_ID);
    const [post] = posts;

    expect(post.poll_revealed).toBe(false);
    expect(post.poll_voted_option_id).toBe('option-2');
    expect(post.poll_total_votes).toBe(1);
    expect(post.poll_options?.find((o) => o.id === 'option-2')).toMatchObject({
      is_mine: true,
      votes_count: 1,
    });
  });
});
