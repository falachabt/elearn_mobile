import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import StepProgress from './StepProgress';
import PathChoice from './PathChoice';
import ProfileForm, { Profile } from './ProfileForm';
import Programs from './Programs';
import UserInfoForm from './UserForm';
import { UserInfoFormProps } from './UserForm';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { AccountsInput } from '@/types/type';

const { width } = Dimensions.get("window");



const MainOnboarding = () => {
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const [knowsProgram, setKnowsProgram] = useState(false);
  const userInfoFormRef = useRef<{ validate: () => boolean } | null>(null);
  const [userInfo, setUserInfo] = useState<AccountsInput | null>(null);
  const [profile, setProfile] = useState<Profile>({
    niveau: "",
    moyenne: "",
    matieresFortes: [],
    matieresFaibles: [],
    tempsEtude: "",
    objectif: "",
    styleApprentissage: ""
  })

  const stepsContent = [
    {
      title: "Bienvenue sur Elearn Prepa",
      description: "Construisez votre chemin vers la grande école de vos rêves avec nous.",
      icon: "👋",
    },
    {
      title: "Une Préparation d'Excellence",
      description: "Cours sur mesure, mentors experts et méthodes éprouvées pour votre réussite.",
      icon: "🎯",
    },
    {
      title: "Créez Votre Profil",
      description: "Quelques informations pour personnaliser votre expérience d'apprentissage.",
      icon: "📝",
      isRequired: true,
    },
    {
      title: "Objectif Grande École",
      description: "Précisez les concours qui vous intéressent pour un accompagnement ciblé.",
      icon: "🎓",
      hasChoices: true,
    },
    {
      title: "Personnalisation",
      description: "Partagez votre niveau et vos objectifs pour un programme adapté.",
      icon: "⭐",
    },
    {
      title: "Votre Programme",
      description: "Découvrez votre parcours personnalisé vers la réussite.",
      icon: "📚",
      showPrograms: true,
    }
  ];

  const handleNextStep = async () => {
    if (step === 3 && userInfoFormRef.current) {
      const isValid = userInfoFormRef.current.validate();
      if (!isValid) {
        return;
      }
    }
    if (step < 6) {
      if (step === 4 && knowsProgram) {
        setStep(step + 2);
      } else {
        setStep(step + 1);
      }
    } else {
      const { data, error } = await supabase
        .from("accounts")
        .update({ onboarding_done: true })
        .eq("email", user?.email);
      console.log(data, error);
      console.log("Complete!");
    }
  };

  const getImageSource = (step: number) => {
    switch (step) {
      case 1:
        return require("@/assets/images/onboarding/step1.png");
      case 2:
        return require("@/assets/images/onboarding/step2.png");
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 3:
        // return <UserInfoForm  ref={userInfoFormRef} title={stepsContent[step-1].title} description={stepsContent[step-1].description} userInfo={userInfo} setUserInfo={setUserInfo} />;
      return null
        case 4:
        return <PathChoice knowsProgram={knowsProgram} setKnowsProgram={setKnowsProgram} />;
      case 5:
        return <ProfileForm profile={profile} setProfile={setProfile} />;
      case 6:
        return <Programs knowsProgram={knowsProgram} />;
      default:
        return (
          <Animatable.View animation="fadeIn" duration={800} style={styles.defaultContent}>
            <Animatable.Image source={getImageSource(step)} style={styles.stepImage} />
            <Text style={styles.title}>{stepsContent[step - 1].title}</Text>
            <Text style={styles.description}>{stepsContent[step - 1].description}</Text>
          </Animatable.View>
        );
    }
  };

  return (
    <View style={styles.container}>
        <View style={styles.group1} >
      <StepProgress step={step} totalSteps={6} />
      {renderStepContent()}
            </View> 
      
            <View style={styles.footer}>
              {step > 1 && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    if(step == 6 && knowsProgram ){
                      setStep(step - 2)
                    }else{
                      setStep(step - 1)
                    }
                  }}
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
                  step === 4 && knowsProgram === null && styles.disabledButton,
                ]}
                onPress={handleNextStep}
                disabled={step === 4 && knowsProgram === null}
              >
                <Text style={styles.buttonText}>
                  {step === 5 ? "Commencer" : "Suivant"}
                </Text>
              </TouchableOpacity>
            </View>
    </View>
  );
};

export default MainOnboarding;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: theme.spacing.large,
    justifyContent: "space-between",
  },

  group1: {
    flex: 1,
    
    paddingHorizontal: 20,
    
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
    marginHorizontal: 20,
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
    alignItems: "center",
    justifyContent: "center",
  },
  stepImage: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: theme.color.primary[500],
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: theme.border.radius.small,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: theme.color.primary[500],
  },
  secondaryButton: {
    backgroundColor: "#F5F5F5",
  },
  disabledButton: {
    backgroundColor: "#B4B4B4",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#666666",
  },

  

  

 
});