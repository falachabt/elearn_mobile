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
  isGenerousWeekActive: () => boolean;
  getWebViewUrls: () => WebViewConfig | null;
  getApiBaseUrl: () => string | null;
  getPricingConfig: () => PricingConfig;
  mutateAppConfig: () => Promise<AppConfig | null | undefined>;
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

// Fetch app_config data from the database
const fetchAppConfig = async () => {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .limit(1)

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
    if (!appConfig?.data?.webview) {
        return {
            course_url: "https://elearn.ezadrive.com/fr/webview/courseContent",
            exercise_url: "https://elearn.ezadrive.com/fr/webview/exercices"
        };
    }
    return appConfig.data.webview;
  };

  const getApiBaseUrl = () => {
    if (!appConfig?.data?.api_base_url) {
        return "https://elearn.ezadrive.com";
    }
    return appConfig.data.api_base_url;
  };

  const getPricingConfig = (): PricingConfig => {
    if (!appConfig?.data?.pricing) {
      // Valeurs par défaut si pas de config
      return {
        generous_week_price: 5000,
        regular_first_course_price: 15000,
        additional_course_price: 15000,
        fixed_price: 15000,
        purchase_validity_days: 300,
        plans: {
          essential: {
            name: 'Formule Essentielle',
            description: 'Première formation: 9 000 FCFA + 7900 FCFA pour toute nouvelle souscription à une formation.',
            base_price: 15000,
            additional_price: 15000,
            threshold: 1,
            color: 'green'
          },
          advantage: {
            name: 'Formule Avantage',
            description: 'Pack complet de trois formations',
            price: 24900,
            threshold: 3,
            color: 'orange',
            recommended: true
          },
          excellence: {
            name: 'Formule Excellence',
            description: 'Formations illimitées pendant 12 mois',
            price: 39500,
            threshold: 5,
            color: '#4F46E5'
          }
        }
      };
    }
    return appConfig.data.pricing;
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
    getApiBaseUrl,
    getPricingConfig,
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
