import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockUseSWR = jest.fn();
const mockMutateAppConfig = jest.fn();
const mockRemoveChannel = jest.fn();
const mockSubscribe = jest.fn(() => 'subscription');
const mockOn = jest.fn().mockReturnThis();
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
};

jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => mockChannel),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
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

jest.mock('@/components/shared/AppConfigError', () => ({
  AppConfigError: ({ error }: { error: Error }) => {
    const { Text: MockText } = require('react-native');

    return <MockText testID="app-config-error">{error.message}</MockText>;
  },
}));

import { AppConfigProvider, useAppConfig } from '../useAppConfig';

let latestContext: ReturnType<typeof useAppConfig> | undefined;

function Consumer() {
  latestContext = useAppConfig();
  return null;
}

const pricingConfig = {
  generous_week_price: 10000,
  regular_first_course_price: 15000,
  additional_course_price: 5000,
  fixed_price: 10000,
  purchase_validity_days: 300,
  plans: {
    essential: {
      name: 'Essential',
      description: 'Pour debuter',
      base_price: 15000,
      additional_price: 5000,
      threshold: 1,
      color: '#3B82F6',
    },
    advantage: {
      name: 'Avantage',
      description: 'Le plus populaire',
      price: 25000,
      threshold: 3,
      color: '#10B981',
      recommended: true,
    },
    excellence: {
      name: 'Excellence',
      description: 'Le meilleur rapport',
      price: 40000,
      threshold: 5,
      color: '#8B5CF6',
    },
  },
};

describe('AppConfigProvider', () => {
  beforeEach(() => {
    latestContext = undefined;
    mockUseSWR.mockReset();
    mockMutateAppConfig.mockReset();
    mockRemoveChannel.mockReset();
    mockSubscribe.mockClear();
    mockOn.mockClear();
  });

  it('returns safe defaults when no config is available', () => {
    mockUseSWR.mockReturnValue({
      data: null,
      error: null,
      mutate: mockMutateAppConfig,
    });

    act(() => {
      renderer.create(
        <AppConfigProvider>
          <Consumer />
        </AppConfigProvider>
      );
    });

    expect(latestContext).toBeDefined();
    expect(latestContext!.isLoading).toBe(false);
    expect(latestContext!.getApiBaseUrl()).toBe('https://staff.elearnprepa.com');
    expect(latestContext!.getWebViewUrls()).toEqual({
      course_url: 'https://staff.elearnprepa.com/fr/webview/courseContent',
      exercise_url: 'https://staff.elearnprepa.com/fr/webview/exercices',
      summary_url: 'https://staff.elearnprepa.com/fr/webview/course-summary',
    });
    expect(latestContext!.getPricingConfig()).toBeNull();
    expect(latestContext!.isGenerousWeekActive()).toBe(false);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('exposes loaded values from app_config', () => {
    const now = new Date();
    const start = new Date(now.getTime() - 60_000).toISOString();
    const end = new Date(now.getTime() + 60_000).toISOString();

    mockUseSWR.mockReturnValue({
      data: {
        id: 1,
        created_at: now.toISOString(),
        data: {
          generous_week: {
            start_at: start,
            end_at: end,
          },
          webview: {
            course_url: 'https://example.com/course',
            exercise_url: 'https://example.com/exercise',
            summary_url: 'https://example.com/summary',
          },
          api_base_url: 'https://api.example.com',
          pricing: pricingConfig,
        },
      },
      error: null,
      mutate: mockMutateAppConfig,
    });

    act(() => {
      renderer.create(
        <AppConfigProvider>
          <Consumer />
        </AppConfigProvider>
      );
    });

    expect(latestContext!.appConfig?.id).toBe(1);
    expect(latestContext!.isGenerousWeekActive()).toBe(true);
    expect(latestContext!.getApiBaseUrl()).toBe('https://api.example.com');
    expect(latestContext!.getWebViewUrls()).toEqual({
      course_url: 'https://example.com/course',
      exercise_url: 'https://example.com/exercise',
      summary_url: 'https://example.com/summary',
    });
    expect(latestContext!.getPricingConfig()).toEqual(pricingConfig);
  });

  it('renders the error boundary when loading failed', () => {
    mockUseSWR.mockReturnValue({
      data: null,
      error: new Error('config failed'),
      mutate: mockMutateAppConfig,
    });

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <AppConfigProvider>
          <Consumer />
        </AppConfigProvider>
      );
    });

    expect(tree!.root.findAll(node => node.props.testID === 'app-config-error').length).toBeGreaterThan(0);
  });
});
