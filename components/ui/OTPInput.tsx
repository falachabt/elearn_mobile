import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
  ViewStyle,
  TextStyle,
  Clipboard,
} from 'react-native';
import {theme} from "@/constants/theme";

interface OTPInputProps {
  length?: number;
  value: string;
  onChangeText: (text: string) => void;
  isError?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  errorInputStyle?: TextStyle;
  focusedInputStyle?: TextStyle;
  disabledInputStyle?: TextStyle;
}

const OTPInput: React.FC<OTPInputProps> = ({
                                             length = 6,
                                             value,
                                             onChangeText,
                                             isError = false,
                                             disabled = false,
                                             containerStyle,
                                             inputStyle,
                                             errorInputStyle,
                                             focusedInputStyle,
                                             disabledInputStyle,
                                           }) => {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [localValue, setLocalValue] = useState<string[]>(Array(length).fill(''));

  useEffect(() => {
    // Sync external value with local state
    const newValue = value?.split('').slice(0, length) || [];
    setLocalValue([...newValue, ...Array(length - newValue.length).fill('')]);
  }, [value, length]);

  const handleInputChange = async (text: string, index: number) => {
    if (disabled) return;

    // Handle paste event
    if (text.length > 1) {
      try {
        const clipboardContent = text.slice(0, length - index);
        const newValue = [...localValue];

        for (let i = 0; i < clipboardContent.length; i++) {
          const targetIndex = index + i;
          if (targetIndex < length) {
            newValue[targetIndex] = clipboardContent[i];
          }
        }

        setLocalValue(newValue);
        onChangeText(newValue.join(''));

        // Focus the last filled input or the last possible input
        const nextIndex = Math.min(index + clipboardContent.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
      } catch (error) {
        console.error('Paste handling error:', error);
      }
      return;
    }

    // Handle single character input
    const sanitizedText = text.replace(/[^0-9]/g, '');
    const newValue = [...localValue];
    newValue[index] = sanitizedText;
    setLocalValue(newValue);
    onChangeText(newValue.join(''));

    // Auto-advance to next input
    if (sanitizedText && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (disabled) return;

    const key = e.nativeEvent.key;
    if (key === 'Backspace') {
      const newValue = [...localValue];

      if (newValue[index]) {
        // Clear current input if it has a value
        newValue[index] = '';
        setLocalValue(newValue);
        onChangeText(newValue.join(''));
      } else if (index > 0) {
        // Move to and clear previous input if current is empty
        newValue[index - 1] = '';
        setLocalValue(newValue);
        onChangeText(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  return (
      <View style={[styles.container, containerStyle]}>
        {localValue.map((digit, index) => (
            <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                style={[
                  styles.input,
                  inputStyle,
                  focusedIndex === index && { ...styles.focusedInput, ...focusedInputStyle },
                  isError && { ...styles.errorInput, ...errorInputStyle },
                  disabled && { ...styles.disabledInput, ...disabledInputStyle }
                ]}
                value={digit}
                onChangeText={(text) => handleInputChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => handleFocus(index)}
                onBlur={handleBlur}
                keyboardType={Platform.select({ ios: 'number-pad', android: 'numeric' })}
                maxLength={length}
                selectTextOnFocus
                editable={!disabled}
                caretHidden={true}
                autoCorrect={false}
                contextMenuHidden={true}
                textContentType="oneTimeCode"
            />
        ))}
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  input: {
    width: 45,
    height: 45,
    borderWidth: 1.5,
    borderRadius: 8,
    marginHorizontal: 4,
    textAlign: 'center',
    fontFamily : theme.typography.fontFamily,
fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  focusedInput: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  errorInput: {
    borderColor: '#FF0000',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    color: '#888888',
  },
});

export default OTPInput;