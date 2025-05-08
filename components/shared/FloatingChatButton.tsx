import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { HapticType, useHaptics } from '@/hooks/useHaptics';

interface FloatingChatButtonProps {
  onPress: () => void;
  isDark?: boolean;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onPress, isDark = false }) => {
  const { trigger } = useHaptics();

  const handlePress = () => {
    trigger(HapticType.LIGHT);
    onPress();
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isDark && styles.buttonDark]}
        onPress={handlePress}
        android_ripple={{ color: isDark ? '#4B5563' : '#D1D5DB', radius: 28 }}
      >
        <MaterialCommunityIcons
          name="chat-outline"
          size={24}
          color={isDark ? '#FFFFFF' : '#FFFFFF'}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDark: {
    backgroundColor: theme.color.primary[600],
  },
});

export default FloatingChatButton;