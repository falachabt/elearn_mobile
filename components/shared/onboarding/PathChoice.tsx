import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import { FontAwesome5 } from '@expo/vector-icons';


interface PathChoiceProps {
  knowsProgram: boolean;
  setKnowsProgram: (value: boolean) => void;
}

const PathChoice: React.FC<PathChoiceProps> = ({ knowsProgram, setKnowsProgram }) => (
  <Animatable.View animation="fadeInUp" duration={800} style={styles.pathChoiceContainer}>
    <TouchableOpacity
      style={[styles.choiceCard, knowsProgram === true && styles.choiceCardSelected]}
      onPress={() => setKnowsProgram(true)}
    >
      <View style={styles.choiceIconContainer}>
        <FontAwesome5 name="graduation-cap" size={32} color={theme.color.primary[500]} />
      </View>
      <Text style={styles.choiceTitle}>Je sais quel concours préparer</Text>
      <Text style={styles.choiceDescription}>Je connais mon objectif et je souhaite démarrer ma préparation</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.choiceCard, knowsProgram === false && styles.choiceCardSelected]}
      onPress={() => setKnowsProgram(false)}
    >
      <View style={styles.choiceIconContainer}>
        <FontAwesome5 name="compass" size={32} color={theme.color.primary[500]} />
      </View>
      <Text style={styles.choiceTitle}>J'ai besoin de conseils</Text>
      <Text style={styles.choiceDescription}>Je souhaite être guidé(e) dans le choix de mon concours</Text>
    </TouchableOpacity>
  </Animatable.View>
);

const styles = StyleSheet.create( {
 // Path Choice Styles
 pathChoiceContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  choiceCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: theme.border.radius.medium,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#E1E1E1",
  },
  choiceCardSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[100],
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
  choiceTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  choiceDescription: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 24,
  },
});

export default PathChoice;