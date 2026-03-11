import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockUseSWR = jest.fn();
const mockGlobalMutate = jest.fn();
const mockMarkDocumentAsComplete = jest.fn();
const mockUnmarkDocumentAsComplete = jest.fn();
const mockPinDocument = jest.fn();
const mockUnpinDocument = jest.fn();
const mockGetDocumentsStatus = jest.fn();

jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
  mutate: (...args: unknown[]) => mockGlobalMutate(...args),
}));

jest.mock('@/contexts/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('@/services/secondary/document-actions.service', () => ({
  markDocumentAsComplete: (...args: unknown[]) => mockMarkDocumentAsComplete(...args),
  unmarkDocumentAsComplete: (...args: unknown[]) => mockUnmarkDocumentAsComplete(...args),
  pinDocument: (...args: unknown[]) => mockPinDocument(...args),
  unpinDocument: (...args: unknown[]) => mockUnpinDocument(...args),
  getDocumentsStatus: (...args: unknown[]) => mockGetDocumentsStatus(...args),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { useDocumentActions } from '../useDocumentActions';

let latestHook: ReturnType<typeof useDocumentActions> | undefined;
const localMutate = jest.fn();

function HookHarness() {
  latestHook = useDocumentActions('doc-1');
  return null;
}

describe('useDocumentActions', () => {
  beforeEach(() => {
    latestHook = undefined;
    localMutate.mockReset();
    mockUseSWR.mockReset();
    mockGlobalMutate.mockReset();
    mockMarkDocumentAsComplete.mockReset();
    mockUnmarkDocumentAsComplete.mockReset();
    mockPinDocument.mockReset();
    mockUnpinDocument.mockReset();
    mockGetDocumentsStatus.mockReset();
  });

  it('marks a document as complete and revalidates local and global SWR caches', async () => {
    mockUseSWR.mockReturnValue({
      data: { completed: [], pinned: [] },
      error: undefined,
      mutate: localMutate,
    });
    mockMarkDocumentAsComplete.mockResolvedValue(undefined);
    localMutate.mockResolvedValue(undefined);
    mockGlobalMutate.mockResolvedValue(undefined);

    act(() => {
      renderer.create(<HookHarness />);
    });

    await act(async () => {
      await latestHook!.toggleComplete();
    });

    expect(mockMarkDocumentAsComplete).toHaveBeenCalledWith('user-1', 'doc-1');
    expect(localMutate).toHaveBeenCalledTimes(1);
    expect(mockGlobalMutate).toHaveBeenCalledTimes(2);

    const firstCall = mockGlobalMutate.mock.calls[0];
    expect(firstCall[2]).toEqual({ revalidate: true });
    expect(firstCall[0](['documents-status', ['doc-1'], 'user-1'])).toBe(true);
    expect(firstCall[0](['document-status', 'doc-1', 'user-1'])).toBe(false);

    const secondCall = mockGlobalMutate.mock.calls[1];
    expect(secondCall[2]).toEqual({ revalidate: true });
    expect(secondCall[0](['secondary-program-progress', 'program-1'])).toBe(true);
  });

  it('unmarks a document when it is already complete', async () => {
    mockUseSWR.mockReturnValue({
      data: {
        completed: [{ document_id: 'doc-1', is_completed: true }],
        pinned: [],
      },
      error: undefined,
      mutate: localMutate,
    });
    mockUnmarkDocumentAsComplete.mockResolvedValue(undefined);
    localMutate.mockResolvedValue(undefined);
    mockGlobalMutate.mockResolvedValue(undefined);

    act(() => {
      renderer.create(<HookHarness />);
    });

    await act(async () => {
      await latestHook!.toggleComplete();
    });

    expect(latestHook!.isCompleted).toBe(true);
    expect(mockUnmarkDocumentAsComplete).toHaveBeenCalledWith('user-1', 'doc-1');
  });

  it('pins a document and refreshes caches', async () => {
    mockUseSWR.mockReturnValue({
      data: { completed: [], pinned: [] },
      error: undefined,
      mutate: localMutate,
    });
    mockPinDocument.mockResolvedValue(undefined);
    localMutate.mockResolvedValue(undefined);
    mockGlobalMutate.mockResolvedValue(undefined);

    act(() => {
      renderer.create(<HookHarness />);
    });

    await act(async () => {
      await latestHook!.togglePin();
    });

    expect(mockPinDocument).toHaveBeenCalledWith('user-1', 'doc-1');
    expect(localMutate).toHaveBeenCalledTimes(1);
    expect(mockGlobalMutate).toHaveBeenCalledTimes(2);
  });
});
