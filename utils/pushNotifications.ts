import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import type { Json } from '@/types/supabase';

/**
 * Registers the device for push notifications and stores the token in the user's metadata
 * @param userId The ID of the user to store the token for
 * @returns The Expo push token or undefined if registration failed
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | undefined> {
  let token: string | undefined;

  // Set up notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Check if this is a physical device (push notifications don't work on simulators)
  if (Device.isDevice) {
    // Check and request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return undefined;
    }

    try {
      // Get the project ID from Expo config
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      
      // Get the Expo push token
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      
      // Store the token in the user's metadata
      if (token && userId) {
        await updateUserPushToken(userId, token);
      }
    } catch (e) {
      logger.error('Error getting push token:', e);
    }
  }

  return token;
}

/**
 * Updates the user's metadata with the Expo push token
 * @param userId The ID of the user to update
 * @param token The Expo push token to store
 */
export async function updateUserPushToken(userId: string, token: string): Promise<void> {
  try {
    // Get the current user metadata
    const { data: userData, error: fetchError } = await supabase
      .from('accounts')
      .select('metadata')
      .eq('id', userId)
      .single();

    if (fetchError) {
      logger.error('Error fetching user metadata:', fetchError);
      return;
    }

    // Prepare the updated metadata
    const currentMetadata =
      userData?.metadata && typeof userData.metadata === 'object' && !Array.isArray(userData.metadata)
        ? userData.metadata as Record<string, Json | undefined>
        : {};
    const updatedMetadata = {
      ...currentMetadata,
      expoPushToken: token
    };

    // Update the user's metadata
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ metadata: updatedMetadata })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating user metadata:', updateError);
    }
  } catch (error) {
    logger.error('Error in updateUserPushToken:', error);
  }
}

/**
 * Sets up notification handlers for the app
 */
export function setupNotifications(): void {
  // Define how notifications should be handled when the app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
