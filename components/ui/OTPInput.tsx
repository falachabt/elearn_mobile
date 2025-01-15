import { theme } from '@/constants/theme';
import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface OTPInputProps {
  otp: string;
  setOtp: (otp: string) => void;
  isOtpValid: boolean;
  length?: number;
}

const OTPInput: React.FC<OTPInputProps> = ({ otp = '', setOtp, isOtpValid, length = 6 }) => {
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, index: number): void => {
    const newOtp = otp.split('');
    if (text.length > 1) {
      // Handle paste event
      const pastedOtp = text.split('').slice(0, length - index);
      for (let i = 0; i < pastedOtp.length; i++) {
        newOtp[index + i] = pastedOtp[i];
      }
      setOtp(newOtp.join(''));
      inputs.current[Math.min(index + pastedOtp.length, length - 1)]?.focus();
    } else {
      newOtp[index] = text;
      setOtp(newOtp.join(''));
      // Move to next input if text is not empty and not the last input
      if (text && index < length - 1) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number): void => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // Create array of empty spaces if otp is null/empty
  const otpArray = otp.split('').concat(Array(length - otp.length).fill(''));

  return (
    <View style={styles.otpContainer}>
      {otpArray.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputs.current[index] = ref)}
          style={[styles.otpInput, !isOtpValid && !digit && styles.otpInputError]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="numeric"
          maxLength={1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  otpContainer: {
    flexDirection: 'row',
    justifyContent: "center",
    margin: 25
  },
  otpInput: {
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.border,
    borderRadius: theme.border.radius.small,
    textAlign: 'center',
    width: 50,
    height: 50,
    margin: 5,
  },
  otpInputError: {
    borderColor: theme.color.error,
  },
});

export default OTPInput;
