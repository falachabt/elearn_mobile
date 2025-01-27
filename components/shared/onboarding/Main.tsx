import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  useColorScheme,
} from "react-native";
import { theme } from "@/constants/theme";
import * as Animatable from "react-native-animatable";
import StepProgress from "./StepProgress";
import PathChoice from "./PathChoice";
import ProfileForm, { Profile } from "./ProfileForm";
import Programs from "./Programs";
import UserInfoForm from "./UserForm";
import { UserInfoFormProps } from "./UserForm";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { AccountsInput } from "@/types/type";
import { ThemedText } from "@/components/ThemedText";
import PaymentPage, { PaymentPageRef } from "./Bill";
import { NotchPayService } from "@/lib/notchpay";
import { useCart } from "@/hooks/useCart";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const MainOnboarding = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const [knowsProgram, setKnowsProgram] = useState(false);
  const userInfoFormRef = useRef<{ validate: () => boolean } | null>(null);
  const [userInfo, setUserInfo] = useState<AccountsInput | null>(null);
  const [profile, setProfile] = useState<Profile>({
    gradelevel: '',
    gpa: 0,
    favoritesubjects: [],
    skills: [],
    maingoal: '',
    othergoals: '',
    learningstyle: '',
    motivation: ''
  });
  const [programs, setPrograms] = useState<number[]>([]);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isWatingForPayment, setIsWatingForPayment] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const [mergedAccountData, setMergedAccountData] = useState<any>(null);
