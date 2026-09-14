import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';
import CountryPickerBottomSheet, { Country, COUNTRIES } from '@/components/ui/CountryPickerBottomSheet';

const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.name === 'Cameroun') ?? COUNTRIES[0];

/** Best-effort match of a free-text country name (e.g. accounts.country) to
 * the phone-country list, used only to pre-select a sensible default. */
export function findPhoneCountryByName(name?: string | null): Country {
  if (!name) return DEFAULT_COUNTRY;
  const q = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === q) ?? DEFAULT_COUNTRY;
}

interface PhoneNumberFieldProps {
  label?: string;
  localNumber: string;
  onChangeLocalNumber: (value: string) => void;
  country: Country;
  onChangeCountry: (country: Country) => void;
  isDark: boolean;
  error?: string | null;
}

/** Phone number input with a country dial-code picker (flag + regex per
 * country) -- used on every mobile-money payment screen so the number sent
 * to PawaPay matches the country the customer actually picked. */
export const PhoneNumberField: React.FC<PhoneNumberFieldProps> = ({
  label = 'Numéro de téléphone',
  localNumber,
  onChangeLocalNumber,
  country,
  onChangeCountry,
  isDark,
  error,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  const isValid = useMemo(
    () => (localNumber ? country.regex.test(localNumber) : true),
    [localNumber, country]
  );

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.dialCodeButton, isDark && styles.dialCodeButtonDark]}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={[styles.dialCodeText, isDark && styles.dialCodeTextDark]}>{country.code}</Text>
        </TouchableOpacity>
        <TextInput
          style={[
            styles.input,
            isDark && styles.inputDark,
            !isValid && styles.inputError,
          ]}
          placeholder={country.placeholder}
          placeholderTextColor={isDark ? theme.color.gray[600] : theme.color.gray[400]}
          keyboardType="phone-pad"
          value={localNumber}
          onChangeText={(text) => onChangeLocalNumber(text.replace(/[^0-9]/g, ''))}
          maxLength={country.maxLength}
        />
      </View>
      {!isValid && (
        <Text style={styles.errorText}>Numéro invalide pour {country.name}</Text>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <CountryPickerBottomSheet
        visible={pickerVisible}
        selected={country}
        onSelect={onChangeCountry}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: { marginBottom: 16, paddingHorizontal: 4 },
  inputLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputLabelDark: { color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  dialCodeButtonDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[600],
  },
  flag: { fontSize: 18 },
  dialCodeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: '600',
  },
  dialCodeTextDark: { color: '#FFFFFF' },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
  },
  inputDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[600],
    color: '#FFFFFF',
  },
  inputError: { borderColor: theme.color.error[500] },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.color.error[500],
    marginTop: 6,
  },
});

export default PhoneNumberField;
