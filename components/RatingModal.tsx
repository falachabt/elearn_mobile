
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { Colors } from '@/constants/Colors';
import { logger } from '@/utils/logger';
import {theme} from "@/constants/theme";
import type { Json } from '@/types/supabase';

const RATING_PROMPT_COOLDOWN_DAYS = 14;
const RATING_PROMPT_MAX_DISMISSALS = 3;
const RATING_PROMPT_MIN_ACCOUNT_AGE_DAYS = 3;
const RATING_PROMPT_MIN_FIRST_SEEN_HOURS = 24;
const RATING_PROMPT_MIN_APP_OPENS = 3;
const RATING_PROMPT_DISPLAY_DELAY_MS = 60 * 1000;

type RatingPromptState = {
  firstSeenAt?: string;
  appOpenCount?: number;
  dismissCount?: number;
  lastShownAt?: string;
  rated?: boolean;
};

const getElapsedMs = (dateValue?: string | Date | null) => {
  if (!dateValue) return 0;

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const time = date.getTime();

  if (Number.isNaN(time)) return 0;

  return Date.now() - time;
};

const RatingModal = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { user, mutateUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;

    const evaluateVisibility = async () => {
      if (Platform.OS === 'web' || !user || user.metadata?.hasRated) {
        setModalVisible(false);
        return;
      }

      try {
        const storageKey = `rating_modal_state:${user.id}`;
        const rawState = await AsyncStorage.getItem(storageKey);
        const promptState: RatingPromptState = rawState ? JSON.parse(rawState) : {};
        const firstSeenAt = promptState.firstSeenAt ?? new Date().toISOString();
        const appOpenCount = (promptState.appOpenCount ?? 0) + 1;
        const dismissCount = promptState.dismissCount ?? 0;
        const lastShownAt = promptState.lastShownAt ? new Date(promptState.lastShownAt) : null;
        const cooldownMs = RATING_PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        const isCoolingDown =
          lastShownAt instanceof Date &&
          !Number.isNaN(lastShownAt.getTime()) &&
          Date.now() - lastShownAt.getTime() < cooldownMs;

        const nextPromptState = {
          ...promptState,
          firstSeenAt,
          appOpenCount,
        } satisfies RatingPromptState;

        await AsyncStorage.setItem(storageKey, JSON.stringify(nextPromptState));

        if (promptState.rated || dismissCount >= RATING_PROMPT_MAX_DISMISSALS || isCoolingDown) {
          setModalVisible(false);
          return;
        }

        const accountAgeMs = getElapsedMs(user.created_at);
        const firstSeenMs = getElapsedMs(firstSeenAt);
        const hasEnoughAccountAge =
          accountAgeMs >= RATING_PROMPT_MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;
        const hasEnoughLocalUsage =
          firstSeenMs >= RATING_PROMPT_MIN_FIRST_SEEN_HOURS * 60 * 60 * 1000;
        const hasEnoughOpens = appOpenCount >= RATING_PROMPT_MIN_APP_OPENS;

        if (!hasEnoughAccountAge || !hasEnoughLocalUsage || !hasEnoughOpens) {
          setModalVisible(false);
          return;
        }

        showTimer = setTimeout(async () => {
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({
              ...nextPromptState,
              lastShownAt: new Date().toISOString(),
            } satisfies RatingPromptState)
          );

          setModalVisible(true);
        }, RATING_PROMPT_DISPLAY_DELAY_MS);
      } catch (error) {
        logger.error('Error reading rating modal state:', error);
        setModalVisible(false);
      }
    };

    evaluateVisibility();

    return () => {
      if (showTimer) {
        clearTimeout(showTimer);
      }
    };
  }, [user]);

  const handleRateNow = async () => {
    if (user) {
      const { error } = await supabase
        .from('accounts')
        .update({ metadata: { ...user.metadata, hasRated: true } as unknown as Json })
        .eq('id', user.id);

      if (error) {
        logger.error('Error updating user metadata:', error);
      } else {
        mutateUser();
      }

      try {
        await AsyncStorage.setItem(
          `rating_modal_state:${user.id}`,
          JSON.stringify({
            rated: true,
            dismissCount: RATING_PROMPT_MAX_DISMISSALS,
            lastShownAt: new Date().toISOString(),
          } satisfies RatingPromptState)
        );
      } catch (storageError) {
        logger.error('Error persisting rating modal state:', storageError);
      }
    }

    const storeUrl = Platform.OS === 'ios'
      ? 'itms-apps://itunes.apple.com/app/idYOUR_APP_STORE_ID' // TODO: Replace with your App Store ID
      : 'market://details?id=com.ezadrive.elearn';

    Linking.openURL(storeUrl).catch(err => logger.error('An error occurred', err));

    setModalVisible(false);
  };

  const handleRateLater = async () => {
    if (user) {
      try {
        const storageKey = `rating_modal_state:${user.id}`;
        const rawState = await AsyncStorage.getItem(storageKey);
        const promptState: RatingPromptState = rawState ? JSON.parse(rawState) : {};

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            ...promptState,
            dismissCount: (promptState.dismissCount ?? 0) + 1,
            lastShownAt: new Date().toISOString(),
          } satisfies RatingPromptState)
        );
      } catch (error) {
        logger.error('Error updating rating modal state:', error);
      }
    }

    setModalVisible(false);
  };

  if (Platform.OS === 'web' || user?.metadata?.hasRated) {
    return null;
  }

  const styles = getStyles(isDarkMode);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(!modalVisible);
      }}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Aimez-vous notre application ?</Text>
          <Text style={styles.modalSubText}>Votre avis nous est précieux. Notez-nous sur le Play Store !</Text>
          <View style={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name="star" size={30} color="#FFD700" />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.button, styles.buttonClose]}
            onPress={handleRateNow}
          >
            <Text style={styles.textStyle}>Noter maintenant</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonLater]}
            onPress={handleRateLater}
          >
            <Text style={styles.textStyleLater}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? Colors.dark.text : Colors.light.text,
  },
  modalSubText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    color: isDarkMode ? Colors.dark.text : Colors.light.text,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    width: 200,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonClose: {
    backgroundColor: theme.color.primary[500],
  },
  buttonLater: {
    backgroundColor: 'transparent',
    borderColor: theme.color.primary[500],
    borderWidth: 1,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textStyleLater: {
    color: theme.color.primary[500],
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RatingModal;
