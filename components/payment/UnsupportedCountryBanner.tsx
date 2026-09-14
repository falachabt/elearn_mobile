import React, { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import WhatsAppContact from '@/components/WhatsappSupport';

interface UnsupportedCountryBannerProps {
  countryName?: string | null;
  isDark: boolean;
}

/** Shown when the customer's profile country isn't one PawaPay supports for
 * deposits -- they can still pick a supported country below if they have a
 * matching number, or ask support to activate their access manually. */
export const UnsupportedCountryBanner: FC<UnsupportedCountryBannerProps> = ({ countryName, isDark }) => (
  <View style={[styles.banner, isDark && styles.bannerDark]}>
    <View style={styles.row}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={20}
        color={isDark ? theme.color.warning[400] : theme.color.warning[500]}
      />
      <ThemedText style={styles.text}>
        {countryName
          ? `Le paiement mobile money n'est pas encore disponible pour ${countryName}. `
          : "Le paiement mobile money n'est pas encore disponible pour votre pays. "}
        Choisissez un autre pays ci-dessous si vous avez un numéro compatible, ou contactez le support pour activer votre accès manuellement.
      </ThemedText>
    </View>
    <WhatsAppContact
      message={
        countryName
          ? `Bonjour, mon pays (${countryName}) n'est pas encore pris en charge pour le paiement mobile money. Pouvez-vous activer mon accès manuellement ?`
          : "Bonjour, mon pays n'est pas pris en charge pour le paiement mobile money. Pouvez-vous activer mon accès manuellement ?"
      }
      style={{ marginTop: 8 }}
    />
  </View>
);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  bannerDark: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  text: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default UnsupportedCountryBanner;
