
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { Colors } from '@/constants/Colors';
import { logger } from '@/utils/logger';
import {theme} from "@/constants/theme";
import type { Json } from '@/types/supabase';

const RatingModal = () => {
  const [modalVisible, setModalVisible] = useState(true);
  const { user, mutateUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

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
    }

    const storeUrl = Platform.OS === 'ios'
      ? 'itms-apps://itunes.apple.com/app/idYOUR_APP_STORE_ID' // TODO: Replace with your App Store ID
      : 'market://details?id=com.ezadrive.elearn';

    Linking.openURL(storeUrl).catch(err => logger.error('An error occurred', err));

    setModalVisible(false);
  };

  const handleRateLater = () => {
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
