/**
 * ScreenTracker Component
 * 
 * Automatically tracks screen views using PostHog when the pathname changes.
 * This component should be placed in the app's layout to track all navigation.
 * 
 * Usage in _layout.tsx:
 * ```tsx
 * export default function RootLayout() {
 *   return (
 *     <>
 *       <ScreenTracker />
 *       {/* Rest of layout *\/}
 *     </>
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';
import { usePathname, useGlobalSearchParams } from 'expo-router';
import { posthogService } from '@/utils/posthogService';

export default function ScreenTracker() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    if (pathname) {
      // Track screen view with pathname and route params
      posthogService.trackScreenViewed(pathname, {
        ...params,
      });
    }
  }, [pathname]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook version of ScreenTracker for manual tracking in specific screens
 * 
 * Usage:
 * ```tsx
 * export default function MyScreen() {
 *   useScreenTracking('Custom Screen Name', { section: 'learning' });
 *   
 *   return <View>{/* Screen content *\/}</View>;
 * }
 * ```
 */
export function useScreenTracking(
  screenName: string,
  properties?: Record<string, unknown>
) {
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    posthogService.trackScreenViewed(screenName, {
      path: pathname,
      ...params,
      ...properties,
    });
  }, [screenName, pathname]);
}