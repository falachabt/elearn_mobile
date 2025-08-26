import React, { useEffect } from 'react';
import { usePathname } from 'expo-router';

import { trackEvent, Events } from '@/utils/analytics';

/**
 * Component that tracks screen views as the user navigates through the app
 * This component should be placed in the app's layout component
 */
export default function ScreenTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      // Track screen view event
      trackEvent(Events.VIEW_SCREEN, {
        screen_name: pathname,
        screen_path: pathname,
      });
    }
  }, [pathname]);

  // This component doesn't render anything
  return null;
}