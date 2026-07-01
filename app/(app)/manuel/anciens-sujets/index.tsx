import React, { useState, useMemo } from "react";
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
import { useAuth } from "@/contexts/auth";
import type { Json } from "@/types/supabase";

// Interface for competition data
interface Competition {
  city: string;
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  has_archives: boolean;
  cycle_name?: string;
  cycle_level?: number;
  school: {
    name: string;
    sigle: string;
  };
}

interface CompetitionRow {
  id: string;
  name: string | null;
  description: string | null;
  image: Json | { url?: string | null } | null;
  concours_archives?: Array<{ count?: number | null }> | null;
  cities?: { name?: string | null } | null;
  schools?: { name?: string | null; sigle?: string | null } | null;
  study_cycles?: { name?: string | null; level?: number | null } | null;
}

const getImageUrl = (image: CompetitionRow["image"]): string => {
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    return "";
  }

  return "url" in image && typeof image.url === "string" ? image.url : "";
};

const getCycleLabel = (competition: Pick<Competition, "cycle_level" | "cycle_name">): string => {
  if (competition.cycle_level) {
    return `Niveau ${competition.cycle_level}`;
  }

  return competition.cycle_name || "";
};

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
      schools(name, sigle),
      study_cycles(name, level)
    `)
    .order("name");

  if (error) throw error;

  if (!data) return [];

  const competitionRows = data as unknown as CompetitionRow[];

  return competitionRows
    .map((item) => ({
      id: String(item.id),
      name: item.name || "",
      description: item.description || "",
      image_url: getImageUrl(item.image),
      city: item.cities?.name || "",
      has_archives: (item.concours_archives?.[0]?.count || 0) > 0,
      cycle_name: item.study_cycles?.name || "",
      cycle_level:
        typeof item.study_cycles?.level === "number"
          ? item.study_cycles.level
          : undefined,
      school: {
        name: item.schools?.name || "",
        sigle: item.schools?.sigle || ""
      }
    }))
    .filter(item => item.has_archives)
    .sort((a, b) => {
      const schoolCompare = a.school.sigle.localeCompare(b.school.sigle, "fr");
      if (schoolCompare !== 0) return schoolCompare;

      const levelA = a.cycle_level ?? Number.MAX_SAFE_INTEGER;
      const levelB = b.cycle_level ?? Number.MAX_SAFE_INTEGER;
      if (levelA !== levelB) return levelA - levelB;

      return a.name.localeCompare(b.name, "fr");
    });
};

// Fetch paid competition IDs for the current user
const fetchPaidCompetitionIds = async (): Promise<string[]> => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_competition_payments")
    .select("competition_id")
    .eq("user_id", user.id)
    .eq("payment_status", "completed")
    .gt("expiry_date", new Date().toISOString());

  if (error || !data) return [];

  return data.map((row) => String(row.competition_id));
};

const AnciensujetsScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== "light";
  const { trigger } = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Fetch competitions data
  const { data: competitions, error, isLoading, mutate } = useSWR<Competition[]>(
    "competitions-with-archives",
    fetchCompetitions
  );

  // Fetch paid competition IDs
  const { data: paidCompetitionIds, mutate: mutatePaid } = useSWR<string[]>(
    user ? "paid-competition-ids" : null,
    fetchPaidCompetitionIds
  );

  const handleBack = () => {
    trigger(HapticType.LIGHT);
    router.back();
  };

  const handleCompetitionPress = (competitionId: string) => {
    trigger(HapticType.SELECTION);
    router.push(`/manuel/anciens-sujets/${competitionId}`);
  };

  // Filter and sort competitions
  const filteredCompetitions = useMemo(() => {
    const filtered = competitions?.filter((competition) =>
        competition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        competition.school.sigle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        competition.school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCycleLabel(competition).toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!filtered || !paidCompetitionIds || paidCompetitionIds.length === 0) return filtered;

    return [...filtered].sort((a, b) => {
      const aPaid = paidCompetitionIds.includes(a.id) ? 0 : 1;
      const bPaid = paidCompetitionIds.includes(b.id) ? 0 : 1;
      if (aPaid !== bPaid) {
        return aPaid - bPaid;
      }
      
      // Fallback to the original sorting criteria if both have same payment status
      const schoolCompare = a.school.sigle.localeCompare(b.school.sigle, "fr");
      if (schoolCompare !== 0) return schoolCompare;

      const levelA = a.cycle_level ?? Number.MAX_SAFE_INTEGER;
      const levelB = b.cycle_level ?? Number.MAX_SAFE_INTEGER;
      if (levelA !== levelB) return levelA - levelB;

      return a.name.localeCompare(b.name, "fr");
    });
  }, [competitions, searchQuery, paidCompetitionIds]);

  // Render competition item
  const renderCompetitionItem = ({ item }: { item: Competition }) => {
    const isPaid = paidCompetitionIds?.includes(item.id) ?? false;

    return (
      <TouchableOpacity
        style={[
          styles.competitionCard,
          isDarkMode && styles.competitionCardDark,
          isPaid && (isDarkMode ? styles.competitionCardPaidDark : styles.competitionCardPaid),
        ]}
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
          <View style={styles.titleRow}>
            <Text style={[styles.competitionTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
              {item.school.sigle}
            </Text>
            {isPaid && (
              <View style={[styles.paidBadge, isDarkMode && styles.paidBadgeDark]}>
                <MaterialCommunityIcons name="check-circle" size={12} color={isDarkMode ? "#4ADE80" : theme.color.primary[700]} />
                <Text style={[styles.paidBadgeText, isDarkMode && styles.paidBadgeTextDark]}>Acheté</Text>
              </View>
            )}
            {getCycleLabel(item) ? (
              <View style={[styles.levelBadge, isDarkMode && styles.levelBadgeDark]}>
                <Text style={[styles.levelBadgeText, isDarkMode && styles.levelBadgeTextDark]}>
                  {getCycleLabel(item)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[styles.competitionDescription, isDarkMode && styles.textLightDark]}
            numberOfLines={2}
          >
            {item.school.name}
          </Text>
          <Text
            style={[styles.competitionSchool, isDarkMode && styles.textLightDark]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={isPaid ? (isDarkMode ? "#4ADE80" : theme.color.primary[600]) : (isDarkMode ? theme.color.gray[400] : theme.color.gray[600])}
        />
      </TouchableOpacity>
    );
  };

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
            await Promise.all([mutate(), mutatePaid()]);
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
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  competitionCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: "transparent",
  },
  competitionCardPaid: {
    borderColor: "#F59E0B",
    backgroundColor: "#FEF3C7",
  },
  competitionCardPaidDark: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  competitionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flexShrink: 1,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.color.primary[100],
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paidBadgeDark: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  paidBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 10,
    fontWeight: "700",
    color: theme.color.primary[700],
  },
  paidBadgeTextDark: {
    color: "#4ADE80",
  },
  levelBadge: {
    backgroundColor: theme.color.primary[100],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBadgeDark: {
    backgroundColor: "#14532D",
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  levelBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: theme.color.primary[700],
  },
  levelBadgeTextDark: {
    color: "#DCFCE7",
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
