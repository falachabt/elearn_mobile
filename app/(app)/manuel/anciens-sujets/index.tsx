import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  SafeAreaView,
  Image, TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useSWR from "swr";

import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { supabase } from "@/lib/supabase";

// Interface for competition data
interface Competition {
  city: string;
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  has_archives: boolean;
  school: {
    name: string;
    sigle: string;
  };
}

// Fetcher function for SWR
const fetchCompetitions = async (): Promise<Competition[]> => {
  // Get competitions that have archives
  const { data, error } = await supabase
    .from("concours")
    .select(`
      id,
      name,
      description,
      image,
      concours_archives(count), 
      cities(name),
      schools(name, sigle)
    `)
    .order("name");

  if (error) throw error;

  if (!data) return [];

  // Transform data to include has_archives flag
  // @ts-ignore
  return data.map((item) => ({
    id: item.id,
    name: item.name || "",
    description: item.description || "",
    image_url: item.image?.url || "",
  // @ts-ignore
    city: item.cities?.name || "",
    // @ts-ignore - count is available in the response
    has_archives: item.concours_archives[0].count > 0,
    school: {
  // @ts-ignore
      name: item.schools?.name || "",
  // @ts-ignore
      sigle: item.schools?.sigle || ""
    }
  })).filter(item => item.has_archives); // Only include competitions with archives
};

const AnciensujetsScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== "light";
  const { trigger } = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch competitions data
  const { data: competitions, error, isLoading } = useSWR<Competition[]>(
    "competitions-with-archives",
    fetchCompetitions
  );

  const handleBack = () => {
    trigger(HapticType.LIGHT);
    router.back();
  };

  const handleCompetitionPress = (competitionId: number) => {
    trigger(HapticType.SELECTION);
    router.push(`/manuel/anciens-sujets/${competitionId}`);
  };

  // Filter competitions based on search query
  const filteredCompetitions = competitions?.filter((competition) =>
      competition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      competition.school.sigle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render competition item
  const renderCompetitionItem = ({ item }: { item: Competition }) => (
    <TouchableOpacity
      style={[styles.competitionCard, isDarkMode && styles.competitionCardDark]}
      onPress={() => handleCompetitionPress(item.id)}
    >
      <View style={styles.competitionImageContainer}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.competitionImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.competitionImagePlaceholder, isDarkMode && styles.competitionImagePlaceholderDark]}>
            <MaterialCommunityIcons
              name="school"
              size={32}
              color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
            />
          </View>
        )}
      </View>
      <View style={styles.competitionContent}>
        <Text style={[styles.competitionTitle, isDarkMode && styles.textDark]} numberOfLines={2}>
          {item.school.sigle}
        </Text>
        {item.description ? (
          <Text style={[styles.competitionDescription, isDarkMode && styles.textLightDark]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={[styles.competitionSchool, isDarkMode && styles.textLightDark]}>
          {item.name}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
          Anciens sujets
        </Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
            placeholder="Rechercher un concours..."
            placeholderTextColor={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.color.primary[500]}
          style={styles.loader}
        />
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={theme.color.error[500]}
          />
          <Text style={[styles.errorText, isDarkMode && styles.textDark]}>
            Une erreur est survenue lors du chargement des concours.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCompetitions}
          renderItem={renderCompetitionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await fetchCompetitions();
            setRefreshing(false);
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="file-search-outline"
                size={48}
                color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
              />
              <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
                Aucun concours avec des anciens sujets n'a été trouvé.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginBottom: 60
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  searchInput: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.color.gray[200],
    borderRadius: theme.border.radius.small,
    color: "#1A1A1A",
  },
  searchInputDark: {
    backgroundColor: theme.color.dark.background.tertiary,
    color: "#FFFFFF",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  textDark: {
    color: "#FFFFFF",
  },
  textLightDark: {
    color: theme.color.gray[400],
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  competitionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.medium,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  competitionCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  competitionImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 16,
  },
  competitionImage: {
    width: "100%",
    height: "100%",
  },
  competitionImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.color.gray[200],
    justifyContent: "center",
    alignItems: "center",
  },
  competitionImagePlaceholderDark: {
    backgroundColor: theme.color.dark.background.tertiary,
  },
  competitionContent: {
    flex: 1,
  },
  competitionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  competitionDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
  },
  competitionSchool: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.color.gray[600],
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
    color: "#1A1A1A",
  },
  retryButton: {
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.border.radius.small,
  },
  retryButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyContainer: {
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    color: "#1A1A1A",
  },
});

export default AnciensujetsScreen;