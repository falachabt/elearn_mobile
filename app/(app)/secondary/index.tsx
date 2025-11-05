import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import useSWR from "swr";

import NoProgram from "@/components/shared/catalogue/NoProgramCard";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { getSecondaryPrograms } from "@/services/secondary/program.service";
import { SecondaryProgram } from "@/types/secondary.type";
import SecondaryProgramCard from "@/components/shared/secondary/SecondaryProgramCard";

interface School {
  id: string;
  name: string;
  imageUrl?: string;
  sigle: string;
  localisation: string;
}

interface StudyCycle {
  level: string;
}

interface Concours {
  id: string;
  name: string;
  description: string;
  schoolId: string;
  school: School;
  study_cycles: StudyCycle;
  dates: { start: string; end: string };
  nextDate: Date;
}

interface ConcoursLearningPath {
  id: number;
  concourId: string;
  learningPathId: string;
  price: number;
  isActive: boolean;
  concour: Concours;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  image: { url: string };
  duration: [];
  content: {
    nodes: {
      id: string;
      type: "course" | "quiz";
      data: {
        courseId?: number;
        quizId?: string;
      };
    }[];
  };
  concours_learningpaths?: ConcoursLearningPath[];
  course_count: number;
  quiz_count: number;
  total_duration: number;
  progress?: number;
  isEnrolled: boolean;
  enrollmentId?: number;
  isGenerousWeek?: boolean;
}

const SecondaryPrograms = () => {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: secondaryPrograms,
    isLoading: secondaryProgramsLoading,
    error: secondaryProgramsError,
    mutate: mutateSecondaryPrograms,
  } = useSWR<SecondaryProgram[] | null>(
    "secondary-program",
    async () => await getSecondaryPrograms()
  );

  // Redirect to login if not authenticated
  if (!session) {
    router.replace("/(auth)/login");
    return null;
  }

  // Loading state
  if (secondaryProgramsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <Text style={[styles.loadingText, isDarkMode && { color: "#FFFFFF" }]}>
          Chargement des programmes...
        </Text>
      </View>
    );
  }

  // Error state
  if (secondaryProgramsError) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={isDarkMode ? "#CCCCCC" : "#6B7280"}
        />
        <Text style={[styles.errorText, isDarkMode && { color: "#CCCCCC" }]}>
          Une erreur est survenue lors du chargement
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => mutateSecondaryPrograms()}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Espace Collège
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Vos parcours d'apprentissage
        </Text>
      </View>

      <View
        style={[
          styles.searchContainer,
          isDarkMode && styles.searchContainerDark,
        ]}
      >
        <View
          style={[
            styles.searchInputWrapper,
            isDarkMode && styles.searchInputWrapperDark,
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isDarkMode ? "#CCCCCC" : "#6B7280"}
          />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
            placeholder="Rechercher une classe : Tle C .."
            placeholderTextColor={isDarkMode ? "#CCCCCC" : "#6B7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={isDarkMode ? "#CCCCCC" : "#6B7280"}
              />
            </Pressable>
          )}
        </View>
      </View>

      {secondaryPrograms?.length ? (
        secondaryPrograms?.length === 0 && searchQuery.length > 0 ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="magnify"
              size={48}
              color={isDarkMode ? "#CCCCCC" : "#6B7280"}
            />
            <Text
              style={[
                styles.loadingText,
                { textAlign: "center", marginTop: 16 },
                isDarkMode && { color: "#CCCCCC" },
              ]}
            >
              Aucun parcours trouvé pour "{searchQuery}"
            </Text>
            <Pressable
              style={[styles.retryButton, { marginTop: 16 }]}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.retryText}>Effacer la recherche</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={secondaryPrograms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SecondaryProgramCard program={item} />
            )}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={secondaryProgramsLoading}
                onRefresh={() => {
                  mutateSecondaryPrograms();
                }}
                colors={[theme.color.primary[500]]}
                tintColor={theme.color.primary[500]}
              />
            }
            removeClippedSubviews={true}
            maxToRenderPerBatch={8}
            windowSize={10}
            initialNumToRender={5}
            updateCellsBatchingPeriod={30}
            getItemLayout={(data, index) => ({
              length: 170,
              offset: 170 * index,
              index,
            })}
          />
        )
      ) : (
        <NoProgram />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingBottom: 60,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInputWrapperDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 4,
  },
  searchInputDark: {
    color: "#FFFFFF",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  titleDark: {
    color: "#FFFFFF",
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  subtitleDark: {
    color: "#CCCCCC",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SecondaryPrograms;
