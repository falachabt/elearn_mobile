import React from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { theme } from "@/constants/theme";
import * as Animatable from "react-native-animatable";
import SubjectSelector from "./SubjectSelector";
import LearningStyleSelector from "./LearningStyleSelector";

// Matching the accounts table schema
export interface Profile {
  gradelevel: string;           // matches gradelevel column
  gpa: number;                  // matches gpa column
  favoritesubjects: string[];   // matches favoritesubjects column
  skills: string[];            // representing matieresFortes (skills in DB)
  maingoal: string;            // matches maingoal column
  othergoals: string;          // matches othergoals column
  learningstyle: string;       // matches learningstyle column
  motivation: string;          // matches motivation column
}

interface ProfileFormProps {
  profile: Profile;
  setProfile: (profile: Profile) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, setProfile }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={800}
      style={[
        styles.formContainer,
        isDark && styles.formContainerDark
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[
          styles.formTitle,
          isDark && styles.formTitleDark
        ]}>
          Votre Profil d'Étudiant
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[
            styles.label,
            isDark && styles.labelDark
          ]}>
            Niveau Actuel
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.inputDark
            ]}
            placeholder="Ex: Terminale S"
            placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
            value={profile.gradelevel}
            onChangeText={(text) => setProfile({ ...profile, gradelevel: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[
            styles.label,
            isDark && styles.labelDark
          ]}>
            Moyenne Générale
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.inputDark
            ]}
            placeholder="Ex: 15.5"
            placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
            keyboardType="numeric"
            value={profile.gpa ? String(profile.gpa) : ''}
            onChangeText={(text) => setProfile({ ...profile, gpa: parseFloat(text) || 0 })}
          />
        </View>

        <SubjectSelector
          title="Vos Points Forts"
          selected={profile.favoritesubjects}
          onSelect={(subjects) =>
            setProfile({ ...profile, favoritesubjects: subjects })
          }
        />

        <SubjectSelector
          title="Compétences à Développer"
          selected={profile.skills}
          onSelect={(subjects) =>
            setProfile({ ...profile, skills: subjects })
          }
        />

        <View style={styles.inputGroup}>
          <Text style={[
            styles.label,
            isDark && styles.labelDark
          ]}>
            Objectif Principal
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.inputDark
            ]}
            placeholder="Ex: Intégrer une école d'ingénieur"
            placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
            value={profile.maingoal}
            onChangeText={(text) => setProfile({ ...profile, maingoal: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[
            styles.label,
            isDark && styles.labelDark
          ]}>
            Autres Objectifs
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.inputDark
            ]}
            placeholder="Vos autres objectifs académiques"
            placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
            value={profile.othergoals}
            onChangeText={(text) => setProfile({ ...profile, othergoals: text })}
            multiline
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[
            styles.label,
            isDark && styles.labelDark
          ]}>
            Motivation
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.inputDark
            ]}
            placeholder="Ce qui vous motive à atteindre vos objectifs"
            placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
            value={profile.motivation}
            onChangeText={(text) => setProfile({ ...profile, motivation: text })}
            multiline
          />
        </View>

        <LearningStyleSelector
          selected={profile.learningstyle}
          onSelect={(style) =>
            setProfile({ ...profile, learningstyle: style })
          }
        />
      </ScrollView>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  formContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.color.gray[900],
    marginBottom: 24,
  },
  formTitleDark: {
    color: theme.color.gray[50],
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.color.gray[700],
    marginBottom: 8,
  },
  labelDark: {
    color: theme.color.gray[300],
  },
  input: {
    backgroundColor: theme.color.gray[100],
    borderRadius: theme.border.radius.medium,
    padding: 16,
    fontSize: 16,
    color: theme.color.gray[900],
    borderWidth: 1,
    borderColor: theme.color.gray[200],
  },
  inputDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
    color: theme.color.gray[50],
  },
});

export default ProfileForm;