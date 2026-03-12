import { Platform } from 'react-native';

const FILTERED_WARNING_PATTERNS = [
  '[expo-notifications] Listening to push token changes is not yet fully supported on web.',
  '"shadow*" style props are deprecated. Use "boxShadow".',
  '[expo-av]: Expo AV has been deprecated',
];

export function installDevWarningFilters(): void {
  if (!__DEV__ || Platform.OS !== 'web') {
    return;
  }

  const globalState = globalThis as typeof globalThis & {
    __ELEARN_DEV_WARNINGS_FILTERED__?: boolean;
  };

  if (globalState.__ELEARN_DEV_WARNINGS_FILTERED__) {
    return;
  }

  const originalWarn = console.warn.bind(console);

  console.warn = (...args: unknown[]) => {
    const message = args
      .map((arg) => (typeof arg === 'string' ? arg : String(arg)))
      .join(' ');

    if (FILTERED_WARNING_PATTERNS.some((pattern) => message.includes(pattern))) {
      return;
    }

    originalWarn(...args);
  };

  globalState.__ELEARN_DEV_WARNINGS_FILTERED__ = true;
}
