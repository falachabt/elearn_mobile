import React, { FC, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import WhatsAppContact from '@/components/WhatsappSupport';

interface UnsupportedCountryBannerProps {
  countryName?: string | null;
  isDark: boolean;
}

/** Shown when the customer's profile country isn't one PawaPay supports for
 * deposits. A compact row that opens a bottom sheet explaining the situation
 * and offering to contact support for manual activation -- they can still
 * pick a supported country in the phone field below if they have a matching
 * number. */
export const UnsupportedCountryBanner: FC<UnsupportedCountryBannerProps> = ({ countryName, isDark }) => {
  const [sheetVisible, setSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, isDark && styles.triggerDark]}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={20}
          color={isDark ? theme.color.warning[400] : theme.color.warning[500]}
        />
        <Text style={[styles.triggerText, isDark && styles.triggerTextDark]}>
          Paiement non disponible pour votre pays
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={isDark ? theme.color.gray[400] : theme.color.gray[500]}
        />
      </TouchableOpacity>

      <Modal
        isVisible={sheetVisible}
        onBackdropPress={() => setSheetVisible(false)}
        onBackButtonPress={() => setSheetVisible(false)}
        onSwipeComplete={() => setSheetVisible(false)}
        swipeDirection={['down']}
        style={styles.modal}
        backdropOpacity={0.5}
        useNativeDriver
      >
        <View
          style={[
            styles.sheet,
            isDark && styles.sheetDark,
            { paddingBottom: 20 + insets.bottom },
          ]}
        >
          <View style={[styles.handle, isDark && styles.handleDark]} />

          <MaterialCommunityIcons
            name="map-marker-alert-outline"
            size={40}
            color={isDark ? theme.color.warning[400] : theme.color.warning[500]}
            style={styles.icon}
          />

          <ThemedText style={styles.title}>Pays non pris en charge</ThemedText>
          <ThemedText style={styles.description}>
            {countryName
              ? `Le paiement mobile money n'est pas encore disponible pour ${countryName}. `
              : "Le paiement mobile money n'est pas encore disponible pour votre pays. "}
            Vous pouvez choisir un autre pays dans le champ téléphone si vous avez un numéro compatible, ou contacter le support pour faire activer votre accès manuellement.
          </ThemedText>

          <WhatsAppContact
            message={
              countryName
                ? `Bonjour, mon pays (${countryName}) n'est pas encore pris en charge pour le paiement mobile money. Pouvez-vous activer mon accès manuellement ?`
                : "Bonjour, mon pays n'est pas pris en charge pour le paiement mobile money. Pouvez-vous activer mon accès manuellement ?"
            }
            style={{ marginTop: 8, marginHorizontal: 0 }}
          />

          <TouchableOpacity style={styles.closeButton} onPress={() => setSheetVisible(false)}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  triggerDark: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  triggerText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  triggerTextDark: {
    color: '#FFFFFF',
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  sheetDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.color.gray[300],
    borderRadius: 3,
    marginBottom: 16,
  },
  handleDark: {
    backgroundColor: theme.color.gray[600],
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    color: theme.color.gray[600],
  },
});

export default UnsupportedCountryBanner;
