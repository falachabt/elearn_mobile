import 'dotenv/config';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

const describeLive = process.env.RUN_LIVE_SUPABASE_TESTS === '1' ? describe : describe.skip;

describeLive('AppConfigProvider live', () => {
  it('loads app_config from Supabase', async () => {
    const { AppConfigProvider, useAppConfig } = await import('../useAppConfig');

    let latestContext: ReturnType<typeof useAppConfig> | undefined;

    function Consumer() {
      latestContext = useAppConfig();
      return null;
    }

    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(
        <AppConfigProvider>
          <Consumer />
        </AppConfigProvider>
      );
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
    });

    expect(latestContext).toBeDefined();
    expect(latestContext!.isLoading).toBe(false);
    expect(latestContext!.appConfig).toBeTruthy();
    expect(typeof latestContext!.getApiBaseUrl()).toBe('string');

    tree!.unmount();
  }, 15000);
});
