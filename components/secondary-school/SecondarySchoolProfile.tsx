import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { UserType, ClassLevel, Subject, CamerounRegion } from '@/types/secondary-school';

interface SecondarySchoolProfileProps {
  onComplete: (profileData: SecondaryProfileData) => void;
}

export interface SecondaryProfileData {
  user_type: UserType;
  class_level?: string;
  school_name?: string;
  school_region?: string;
  subjects?: string[];
  years_experience?: number;
  establishment?: string;
}

const CLASS_LEVELS: ClassLevel[] = ['3ème', '2nde', '1ère A', '1ère C', '1ère D', 'Tle A', 'Tle C', 'Tle D'];

const SUBJECTS: Subject[] = [
  'Mathématiques', 'Physique', 'Chimie', 'SVT', 'Français', 'Anglais',
  'Histoire', 'Géographie', 'Philosophie', 'Économie', 'Allemand', 'Espagnol', 'Informatique'
];

const REGIONS: CamerounRegion[] = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest'
];

export default function SecondarySchoolProfile({ onComplete }: SecondarySchoolProfileProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== 'light';
  
  const [userType, setUserType] = useState<UserType | null>(null);
  const [classLevel, setClassLevel] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolRegion, setSchoolRegion] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [establishment, setEstablishment] = useState<string>('');

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    // Reset fields when switching user type
    setClassLevel('');
    setSelectedSubjects([]);
    setYearsExperience('');
    setEstablishment('');
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(current => 
      current.includes(subject) 
        ? current.filter(s => s !== subject)
        : [...current, subject]
    );
  };

  const validateAndSubmit = () => {
    if (!userType) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre type de profil');
      return;
    }

    if (userType === 'student' && !classLevel) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre classe');
      return;
    }

    if (userType === 'teacher' && selectedSubjects.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une matière que vous enseignez');
      return;
    }

    const profileData: SecondaryProfileData = {
      user_type: userType,
      ...(userType === 'student' && {
        class_level: classLevel,
        school_name: schoolName || undefined,
        school_region: schoolRegion || undefined,
      }),
      ...(userType === 'teacher' && {
        subjects: selectedSubjects,
        years_experience: yearsExperience ? parseInt(yearsExperience) : undefined,
        establishment: establishment || undefined,
      }),
    };

    onComplete(profileData);
  };

  const renderUserTypeSelection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
        Quel est votre profil ?
      </Text>
      
      <TouchableOpacity
        style={[
          styles.optionCard,
          isDarkMode && styles.optionCardDark,
          userType === 'student' && styles.optionCardSelected
        ]}
        onPress={() => handleUserTypeSelect('student')}
      >
        <MaterialCommunityIcons name="school" size={32} color={theme.color.primary[500]} />
        <View style={styles.optionContent}>
          <Text style={[styles.optionTitle, isDarkMode && styles.optionTitleDark]}>
            Élève
          </Text>
          <Text style={[styles.optionDescription, isDarkMode && styles.optionDescriptionDark]}>
            Je suis un élève du secondaire (3ème à Terminale)
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.optionCard,
          isDarkMode && styles.optionCardDark,
          userType === 'teacher' && styles.optionCardSelected
        ]}
        onPress={() => handleUserTypeSelect('teacher')}
      >
        <MaterialCommunityIcons name="account-tie" size={32} color={theme.color.primary[500]} />
        <View style={styles.optionContent}>
          <Text style={[styles.optionTitle, isDarkMode && styles.optionTitleDark]}>
            Enseignant
          </Text>
          <Text style={[styles.optionDescription, isDarkMode && styles.optionDescriptionDark]}>
            Je suis enseignant au secondaire
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.optionCard,
          isDarkMode && styles.optionCardDark,
          userType === 'parent' && styles.optionCardSelected
        ]}
        onPress={() => handleUserTypeSelect('parent')}
      >
        <MaterialCommunityIcons name="account-heart" size={32} color={theme.color.primary[500]} />
        <View style={styles.optionContent}>
          <Text style={[styles.optionTitle, isDarkMode && styles.optionTitleDark]}>
            Parent
          </Text>
          <Text style={[styles.optionDescription, isDarkMode && styles.optionDescriptionDark]}>
            Je suis parent d'élève du secondaire
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStudentForm = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
        Informations scolaires
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Classe *
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {CLASS_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.chip,
                isDarkMode && styles.chipDark,
                classLevel === level && styles.chipSelected
              ]}
              onPress={() => setClassLevel(level)}
            >
              <Text style={[
                styles.chipText,
                isDarkMode && styles.chipTextDark,
                classLevel === level && styles.chipTextSelected
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Nom de l'établissement (optionnel)
        </Text>
        <TextInput
          style={[styles.textInput, isDarkMode && styles.textInputDark]}
          value={schoolName}
          onChangeText={setSchoolName}
          placeholder="Ex: Lycée de Yaoundé"
          placeholderTextColor={isDarkMode ? theme.color.gray[500] : "#999"}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Région (optionnel)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {REGIONS.map((region) => (
            <TouchableOpacity
              key={region}
              style={[
                styles.chip,
                isDarkMode && styles.chipDark,
                schoolRegion === region && styles.chipSelected
              ]}
              onPress={() => setSchoolRegion(region)}
            >
              <Text style={[
                styles.chipText,
                isDarkMode && styles.chipTextDark,
                schoolRegion === region && styles.chipTextSelected
              ]}>
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderTeacherForm = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
        Informations professionnelles
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Matières enseignées *
        </Text>
        <View style={styles.subjectsGrid}>
          {SUBJECTS.map((subject) => (
            <TouchableOpacity
              key={subject}
              style={[
                styles.chip,
                isDarkMode && styles.chipDark,
                selectedSubjects.includes(subject) && styles.chipSelected
              ]}
              onPress={() => toggleSubject(subject)}
            >
              <Text style={[
                styles.chipText,
                isDarkMode && styles.chipTextDark,
                selectedSubjects.includes(subject) && styles.chipTextSelected
              ]}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Années d'expérience (optionnel)
        </Text>
        <TextInput
          style={[styles.textInput, isDarkMode && styles.textInputDark]}
          value={yearsExperience}
          onChangeText={setYearsExperience}
          placeholder="Ex: 5"
          keyboardType="numeric"
          placeholderTextColor={isDarkMode ? theme.color.gray[500] : "#999"}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Établissement (optionnel)
        </Text>
        <TextInput
          style={[styles.textInput, isDarkMode && styles.textInputDark]}
          value={establishment}
          onChangeText={setEstablishment}
          placeholder="Ex: Collège de Douala"
          placeholderTextColor={isDarkMode ? theme.color.gray[500] : "#999"}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Configuration du profil
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Personnalisez votre expérience dans l'espace secondaire
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderUserTypeSelection()}
        
        {userType === 'student' && renderStudentForm()}
        {userType === 'teacher' && renderTeacherForm()}
        
        {userType === 'parent' && (
          <View style={styles.section}>
            <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
              En tant que parent, vous pourrez suivre les activités de vos enfants et configurer les contrôles parentaux.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, isDarkMode && styles.footerDark]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !userType && styles.continueButtonDisabled
          ]}
          onPress={validateAndSubmit}
          disabled={!userType}
        >
          <Text style={styles.continueButtonText}>
            Continuer
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.light.background.primary,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  titleDark: {
    color: theme.color.gray[50],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  subtitleDark: {
    color: theme.color.gray[300],
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: theme.color.gray[50],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: theme.border.radius.medium,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  optionCardSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[50],
  },
  optionContent: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  optionTitleDark: {
    color: theme.color.gray[50],
  },
  optionDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#666666',
  },
  optionDescriptionDark: {
    color: theme.color.gray[300],
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  labelDark: {
    color: theme.color.gray[50],
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: theme.border.radius.small,
    padding: 12,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  textInputDark: {
    borderColor: theme.color.gray[800],
    backgroundColor: theme.color.dark.background.secondary,
    color: theme.color.gray[50],
  },
  horizontalScroll: {
    marginBottom: 8,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipDark: {
    backgroundColor: theme.color.gray[800],
  },
  chipSelected: {
    backgroundColor: theme.color.primary[500],
    borderColor: theme.color.primary[500],
  },
  chipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#666666',
  },
  chipTextDark: {
    color: theme.color.gray[300],
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  infoText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoTextDark: {
    color: theme.color.gray[300],
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  footerDark: {
    borderTopColor: theme.color.gray[800],
  },
  continueButton: {
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});