import { createContext, useContext, useEffect, useState } from 'react';
import useSWR from 'swr';

import { supabase } from '@/lib/supabase';
import { AppConfigError } from '@/components/shared/AppConfigError';
import { logger } from '@/utils/logger';

// Define types for app_config data
interface GenerousWeekConfig {
  start_at: string;
  end_at: string;
}

interface WebViewConfig {
  course_url: string;
  exercise_url: string;
  summary_url?: string;
}

interface PricingConfig {
  generous_week_price: number;
  regular_first_course_price: number;
  additional_course_price: number;
  fixed_price: number;
  purchase_validity_days: number;
  plans: {
    essential: {
      name: string;
      description: string;
      base_price: number;
      additional_price: number;
      threshold: number;
      color: string;
    };
    advantage: {
      name: string;
      description: string;
      price: number;
      threshold: number;
      color: string;
      recommended: boolean;
    };
    excellence: {
      name: string;
      description: string;
      price: number;
      threshold: number;
      color: string;
    };
  };
}

interface AppConfigData {
  generous_week?: GenerousWeekConfig;
  webview?: WebViewConfig;
  api_base_url?: string;
  pricing?: PricingConfig;
}

interface AppConfig {
  id: number;
  created_at: string;
  data: AppConfigData;
}

type AppConfigContextType = {
  appConfig: AppConfig | null;
  isLoading: boolean;
  error: Error | null;
  isGenerousWeekActive: () => boolean;
  getWebViewUrls: () => WebViewConfig | null;
  getApiBaseUrl: () => string | null;
  getPricingConfig: () => PricingConfig | null;
  mutateAppConfig: () => Promise<AppConfig | null | undefined>;
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

const DEFAULT_WEBVIEW_URLS: WebViewConfig = {
  course_url: 'https://staff.elearnprepa.com/fr/webview/courseContent',
  exercise_url: 'https://staff.elearnprepa.com/fr/webview/exercices',
  summary_url: 'https://staff.elearnprepa.com/fr/webview/course-summary',
};

const DEFAULT_API_BASE_URL = 'https://staff.elearnprepa.com';

const fetchAppConfig = async () => {
  const { data, error } = await supabase.from('app_config').select('*').limit(1);

  if (error) {
    logger.error('Error fetching app_config:', error);
    return null;
  }

  return data[0] as AppConfig;
};

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data: appConfig, error: swrError, mutate: mutateAppConfig } = useSWR<AppConfig | null>(
    'app_config',
    fetchAppConfig,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      onError: (err) => {
        logger.error('[AppConfig] Error fetching config:', err);
        setError(err);
      },
      onSuccess: (data) => {
        logger.log('[AppConfig] Config loaded successfully:', data ? 'Data available' : 'No data');
        setError(null);
      },
    }
  );

  const isGenerousWeekActive = () => {
    if (!appConfig?.data?.generous_week) return false;

    const now = new Date();
    const startDate = new Date(appConfig.data.generous_week.start_at);
    const endDate = new Date(appConfig.data.generous_week.end_at);

    return now >= startDate && now <= endDate;
  };

  const getWebViewUrls = () => {
    if (
      !appConfig?.data?.webview ||
      !appConfig.data.webview.course_url ||
      !appConfig.data.webview.exercise_url
    ) {
      return DEFAULT_WEBVIEW_URLS;
    }

    return {
      ...appConfig.data.webview,
      summary_url: appConfig.data.webview.summary_url?.trim() || DEFAULT_WEBVIEW_URLS.summary_url,
    };
  };

  const getApiBaseUrl = () => {
    if (!appConfig?.data?.api_base_url || appConfig.data.api_base_url.trim() === '') {
      return DEFAULT_API_BASE_URL;
    }
    return appConfig.data.api_base_url;
  };

  const getPricingConfig = (): PricingConfig | null => {
    if (!appConfig?.data?.pricing || Object.keys(appConfig.data.pricing).length === 0) {
      return null;
    }
    return appConfig.data.pricing;
  };

  useEffect(() => {
    setIsLoading(appConfig === undefined);
    if (swrError) {
      setError(swrError);
    }
  }, [appConfig, swrError]);

  useEffect(() => {
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
    error,
    isGenerousWeekActive,
    getWebViewUrls,
    getApiBaseUrl,
    getPricingConfig,
    mutateAppConfig,
  };

  if (error && !isLoading) {
    return <AppConfigError error={error} onRetry={() => mutateAppConfig()} />;
  }

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}
