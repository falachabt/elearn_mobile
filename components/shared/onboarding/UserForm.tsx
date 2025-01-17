import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { TextInput } from 'react-native-gesture-handler';
import { AccountsInput } from '@/types/type';

export interface UserInfoFormProps {
  userInfo: AccountsInput | null;
  setUserInfo: React.Dispatch<React.SetStateAction<AccountsInput | null>> ;
  title: string;
  description: string;
}

const UserInfoForm = forwardRef(({ userInfo, setUserInfo, title, description }: UserInfoFormProps, ref) => {
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

    const phoneRegex = /^[0-9]{9}$/;
    if (!userInfo?.phone || !phoneRegex.test(String(userInfo.phone))) {
      newErrors.phoneNumber = 'Le numéro de téléphone est invalide';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  useImperativeHandle(ref, () => ({
    validate,
  }));

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <TextInput
        style={[
          styles.input,
          focusedInput === 'firstName' && styles.inputFocused,
          errors.firstName && styles.inputError
        ]}
        placeholder="Prénom"
        value={userInfo?.firstname || ""}
        onChangeText={(text) => setUserInfo(userInfo ? { ...userInfo, firstname: text } : {  firstname: text, email: '', authId: '' })}
        onFocus={() => setFocusedInput('firstName')}
        onBlur={() => setFocusedInput(null)}
      />
      {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

      <TextInput
        style={[
          styles.input,
          focusedInput === 'lastName' && styles.inputFocused,
          errors.lastName && styles.inputError
        ]}
        placeholder="Nom de famille"
        value={userInfo?.lastname || ""}
        onChangeText={(text) => setUserInfo(userInfo ? { ...userInfo, lastname: text } : {  lastname: text, email: '', authId: '' })}
        onFocus={() => setFocusedInput('lastName')}
        onBlur={() => setFocusedInput(null)}
      />
      {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

        <TextInput
          style={[
            styles.input,
            focusedInput === 'phoneNumber' && styles.inputFocused,
            errors.phoneNumber && styles.inputError
          ]}
          placeholder="Numéro de téléphone"
          value={userInfo?.phone ? String(userInfo.phone) : "123456789"}
          onChangeText={(text) => setUserInfo(userInfo ? { ...userInfo, phone: Number(text) } : {  phone: Number(text), email: '', authId: '' })}
          keyboardType="default"  //todo: put numericor phone pad
          
          onFocus={() => setFocusedInput('phoneNumber')}
          onBlur={() => setFocusedInput(null)}
        />
        {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
    </View>
  );
});

export default UserInfoForm;

const styles = StyleSheet.create({
  input: {
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.gray[300],
    padding: 10,
    marginVertical: 8,
    borderRadius: theme.border.radius.small,
  },
  inputFocused: {
    borderColor: theme.color.primary[500],
  },
  inputError: {
    borderColor: theme.color.error,
  },
  errorText: {
    color: theme.color.error,
    marginBottom: 3,
  },
  title: {
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: '700',
    marginBottom: theme.spacing.small,
  },
  description: {
    marginBottom: theme.spacing.medium,
  },
});