const [isDataValid, setIsDataValid] = useState(false);


  const paymentPageRef = useRef<PaymentPageRef>(null);
  const { loading, cartItems, currentCart } = useCart();

  useEffect(() => {
    if (currentCart) {
      setPrograms(currentCart?.items?.map(item => Number(item?.program_id)));
    }
  }, [cartItems, currentCart]);

  useEffect(() => {
    if (!userInfo || !profile) return;


    try {
      // Create sanitized merged data matching accounts schema
      const sanitizedData = {
        // Basic info from userInfo
        firstname: userInfo.firstname || null,
        lastname: userInfo.lastname || null,
        phone: userInfo.phone || null,
        city: userInfo.city || null,
        birthdate:  null,
        
        // Academic info from profile
        gradelevel: profile.gradelevel || null,
        gpa: profile.gpa ? Number(profile.gpa) : null,
        favoritesubjects: Array.isArray(profile?.favoritesubjects) ? profile.favoritesubjects : [],
        skills: Array.isArray(profile?.skills) ? profile.skills : [],
        maingoal: profile.maingoal || null,
        othergoals: profile.othergoals || null,
        learningstyle: profile.learningstyle || null,
        motivation: profile.motivation || null,
  
        // Status fields
        status: true,
        onboarding_done: false,
  
        // Additional metadata
        // updated_at: new Date().toISOString(),
      };
  
      // Validate required fields
      const isValid = Boolean(
        sanitizedData.firstname &&
        sanitizedData.lastname &&
        sanitizedData.phone 
      );
  

      setIsDataValid(isValid);
      setMergedAccountData(sanitizedData);
  
    } catch (error) {
      console.error('Error merging account data:', error);
      setIsDataValid(false);
      setMergedAccountData(null);
    }
  }, [userInfo, profile]);


  useEffect(() => {
    const fetchAndSetDefaults = async () => {
      if (!user?.id) return;
  
      try {
        
        if(!user) return;
  
        const accountData = user

  
        if (accountData) {
          // Set userInfo defaults
          setUserInfo({
            firstname: accountData.firstname || '',
            lastname: accountData.lastname || '',
            phone: accountData.phone ? Number(accountData?.phone) : null,
            city: accountData.city || '',
            birthdate:  null,
            email: user.email || '',  // from auth user
            authId: user.id,  // from auth user
          });
  
          // Set profile defaults
          setProfile({
            gradelevel: accountData.gradelevel || '',
            gpa: accountData.gpa || 0,
            favoritesubjects: accountData.favoritesubjects || [],
            skills: accountData.skills || [],
            maingoal: accountData.maingoal || '',
            othergoals: accountData.othergoals || '',
            learningstyle: accountData.learningstyle || '',
            motivation: accountData.motivation || '',
          });
  
          // If the user has already started onboarding before, set appropriate step
          if (accountData.firstname && accountData.lastname) {
            setStep(prevStep => Math.max(prevStep, 3));
          }
          if (accountData.gradelevel) {
            setStep(prevStep => Math.max(prevStep, 5));
          }
          if (accountData.onboarding_done) {
            // Handle case where onboarding was already completed
            // You might want to redirect or show a different UI
            console.log('Onboarding was previously completed');
          }
        } else {
          // Set minimal defaults for new user
          setUserInfo({
            firstname: '',
            lastname: '',
            phone: null,
            city: '',
            birthdate: null,
            email:  '',
            authId: '',
          });
  
          setProfile({
            gradelevel: '',
            gpa: 0,
            favoritesubjects: [],
            skills: [],
            maingoal: '',
            othergoals: '',
            learningstyle: '',
            motivation: '',
          });
        }
      } catch (error) {
        console.error('Error fetching user defaults:', error);
        // Set minimal defaults in case of error
        setUserInfo({
          firstname: '',
          lastname: '',
          phone: null,
          city: '',
          birthdate: null,
          email: user?.email || '',
          authId: user?.id || '',
        });
  
        setProfile({
          gradelevel: '',
          gpa: 0,
          favoritesubjects: [],
          skills: [],
          maingoal: '',
          othergoals: '',
          learningstyle: '',
          motivation: '',
        });
      }
    };
  
    fetchAndSetDefaults();
  }, [user]);

  const updateAccountInDatabase = async () => {
   
 
    
    if (!isDataValid || !mergedAccountData || !user?.id) return false;
  
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(mergedAccountData)
        .eq('id', user.id)
        .select();
  
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating account:', error);
      return false;
    }
  };

  const stepsContent = [
    {
      title: "Bienvenue sur Elearn Prepa",
      description:
        "Construisez votre chemin vers la grande école de vos rêves avec nous.",
      icon: "👋",
    },
    {
      title: "Une Préparation d'Excellence",
      description:
        "Cours sur mesure, mentors experts et méthodes éprouvées pour votre réussite.",
      icon: "🎯",
    },
    {
      title: "Créez Votre Profil",
      description:
        "Quelques informations pour personnaliser votre expérience d'apprentissage.",
      icon: "📝",
      isRequired: true,
    },
    {
      title: "Objectif Grande École",
      description:
        "Précisez les concours qui vous intéressent pour un accompagnement ciblé.",
      icon: "🎓",
      hasChoices: true,
    },
    {
      title: "Personnalisation",
      description:
        "Partagez votre niveau et vos objectifs pour un programme adapté.",
      icon: "⭐",
    },
    {
      title: "Votre Programme",
      description: "Découvrez votre parcours personnalisé vers la réussite.",
      icon: "📚",
      showPrograms: true,
    },
    {
      title: "Paiement",
      description: "Finalisez votre inscription en effectuant le paiement",
      icon: "💳",
    },
  ];

  const handleSkipOnboarding = async () => {
    if (user) {
      setIsOnboardingLoading(true);
      await supabase.from("accounts").update({
        onboarding_done: true,
      }).eq("id", user.id);
      setIsOnboardingLoading(false);
    }
  }

  const handleNextStep = async () => {
    if (step === 3 && userInfoFormRef.current) {
      const isValid = userInfoFormRef.current.validate();
      if (!isValid) {
        return;
      }else{
        await updateAccountInDatabase();
      }
    }

    if (step === 5) {
      await updateAccountInDatabase();
    }

    if (step === 7) {
      if (programs.length === 0) {
        setIsModalVisible(true);
        return;
      }
      if (paymentPageRef.current) {
        const isValid = await paymentPageRef.current.validateAndPay();
        if (!isValid) {
          return;
        }
      }
      return;
    }

    if (step < 7) {
      if (step === 4 && knowsProgram) {
        setStep(step + 2);
      } else {
        setStep(step + 1);
      }
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
        // return <UserInfoForm 
        //   ref={userInfoFormRef} 
        //   title={stepsContent[step - 1].title} 
        //   description={stepsContent[step - 1].description} 
        //   userInfo={userInfo} 
        //   setUserInfo={setUserInfo} 
        // />;
        return null
      case 4:
        return (
          <PathChoice
            knowsProgram={knowsProgram}
            setKnowsProgram={setKnowsProgram}
          />
        );
      case 5:
        return <ProfileForm profile={profile} setProfile={setProfile} />;
      case 6:
        return (
          <Programs
            knowsProgram={knowsProgram}
            selectedPrograms={programs}
            setSelectedPrograms={setPrograms}
          />
        );
      case 7:
        return (
          <PaymentPage
            ref={paymentPageRef}
            selectedProgramIds={programs}
            onLoadingChange={setIsPaymentLoading}
            onPaymentStatusChange={setIsWatingForPayment}
          />
        );
      default:
        return (
          <Animatable.View
            animation="fadeIn"
            duration={800}
            style={[styles.defaultContent, isDark && styles.defaultContentDark]}
          >
            <Animatable.Image
              source={getImageSource(step)}
              style={styles.stepImage}
            />
            <Text style={[styles.title, isDark && styles.titleDark]}>
              {stepsContent[step - 1].title}
            </Text>
            <Text style={[styles.description, isDark && styles.descriptionDark]}>
              {stepsContent[step - 1].description}
            </Text>
          </Animatable.View>
        );
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.group1}>
        <StepProgress step={step} totalSteps={stepsContent.length} />
        {renderStepContent()}
      </View>

      <View style={[styles.footer, isDark && styles.footerDark]}>
        {step > 1 && (
          <TouchableOpacity
            style={[
              styles.button, 
              styles.secondaryButton,
              isDark && styles.secondaryButtonDark
            ]}
            disabled={isPaymentLoading}
            onPress={() => {
              if (step == 6 && knowsProgram) {
                setStep(step - 2);
              } else {
                setStep(step - 1);
              }
            }}
          >
            <Text style={[
              styles.buttonText, 
              styles.secondaryButtonText,
              isDark && styles.secondaryButtonTextDark
            ]}>
              Précédent
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            ((step === 4 && knowsProgram === null) || loading || isPaymentLoading) && styles.disabledButton,
          ]}
          onPress={handleNextStep}
          disabled={(step === 4 && knowsProgram === null) || loading || isPaymentLoading}
        >
          <Text style={styles.buttonText}>
            {step === 7 ? isWatingForPayment ? "Payer" : isPaymentLoading ? <ActivityIndicator /> : "Payer" : "Suivant"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(!isModalVisible)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View 
            animation="slideInUp" 
            duration={500} 
            style={[styles.modalContent, isDark && styles.modalContentDark]}
          >
            <Ionicons 
              name="alert-circle" 
              size={48} 
              color={theme.color.primary[500]} 
              style={styles.modalIcon} 
            />
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Aucun programme sélectionné
            </Text>
            <Text style={[styles.modalMessage, isDark && styles.modalMessageDark]}>
              Veuillez sélectionner au moins un programme avant de procéder au paiement.
            </Text>
            <View style={[styles.promotionContainer, isDark && styles.promotionContainerDark]}>
              <Text style={styles.discountMessage}>
                10% de réduction si vous achetez maintenant !
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.secondaryButton, 
                  styles.modalButton,
                  isDark && styles.secondaryButtonDark
                ]}
                onPress={() => handleSkipOnboarding()}
              >
                {isOnboardingLoading ? (
                  <ActivityIndicator color={theme.color.primary[500]} />
                ) : (
                  <Text style={[
                    styles.buttonText, 
                    styles.secondaryButtonText,
                    isDark && styles.secondaryButtonTextDark
                  ]}>
                    Fermer
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, styles.modalButton]}
                disabled={isOnboardingLoading}
                onPress={() => {
                  setIsModalVisible(false);
                  setStep(6);
                }}
              >
                <Text style={styles.buttonText}>Sélectionner</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
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
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  group1: {
    flex: 1,
    paddingHorizontal: 20,
  },
  defaultContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  defaultContentDark: {
    backgroundColor: theme.color.dark.background.primary,
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
  titleDark: {
    color: theme.color.primary[400],
  },
  description: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  descriptionDark: {
    color: theme.color.gray[300],
  },
  footer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  footerDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderTopColor: theme.color.gray[700],
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
  secondaryButtonDark: {
    backgroundColor: theme.color.gray[800],
  },
  disabledButton: {
    backgroundColor: theme.color.gray[400],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#666666",
  },
  secondaryButtonTextDark: {
    color: theme.color.gray[300],
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
    paddingHorizontal: 30,
  },
  modalContentDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  modalIcon: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#000000",
  },
  modalTitleDark: {
    color: "#FFFFFF",
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#666666",
  },
  modalMessageDark: {
    color: theme.color.gray[300],
  },
  discountMessage: {
    fontSize: 16,
    color: theme.color.primary[500],
    marginBottom: 20,
    textAlign: "center",
  },
  promotionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: theme.color.gray[100],
    padding: 10,
    borderRadius: 8,
  },
  promotionContainerDark: {
    backgroundColor: theme.color.gray[800],
  },
  promotionIcon: {
    marginRight: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});