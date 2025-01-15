import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import ProgramCard from '@/components/shared/ProgramCard';
import SubjectSelector from '@/components/shared/onboarding/SubjectSelector';
import LearningStyleSelector from '@/components/shared/onboarding/LearningStyleSelector';
import { theme } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface StudentProfile {
  niveau: string;
  moyenne: string;
  matieresFortes: string[];
  matieresFaibles: string[];
  tempsEtude: string;
  objectif: string;
  styleApprentissage: string;
}

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [progressWidth] = useState(new Animated.Value(0));
  const [knowsProgram, setKnowsProgram] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<StudentProfile>({
    niveau: '',
    moyenne: '',
    matieresFortes: [],
    matieresFaibles: [],
    tempsEtude: '',
    objectif: '',
    styleApprentissage: '',
  });

  useEffect(() => {
    animateProgress();
  }, [step]);

  const animateProgress = () => {
    Animated.spring(progressWidth, {
      toValue: (step / 5) * 100,
      useNativeDriver: false,
      damping: 20,
      stiffness: 100,
    }).start();
  };

  const getProgressBarWidth = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const stepsContent = [
    {
      title: 'Bienvenue sur Elearn Prepa',
      description: 'Votre réussite commence ici. Un parcours personnalisé vers votre école de rêve',
    },
    {
      title: 'Une Préparation Unique',
      description: 'Un accompagnement sur mesure, des ressources exclusives et un suivi personnalisé.',
    },
    {
      title: 'Votre Parcours',
      description: 'Dites-nous si vous savez déjà quel concours vous souhaitez préparer.',
    },
    {
      title: 'Votre Profil',
      description: 'Quelques informations pour personnaliser votre préparation.',
    },
    {
      title: 'Programmes',
      description: 'Découvrez nos programmes adaptés à votre profil.',
    },
  ];

  const totalSteps = stepsContent.length; // Nombre total d'étapes

  const renderProgressBar = () => {
    const steps = [];
    for (let i = 1; i <= totalSteps; i++) {
      steps.push(
        <View
          key={i}
          style={[
            styles.step,
            { backgroundColor: i <= step ? theme.color.primary[500] : '#E0E0E0' } // Couleur primaire si l'étape est passée, gris sinon
          ]}
        />
      );
    }
    return <View style={styles.progressContainer}>{steps}</View>;
  };

  const renderPathChoice = () => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800} 
      style={styles.pathChoiceContainer}
    >
      <TouchableOpacity
        style={[
          styles.choiceCard,
          knowsProgram === true && styles.choiceCardSelected
        ]}
        onPress={() => setKnowsProgram(true)}
      >
        <View style={styles.choiceIconContainer}>
          <FontAwesome5 name="graduation-cap" size={32} color={theme.color.primary[500]} />
        </View>
        <Text style={styles.choiceTitle}>
          Je sais quel concours préparer
        </Text>
        <Text style={styles.choiceDescription}>
          Je connais mon objectif et je souhaite démarrer ma préparation
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.choiceCard,
          knowsProgram === false && styles.choiceCardSelected
        ]}
        onPress={() => setKnowsProgram(false)}
      >
        <View style={styles.choiceIconContainer}>
          <FontAwesome5 name="compass" size={32} color={theme.color.primary[500]} />
        </View>
        <Text style={styles.choiceTitle}>
          J'ai besoin de conseils
        </Text>
        <Text style={styles.choiceDescription}>
          Je souhaite être guidé(e) dans le choix de mon concours
        </Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderProfileForm = () => (
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
            onChangeText={(text) => setProfile({...profile, niveau: text})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Moyenne Générale</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 15.5"
            keyboardType="numeric"
            value={profile.moyenne}
            onChangeText={(text) => setProfile({...profile, moyenne: text})}
          />
        </View>

        <SubjectSelector
          title="Vos Points Forts"
          selected={profile.matieresFortes}
          onSelect={(subjects) => setProfile({...profile, matieresFortes: subjects})}
        />

        <SubjectSelector
          title="Matières à Renforcer"
          selected={profile.matieresFaibles}
          onSelect={(subjects) => setProfile({...profile, matieresFaibles: subjects})}
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Temps d'Étude Disponible (heures/jour)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 3"
            keyboardType="numeric"
            value={profile.tempsEtude}
            onChangeText={(text) => setProfile({...profile, tempsEtude: text})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Objectif de Moyenne</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 17"
            keyboardType="numeric"
            value={profile.objectif}
            onChangeText={(text) => setProfile({...profile, objectif: text})}
          />
        </View>

        <LearningStyleSelector
          selected={profile.styleApprentissage}
          onSelect={(style) => setProfile({...profile, styleApprentissage: style})}
        />
      </ScrollView>
    </Animatable.View>
  );

  const renderPrograms = () => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800} 
      style={styles.programsContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.programsTitle}>
          {knowsProgram 
            ? 'Choisissez votre programme'
            : 'Programmes recommandés pour vous'
          }
        </Text>

        <ProgramCard
          title="Programme Excellence"
          description="Préparation intensive avec suivi personnalisé"
          price={299}
          features={[
            'Cours en direct hebdomadaires',
            'Exercices personnalisés',
            'Suivi individuel',
            'Accès illimité aux ressources',
          ]}
          level="Avancé"
          onSelect={() => console.log('Selected Premium')}
        />

        <ProgramCard
          title="Programme Standard"
          description="Une préparation complète et efficace"
          price={199}
          features={[
            'Accès aux cours enregistrés',
            'Exercices corrigés',
            'Forum d\'entraide',
            'Support par email',
          ]}
          level="Intermédiaire"
          onSelect={() => console.log('Selected Standard')}
        />
      </ScrollView>
    </Animatable.View>
  );

  const getImageSource = (step: number) => {
    switch (step) {
      case 1:
        return require('@/assets/images/onboarding/step1.png');
      case 2:
        return require('@/assets/images/onboarding/step2.png');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 3:
        return renderPathChoice();
      case 4:
        return renderProfileForm();
      case 5:
        return renderPrograms();
      default:
        return (
          <Animatable.View 
            animation="fadeIn" 
            duration={800} 
            style={styles.defaultContent}
          >
            <Image
              source={getImageSource(step)}             
               style={styles.stepImage}
            />
            <Text style={styles.title}>{stepsContent[step - 1].title}</Text>
            <Text style={styles.description}>
              {stepsContent[step - 1].description}
            </Text>
          </Animatable.View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderProgressBar()}
      
      <View style={styles.content}>
        {renderStepContent()}
      </View>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Précédent
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            step === 3 && !knowsProgram && styles.disabledButton
          ]}
          onPress={() => {
            if (step < 5) setStep(step + 1);
            else console.log('Complete!');
          }}
          disabled={step === 3 && !knowsProgram}
        >
          <Text style={styles.buttonText}>
            {step === 5 ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: theme.spacing.large
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    marginHorizontal: 20
  },
  step: {
    flex: 1,
    height: 10,
    marginHorizontal: 2,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  defaultContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepImage: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.color.primary[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: theme.border.radius.small ,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: theme.color.primary[500] ,
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
  },
  disabledButton: {
    backgroundColor: '#B4B4B4',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#666666',
  },

  // Path Choice Styles
  pathChoiceContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  choiceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: theme.border.radius.medium,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E1E1E1',
  },
  choiceCardSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[100],
  },
  choiceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  choiceTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  choiceDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },

  // Form Styles
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },

  // Programs Styles
  programsContainer: {
    flex: 1,
  },
  programsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
  },
});

export default Onboarding;