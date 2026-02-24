import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { AppState, AppStateStatus } from 'react-native';

import { logger } from '@/utils/logger';

interface UpdatesContextType {
  isUpdateAvailable: boolean;
  isCheckingForUpdate: boolean;
  isUpdating: boolean;
  updateError: string | null;
  checkForUpdates: () => Promise<void>;
  downloadAndApplyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined);

const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const BACKGROUND_CHECK_DELAY = 5000; // 5 seconds after app becomes active

interface UpdatesProviderProps {
  children: React.ReactNode;
}

export function UpdatesProvider({ children }: UpdatesProviderProps) {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  const checkForUpdates = useCallback(async () => {
    // Skip if we're in development or expo go
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    // Prevent too frequent checks (minimum 5 minutes between checks)
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 5 * 60 * 1000) {
      return;
    }

    setIsCheckingForUpdate(true);
    setUpdateError(null);
    lastCheckTimeRef.current = now;

    try {
      const updateInfo = await Updates.checkForUpdateAsync();
      
      if (updateInfo.isAvailable) {
        const downloadResult = await Updates.fetchUpdateAsync();
        
        if (downloadResult.isNew) {
          setIsUpdateAvailable(true);
        }
      } else {
        setIsUpdateAvailable(false);
      }
    } catch (error) {
      logger.error('Error checking for updates:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to check for updates');
    } finally {
      setIsCheckingForUpdate(false);
    }
  }, []);

  const downloadAndApplyUpdate = useCallback(async () => {
    if (!isUpdateAvailable) {
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      await Updates.reloadAsync();
    } catch (error) {
      logger.error('Error applying update:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to apply update');
      setIsUpdating(false);
    }
  }, [isUpdateAvailable]);

  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
    setUpdateError(null);
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  // Set up periodic checks
  useEffect(() => {
    intervalRef.current = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForUpdates]);

  // Check for updates when app becomes active from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Clear any existing timeout
        if (backgroundCheckTimeoutRef.current) {
          clearTimeout(backgroundCheckTimeoutRef.current);
        }

        // Check for updates after a short delay when app becomes active
        backgroundCheckTimeoutRef.current = setTimeout(() => {
          checkForUpdates();
        }, BACKGROUND_CHECK_DELAY);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (backgroundCheckTimeoutRef.current) {
        clearTimeout(backgroundCheckTimeoutRef.current);
      }
    };
  }, [checkForUpdates]);

  const value: UpdatesContextType = {
    isUpdateAvailable,
    isCheckingForUpdate,
    isUpdating,
    updateError,
    checkForUpdates,
    downloadAndApplyUpdate,
    dismissUpdate,
  };

  return (
    <UpdatesContext.Provider value={value}>
      {children}
    </UpdatesContext.Provider>
  );
}

export function useUpdates(): UpdatesContextType {
  const context = useContext(UpdatesContext);
  if (context === undefined) {
    throw new Error('useUpdates must be used within an UpdatesProvider');
  }
  return context;
}
