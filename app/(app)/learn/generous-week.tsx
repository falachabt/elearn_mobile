import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { useUser } from "@/contexts/useUserInfo";
import { useAppConfig } from "@/contexts/useAppConfig";
import { theme } from "@/constants/theme";
import { Course } from "@/types/course.type";
import { useColorScheme } from "@/hooks/useColorScheme";

interface FilterState {
  school: string;
  difficulty: string;
  duration: string;
}

const GenerousWeekPage = () => {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user, mutateUser } = useUser();
  const { isGenerousWeekActive } = useAppConfig();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Course[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [, setSavingChoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    school: "",
    difficulty: "",
    duration: ""
  });

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const stepProgress = new Animated.Value(currentStep);

  // Check if user has already configured generous week
  const hasGenerousWeekConfig = user?.metadata &&
      typeof user.metadata === 'object' &&
      user.metadata !== null &&
      'generousWeek' in user.metadata;

  // Check if the generous week feature is currently active based on app_config dates
  const isGenerousWeekPeriodActive = isGenerousWeekActive();

  // Redirect to dashboard if generous week is not active
  useEffect(() => {
    if (!isGenerousWeekPeriodActive && !loading) {
      router.replace("/(app)");
    }
  }, [isGenerousWeekPeriodActive, loading, router]);




  // Filter and search logic
  const filteredPrograms = useMemo(() => {
    return programs.filter(program => {
      const matchesSearch = program.concour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          program.concour.school?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSchool = !filters.school || program.concour.school?.name === filters.school;

      return matchesSearch && matchesSchool;
    });
  }, [programs, searchQuery, filters]);

  // Get unique schools for filter
  const uniqueSchools = useMemo(() => {
    return [...new Set(programs.map(p => p.concour.school?.name).filter(Boolean))];
  }, [programs]);

  // Fetch available programs
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!authUser?.id) return;

      try {
        setLoading(true);

        // Try to use the stored procedure first
        try {
          const { data, error } = await supabase.rpc('get_available_programs', {
            p_user_id: authUser.id
          });

          if (!error && data) {
            setPrograms(data as Course[]);
            return;
          }
        } catch (rpcError) {
          // Fallback to standard query
        }

        // Fallback to standard query if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
            .from("concours_learningpaths")
            .select(`
            id, 
            price, 
            learning_path:learningPathId(
              id, 
              title, 
              description, 
              course_count, 
              quiz_count, 
              status, 
              duration, 
              image
            ),
            concour:concourId(
              id, 
              name, 
              school:school_id(id, name), 
              image,
              city_id, 
              cycle_id
            )
          `);

        if (fallbackError) {
          console.error("Error fetching programs:", fallbackError);
          return;
        }

        setPrograms(fallbackData as unknown as Course[]);
      } catch (error) {
        console.error("Error in fetchPrograms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [authUser?.id]);


  useEffect(() => {
    // Reset state when component mounts
    setCurrentStep(1);
    setSelectedProgram(null);
    setSearchQuery("");
    setFilters({ school: "", difficulty: "", duration: "" });
    setShowFilters(false);
  }, []);
  // Save user's generous week choice
  const saveGenerousWeekChoice = async () => {
    if (!selectedProgram || !authUser?.id) return;

    try {
      setSavingChoice(true);
      setCurrentStep(3);

      // Get current metadata or initialize empty object
      const currentMetadata = user?.metadata || {};

      // Update metadata with generous week configuration
      const updatedMetadata = {
        ...currentMetadata,
        generousWeek: {
          programId: selectedProgram,
          selectedAt: new Date().toISOString(),
          duration: 7, // Duration in days
        }
      };

      // Update user's metadata in the database
      const { error } = await supabase
          .from("accounts")
          .update({ metadata: updatedMetadata })
          .eq("id", authUser.id);

      if (error) {
        console.error("Error saving generous week choice:", error);
        return;
      }

      // Update local user data
      await mutateUser();

      // Find the selected program details
      const selectedProgramDetails = programs.find(program => program.id === selectedProgram);

      // Animate success before redirect
      setTimeout(() => {
        if (selectedProgramDetails && selectedProgramDetails.learning_path?.id) {
          // Redirect to the selected program
          router.replace(`/(app)/learn/${selectedProgramDetails.learning_path.id}`);
        } else {
          // Fallback to dashboard if program details not found
          router.replace("/(app)");
        }
      }, 2000);
    } catch (error) {
      console.error("Error in saveGenerousWeekChoice:", error);
    } finally {
      setSavingChoice(false);
    }
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      Animated.timing(stepProgress, {
        toValue: currentStep + 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      Animated.timing(stepProgress, {
        toValue: currentStep - 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({ school: "", difficulty: "", duration: "" });
    setSearchQuery("");
  };

  // Render program item with better design
  const renderProgramItem = ({ item }: { item: Course }) => {
    const isSelected = selectedProgram === item.id;

    return (
        <TouchableOpacity
            style={[
              styles.programCard,
              isDark && styles.programCardDark,
              isSelected && styles.selectedProgramCard,
              isSelected && isDark && styles.selectedProgramCardDark,
            ]}
            onPress={() => setSelectedProgram(item.id)}
            activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.programInfo}>
                <Text style={[styles.programTitle, isDark && styles.programTitleDark]}>
                  {item.concour.name}
                </Text>
                <Text style={[styles.schoolName, isDark && styles.schoolNameDark]}>
                  {item.concour.school?.name || ""}
                </Text>
              </View>

              <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
                {isSelected && (
                    <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color="#fff"
                    />
                )}
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                    name="book-open-variant"
                    size={14}
                    color={theme.color.primary["500"]}
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {item.course_count || 0} cours
                </Text>
              </View>

              <View style={styles.statItem}>
                <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={14}
                    color={theme.color.primary["500"]}
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {item.quiz_count || 0} quiz
                </Text>
              </View>

              <View style={styles.statItem}>
                <MaterialCommunityIcons
                    name="pencil-outline"
                    size={14}
                    color={theme.color.primary["500"]}
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {item.exerciseCount || 0} exercices
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
    );
  };

  // Progress Steps Component
  const ProgressSteps = () => (
      <View style={styles.progressContainer}>
        <View style={styles.stepsContainer}>
          {[1, 2, 3].map((step) => (
              <View key={step} style={styles.stepContainer}>
                <View style={[
                  styles.stepCircle,
                  currentStep >= step && styles.activeStepCircle,
                  currentStep > step && styles.completedStepCircle
                ]}>
                  {currentStep > step ? (
                      <MaterialCommunityIcons name="check" size={12} color="#fff" />
                  ) : (
                      <Text style={[
                        styles.stepNumber,
                        currentStep >= step && styles.activeStepNumber
                      ]}>
                        {step}
                      </Text>
                  )}
                </View>
                {step < 3 && (
                    <View style={[
                      styles.stepLine,
                      currentStep > step && styles.completedStepLine
                    ]} />
                )}
              </View>
          ))}
        </View>

        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, currentStep >= 1 && styles.activeStepLabel]}>
            Info
          </Text>
          <Text style={[styles.stepLabel, currentStep >= 2 && styles.activeStepLabel]}>
            Choix
          </Text>
          <Text style={[styles.stepLabel, currentStep >= 3 && styles.activeStepLabel]}>
            Confirmation
          </Text>
        </View>
      </View>
  );

  // Filter Modal
  const FilterModal = () => (
      <Modal
          visible={showFilters}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                Filtres
              </Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <MaterialCommunityIcons name="close" size={24} color={isDark ? "#fff" : "#000"} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, isDark && styles.filterLabelDark]}>
                École
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                      style={[styles.filterChip, !filters.school && styles.activeFilterChip]}
                      onPress={() => setFilters({...filters, school: ""})}
                  >
                    <Text style={[styles.filterChipText, !filters.school && styles.activeFilterChipText]}>
                      Toutes
                    </Text>
                  </TouchableOpacity>
                  {uniqueSchools.map(school => (
                      <TouchableOpacity
                          key={school}
                          style={[styles.filterChip, filters.school === school && styles.activeFilterChip]}
                          onPress={() => setFilters({...filters, school: school === filters.school ? "" : school})}
                      >
                        <Text style={[styles.filterChipText, filters.school === school && styles.activeFilterChipText]}>
                          {school}
                        </Text>
                      </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  );


  if (hasGenerousWeekConfig) {
    // Extract the programId from user metadata
    const metadata = user?.metadata as { generousWeek?: { programId: number } };
    const programId = metadata?.generousWeek?.programId;

    // Find the program details if programs are loaded
    const programDetails = programs.find(program => program.id === programId);

    // Determine the redirect path
    const redirectPath = programDetails && programDetails.learning_path?.id 
      ? `/(app)/learn/${programDetails.learning_path.id}`
      : "/(app)";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? theme.color.dark.background.secondary : "#fff" }}>
          <View style={{ marginTop : "50%", display : "flex", alignItems : "center", justifyContent : "center" }}>
            <MaterialCommunityIcons
                name="check-circle"
                size={80}
                color={theme.color.primary["500"]}
                style={{marginBottom: 16}}
            />
            <Text
                style={[styles.loadingText, isDark && styles.loadingTextDark, {textAlign: 'center', marginBottom: 24}]}>
              Vous avez déjà configuré votre semaine généreuse. Redirection vers votre programme...
            </Text>

            <TouchableOpacity
                style={styles.continueButton}
                onPress={() => router.replace(redirectPath as `/(app)/learn/${string}` | "/(app)")}
            >
              <Text style={styles.continueButtonText}>Aller à mon programme</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff"/>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
    );
  }



  if (loading) {
    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.color.primary["500"]} />
            <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
              Chargement des programmes...
            </Text>
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <ProgressSteps />

        {currentStep === 1 && (
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 65}}>
              <View style={styles.welcomeSection}>
                <MaterialCommunityIcons
                    name="gift-outline"
                    size={64}
                    color={theme.color.primary["500"]}
                    style={styles.welcomeIcon}
                />
                <Text style={[styles.welcomeTitle, isDark && styles.welcomeTitleDark]}>
                  Bienvenue dans la Semaine Généreuse !
                </Text>
                <Text style={[styles.welcomeDescription, isDark && styles.welcomeDescriptionDark]}>
                  Pendant 7 jours, accédez gratuitement à tous les contenus du programme de votre choix.
                </Text>
              </View>

              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="book-open-variant" size={24} color={theme.color.primary["500"]} />
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, isDark && styles.featureTitleDark]}>
                      Cours complets
                    </Text>
                    <Text style={[styles.featureDescription, isDark && styles.featureDescriptionDark]}>
                      Accès illimité à tous les cours du programme choisi
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="help-circle-outline" size={24} color={theme.color.primary["500"]} />
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, isDark && styles.featureTitleDark]}>
                      Quiz interactifs
                    </Text>
                    <Text style={[styles.featureDescription, isDark && styles.featureDescriptionDark]}>
                      Testez vos connaissances avec nos quiz
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="pencil-outline" size={24} color={theme.color.primary["500"]} />
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, isDark && styles.featureTitleDark]}>
                      Exercices pratiques
                    </Text>
                    <Text style={[styles.featureDescription, isDark && styles.featureDescriptionDark]}>
                      Pratiquez avec des exercices adaptés
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.noteContainer}>
                <MaterialCommunityIcons name="information-outline" size={20} color={theme.color.warning["500"]} />
                <Text style={[styles.noteText, isDark && styles.noteTextDark]}>
                  Les anciens sujets restent exclusifs aux abonnés premium
                </Text>
              </View>

              <TouchableOpacity style={styles.continueButton} onPress={goToNextStep}>
                <Text style={styles.continueButtonText}>Choisir mon programme</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
        )}

        {currentStep === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.searchContainer}>
                <View style={[styles.searchInputContainer, isDark && styles.searchInputContainerDark]}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#999" />
                  <TextInput
                      style={[styles.searchInput, isDark && styles.searchInputDark]}
                      placeholder="Rechercher un programme ou une école..."
                      placeholderTextColor="#999"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                  />
                </View>

                <TouchableOpacity
                    style={[styles.filterButton, isDark && styles.filterButtonDark]}
                    onPress={() => setShowFilters(true)}
                >
                  <MaterialCommunityIcons name="filter-variant" size={20} color={theme.color.primary["500"]} />
                </TouchableOpacity>
              </View>

              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, isDark && styles.resultsCountDark]}>
                  {filteredPrograms.length} programme{filteredPrograms.length > 1 ? 's' : ''} trouvé{filteredPrograms.length > 1 ? 's' : ''}
                </Text>
                {(searchQuery || filters.school) && (
                    <TouchableOpacity onPress={clearFilters}>
                      <Text style={styles.clearFiltersText}>Effacer les filtres</Text>
                    </TouchableOpacity>
                )}
              </View>

              <FlatList
                  data={filteredPrograms}
                  renderItem={renderProgramItem}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.programsList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons name="magnify" size={48} color="#ccc" />
                      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                        Aucun programme trouvé
                      </Text>
                      <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
                        Essayez d'ajuster vos filtres de recherche
                      </Text>
                    </View>
                  }
              />

              <View style={styles.navigationButtons}>
                <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color={theme.color.primary["500"]} />
                  <Text style={[styles.backButtonText, isDark && styles.backButtonTextDark]}>
                    Retour
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.confirmButton, !selectedProgram && styles.disabledButton]}
                    onPress={saveGenerousWeekChoice}
                    disabled={!selectedProgram}
                >
                  <Text style={styles.confirmButtonText}>Confirmer mon choix</Text>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
        )}

        {currentStep === 3 && (
            <View style={styles.successContainer}>
              <MaterialCommunityIcons
                  name="check-circle"
                  size={80}
                  color={theme.color.success["500"]}
              />
              <Text style={[styles.successTitle, isDark && styles.successTitleDark]}>
                Félicitations !
              </Text>
              <Text style={[styles.successDescription, isDark && styles.successDescriptionDark]}>
                Votre semaine généreuse a été activée. Vous allez être redirigé vers votre programme.
              </Text>
              <ActivityIndicator
                  size="small"
                  color={theme.color.primary["500"]}
                  style={styles.successLoader}
              />
            </View>
        )}

        <FilterModal />
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginBottom : 60, // Space for tab bar
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },

  // Progress Steps
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  progressContainerDark: {
    backgroundColor : theme.color.dark.background.primary,
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepCircle: {
    backgroundColor: theme.color.primary["500"],
  },
  completedStepCircle: {
    backgroundColor: theme.color.success,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  activeStepNumber: {
    color: "#fff",
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#e5e5e5",
    marginHorizontal: 8,
  },
  completedStepLine: {
    backgroundColor: theme.color.success["500"],
  },
  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stepLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  activeStepLabel: {
    color: theme.color.primary["500"],
  },

  // Step Content
  stepContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 85, // Space for tab bar
  },

  // Welcome Section (Step 1)
  welcomeSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  welcomeIcon: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.color.text,
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeTitleDark: {
    color: theme.color.dark.text.primary,
  },
  welcomeDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  welcomeDescriptionDark: {
    color: theme.color.dark.text.secondary,
  },

  // Features
  featuresContainer: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  featureText: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.color.text,
    marginBottom: 4,
  },
  featureTitleDark: {
    color: theme.color.dark.text.primary,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  featureDescriptionDark: {
    color: theme.color.dark.text.secondary,
  },

  // Note
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 32,
  },
  noteText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#856404",
    lineHeight: 18,
  },
  noteTextDark: {
    color: "#856404",
  },

  // Continue Button
  continueButton: {
    backgroundColor: theme.color.primary["500"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: "auto",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },

  // Search Section (Step 2)
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    marginRight: 12,
  },
  searchInputContainerDark: {
    backgroundColor: "#2a2a2a",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.color.text,
  },
  searchInputDark: {
    color: theme.color.dark.text.primary,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonDark: {
    backgroundColor: "#2a2a2a",
  },

  // Results
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  resultsCountDark: {
    color: theme.color.dark.text.secondary,
  },
  clearFiltersText: {
    fontSize: 14,
    color: theme.color.primary["500"],
    fontWeight: "500",
  },

  // Program Cards
  programsList: {
    paddingBottom: 65,
  },
  programCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  programCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: "#2a2a2a",
  },
  selectedProgramCard: {
    borderColor: theme.color.primary["500"],
    backgroundColor: "#fafaff",
  },
  selectedProgramCardDark: {
    backgroundColor: "#1a1a2e",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  programInfo: {
    flex: 1,
    marginRight: 12,
  },
  programTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.color.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  programTitleDark: {
    color: theme.color.dark.text.primary,
  },
  schoolName: {
    fontSize: 14,
    color: "#666",
  },
  schoolNameDark: {
    color: theme.color.dark.text.secondary,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIndicator: {
    backgroundColor: theme.color.primary["500"],
    borderColor: theme.color.primary["500"],
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  statTextDark: {
    color: theme.color.dark.text.secondary,
  },

  // Navigation Buttons
  navigationButtons: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 16,
    color: theme.color.primary["500"],
    fontWeight: "500",
  },
  backButtonTextDark: {
    color: theme.color.primary["400"],
  },
  confirmButton: {
    backgroundColor: theme.color.primary["500"],
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },

  // Success Page (Step 3)
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.color.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  successTitleDark: {
    color: theme.color.dark.text.primary,
  },
  successDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  successDescriptionDark: {
    color: theme.color.dark.text.secondary,
  },
  successLoader: {
    marginTop: 16,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalContentDark: {
    backgroundColor: "#1e1e1e",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.color.text,
  },
  modalTitleDark: {
    color: theme.color.dark.text.primary,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.color.text,
    marginBottom: 12,
  },
  filterLabelDark: {
    color: theme.color.dark.text.primary,
  },
  filterOptions: {
    flexDirection: "row",
  },
  filterChip: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: theme.color.primary["500"],
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeFilterChipText: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  applyButton: {
    flex: 1,
    backgroundColor: theme.color.primary["500"],
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTextDark: {
    color: "#666",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  emptySubtextDark: {
    color: "#555",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  loadingTextDark: {
    color: theme.color.dark.text.secondary,
  },
});

export default GenerousWeekPage;
