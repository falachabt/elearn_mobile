import React from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { theme } from "@/constants/theme";
import * as Animatable from "react-native-animatable";
import SubjectSelector from "./SubjectSelector";
import LearningStyleSelector from "./LearningStyleSelector";

export interface Profile {
  niveau: string;
  moyenne: string;
  matieresFortes: string[];
  matieresFaibles: string[];
  tempsEtude: string;
  objectif: string;
  styleApprentissage: string;
}

interface ProfileFormProps {
  profile: Profile;
  setProfile: (profile: Profile) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, setProfile }) => (
  <Animatable.View
    animation="fadeInUp"
    duration={800}
    style={styles.formContainer}
  >
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.formTitle}>Votre Profil d'Étudiant</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Niveau Actuel</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Terminale S"
          value={profile.niveau}
          onChangeText={(text) => setProfile({ ...profile, niveau: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Moyenne Générale</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 15.5"
          keyboardType="numeric"
          value={profile.moyenne}
          onChangeText={(text) => setProfile({ ...profile, moyenne: text })}
        />
      </View>

      <SubjectSelector
        title="Vos Points Forts"
        selected={profile.matieresFortes}
        onSelect={(subjects) =>
          setProfile({ ...profile, matieresFortes: subjects })
        }
      />

      <SubjectSelector
        title="Matières à Renforcer"
        selected={profile.matieresFaibles}
        onSelect={(subjects) =>
          setProfile({ ...profile, matieresFaibles: subjects })
        }
      />

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Temps d'Étude Disponible (heures/jour)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 3"
          keyboardType="numeric"
          value={profile.tempsEtude}
          onChangeText={(text) => setProfile({ ...profile, tempsEtude: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Objectif de Moyenne</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 17"
          keyboardType="numeric"
          value={profile.objectif}
          onChangeText={(text) => setProfile({ ...profile, objectif: text })}
        />
      </View>

      <LearningStyleSelector
        selected={profile.styleApprentissage}
        onSelect={(style) =>
          setProfile({ ...profile, styleApprentissage: style })
        }
      />
    </ScrollView>
  </Animatable.View>
);

// Form Styles
const styles = StyleSheet.create({
  // Form Styles
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4A4A4A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
  },
});

export default ProfileForm;
