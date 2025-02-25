import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import { FontAwesome5 } from '@expo/vector-icons';

interface PathChoiceProps {
  knowsProgram: boolean;
  setKnowsProgram: (value: boolean) => void;
}

const PathChoice: React.FC<PathChoiceProps> = ({ knowsProgram, setKnowsProgram }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800} 
      style={[
        styles.pathChoiceContainer,
        isDark && styles.pathChoiceContainerDark
      ]}
    >
      <TouchableOpacity
        style={[
          styles.choiceCard,
          isDark && styles.choiceCardDark,
          knowsProgram && (isDark ? styles.choiceCardSelectedDark : styles.choiceCardSelected)
        ]}
        onPress={() => setKnowsProgram(true)}
      >
        <View style={[
          styles.choiceIconContainer,
          isDark && styles.choiceIconContainerDark
        ]}>
          <FontAwesome5 
            name="graduation-cap" 
            size={32} 
            color={theme.color.primary[isDark ? 400 : 500]} 
          />
        </View>
        <Text style={[
          styles.choiceTitle,
          isDark && styles.choiceTitleDark
        ]}>
          Je sais quel concours préparer
        </Text>
        <Text style={[
          styles.choiceDescription,
          isDark && styles.choiceDescriptionDark
        ]}>
          Je connais mon objectif et je souhaite démarrer ma préparation
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.choiceCard,
          isDark && styles.choiceCardDark,
          !knowsProgram && (isDark ? styles.choiceCardSelectedDark : styles.choiceCardSelected)
        ]}
        onPress={() => setKnowsProgram(false)}
      >
        <View style={[
          styles.choiceIconContainer,
          isDark && styles.choiceIconContainerDark
        ]}>
          <FontAwesome5 
            name="compass" 
            size={32} 
            color={theme.color.primary[isDark ? 400 : 500]} 
          />
        </View>
        <Text style={[
          styles.choiceTitle,
          isDark && styles.choiceTitleDark
        ]}>
          J'ai besoin de conseils
        </Text>
        <Text style={[
          styles.choiceDescription,
          isDark && styles.choiceDescriptionDark
        ]}>
          Je souhaite être guidé(e) dans le choix de mon concours
        </Text>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  pathChoiceContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  pathChoiceContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  choiceCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: theme.border.radius.medium,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#E1E1E1",
  },
  choiceCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[800],
  },
  choiceCardSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[100],
  },
  choiceCardSelectedDark: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[500],
  },
  choiceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  choiceIconContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  choiceTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  choiceTitleDark: {
    color: theme.color.gray[50],
  },
  choiceDescription: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 24,
  },
  choiceDescriptionDark: {
    color: theme.color.gray[300],
  },
});

export default PathChoice;