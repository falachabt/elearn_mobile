import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { theme } from '@/constants/theme';
import { TextInput } from 'react-native-gesture-handler';
import { AccountsInput } from '@/types/type';
import { useAuth } from '@/contexts/auth';

export interface UserInfoFormProps {
  userInfo: AccountsInput | null;
  setUserInfo: React.Dispatch<React.SetStateAction<AccountsInput | null>>;
  title: string;
  description: string;
}

const UserInfoForm = forwardRef(({ userInfo, setUserInfo, title, description }: UserInfoFormProps, ref) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { user } = useAuth();

  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    let valid = true;
    let newErrors: { [key: string]: string } = {};

    if (!userInfo?.firstname) {
      newErrors.firstName = 'Le prénom est requis';
      valid = false;
    }

    if (!userInfo?.lastname) {
      newErrors.lastName = 'Le nom de famille est requis';
      valid = false;
    }

    // Phone validation is now optional
    const phoneRegex = /^6[5-9]{1}[0-9]{7}$/;
    if (userInfo?.phone && !phoneRegex.test(String(userInfo.phone))) {
      newErrors.phoneNumber = 'Le numéro de téléphone est invalide';
      valid = false;
    }

    // City validation removed since it's no longer required

    setErrors(newErrors);
    return valid;
  };

  useImperativeHandle(ref, () => ({
    validate,
  }));

  const updateUserInfo = (field: string, value: any) => {
    setUserInfo(prev => prev ? { ...prev, [field]: value } : { [field]: value, authId: '', email: '' });
  };

  function convertDate(date: string) {
    const dateString = String(date);
    return dateString.split('-').reverse().join('-');
  }

  useEffect(() => {
    if (user?.birthdate) {
      console.log(user.birthdate);
      const dateString = String(user.birthdate);
      const dateParts = dateString.split('-');
      updateUserInfo('birthdate', `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
    }
  }, [user]);

  return (
      <ScrollView style={[
        styles.scrollView,
        isDarkMode && styles.scrollViewDark
      ]}>
        <View style={[
          styles.container,
          isDarkMode && styles.containerDark
        ]}>
          <Text style={[
            styles.title,
            isDarkMode && styles.textDark
          ]}>{title}</Text>
          <Text style={[
            styles.description,
            isDarkMode && styles.textDark
          ]}>{description}</Text>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={[
              styles.sectionTitle,
              isDarkMode && styles.textDark
            ]}>Informations de base</Text>

            <View style={styles.inputContainer}>
              <Text style={[
                styles.label,
                isDarkMode && styles.textDark
              ]}>Prénom</Text>
              <TextInput
                  style={[
                    styles.input,
                    isDarkMode && styles.inputDark,
                    focusedInput === 'firstName' && styles.inputFocused,
                    errors.firstName && styles.inputError
                  ]}
                  value={userInfo?.firstname || ""}
                  onChangeText={(text) => updateUserInfo('firstname', text)}
                  onFocus={() => setFocusedInput('firstName')}
                  onBlur={() => setFocusedInput(null)}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[
                styles.label,
                isDarkMode && styles.textDark
              ]}>Nom de famille</Text>
              <TextInput
                  style={[
                    styles.input,
                    isDarkMode && styles.inputDark,
                    focusedInput === 'lastName' && styles.inputFocused,
                    errors.lastName && styles.inputError
                  ]}
                  value={userInfo?.lastname || ""}
                  onChangeText={(text) => updateUserInfo('lastname', text)}
                  onFocus={() => setFocusedInput('lastName')}
                  onBlur={() => setFocusedInput(null)}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={[
              styles.sectionTitle,
              isDarkMode && styles.textDark
            ]}>Coordonnées (optionnel)</Text>

            <View style={styles.inputContainer}>
              <Text style={[
                styles.label,
                isDarkMode && styles.textDark
              ]}>Numéro de téléphone (optionnel)</Text>
              <TextInput
                  style={[
                    styles.input,
                    isDarkMode && styles.inputDark,
                    focusedInput === 'phoneNumber' && styles.inputFocused,
                    errors.phoneNumber && styles.inputError
                  ]}
                  value={userInfo?.phone ? String(userInfo.phone) : ""}
                  onChangeText={(text) => updateUserInfo('phone', Number(text))}
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedInput('phoneNumber')}
                  onBlur={() => setFocusedInput(null)}
                  maxLength={9}
                  placeholder="Optionnel"
                  placeholderTextColor={isDarkMode ? theme.color.gray[400] : theme.color.gray[500]}
              />
              {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[
                styles.label,
                isDarkMode && styles.textDark
              ]}>Ville (optionnel)</Text>
              <TextInput
                  style={[
                    styles.input,
                    isDarkMode && styles.inputDark,
                    focusedInput === 'city' && styles.inputFocused
                  ]}
                  value={userInfo?.city || ""}
                  onChangeText={(text) => updateUserInfo('city', text)}
                  onFocus={() => setFocusedInput('city')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Optionnel"
                  placeholderTextColor={isDarkMode ? theme.color.gray[400] : theme.color.gray[500]}
              />
            </View>
          </View>
        </View>
      </ScrollView>
  );
});

export default UserInfoForm;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    // backgroundColor: theme.color.background,
  },
  scrollViewDark: {
    // backgroundColor: theme.color.dark.background.secondary,
  },
  container: {
    // padding: theme.spacing.medium,
  },
  containerDark: {
    // backgroundColor: theme.color.dark.background.secondary,
  },
  section: {
    marginBottom: theme.spacing.large,
  },
  sectionTitle: {
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
    marginBottom: theme.spacing.small,
    color: theme.color.gray[700],
  },
  inputContainer: {
    marginBottom: theme.spacing.medium,
  },
  label: {
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
    fontWeight: '500',
    marginBottom: theme.spacing.small,
    color: theme.color.gray[700],
  },
  input: {
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.gray[300],
    padding: theme.spacing.small,
    borderRadius: theme.border.radius.small,
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    backgroundColor: theme.color.gray[50],
    color: theme.color.gray[900],
  },
  inputDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.background.tertiary,
    color: theme.color.gray[50],
  },
  inputFocused: {
    borderColor: theme.color.primary[500],
  },
  inputError: {
    borderColor: theme.color.error,
  },
  errorText: {
    color: theme.color.error,
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
    marginTop: theme.spacing.small,
  },
  title: {
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: '700',
    marginBottom: theme.spacing.small,
    color: theme.color.gray[900],
  },
  description: {
    marginBottom: theme.spacing.medium,
    color: theme.color.gray[600],
  },
  textDark: {
    color: theme.color.gray[50],
  },
});