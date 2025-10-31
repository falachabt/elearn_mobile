import { createContext, useContext, useEffect, useState } from 'react';
import useSWR from 'swr';

import { supabase } from '@/lib/supabase';

// Define types for app_config data
interface GenerousWeekConfig {
  start_at: string;
  end_at: string;
}

interface WebViewConfig {
  course_url: string;
  exercise_url: string;
}

interface AppConfigData {
  generous_week?: GenerousWeekConfig;
  webview?: WebViewConfig;
  // Add other app config properties as needed
}

interface AppConfig {
  id: number;
  created_at: string;
  data: AppConfigData;
}

type AppConfigContextType = {
  appConfig: AppConfig | null;
  isLoading: boolean;
  isGenerousWeekActive: () => boolean;
  getWebViewUrls: () => WebViewConfig | null;
  mutateAppConfig: () => Promise<AppConfig | null | undefined>;
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

// Fetch app_config data from the database
const fetchAppConfig = async () => {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .limit(1)

  console.log(data, "app_config data fetched");

  if (error) {
    console.error('Error fetching app_config:', error);
    return null;
  }

  return data[0] as AppConfig;
};

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  const { data: appConfig, mutate: mutateAppConfig } = useSWR<AppConfig | null>(
    'app_config',
    fetchAppConfig,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  // Check if the generous week feature is currently active based on app_config dates
  const isGenerousWeekActive = () => {
    if (!appConfig?.data?.generous_week) return false;

    const now = new Date();
    const startDate = new Date(appConfig.data.generous_week.start_at);
    const endDate = new Date(appConfig.data.generous_week.end_at);

    return now >= startDate && now <= endDate;
  };

  const getWebViewUrls = () => {
    if (!appConfig?.data?.webview) return null;
    return appConfig.data.webview;
  };

  useEffect(() => {
    setIsLoading(appConfig === undefined);
  }, [appConfig]);

  useEffect(() => {
    // Subscribe to changes in the app_config table
    const subscription = supabase
      .channel('app_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_config',
        },
        () => mutateAppConfig()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const value: AppConfigContextType = {
    appConfig: appConfig ?? null,
    isLoading,
    isGenerousWeekActive,
    getWebViewUrls,
    mutateAppConfig,
  };

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}
