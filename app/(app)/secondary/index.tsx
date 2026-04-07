import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import useSWR from "swr";

import NoProgram from "@/components/shared/catalogue/NoProgramCard";
import SecondaryProgramCard from "@/components/shared/secondary/SecondaryProgramCard";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { useSecondaryDailyContentForPrograms } from "@/hooks/secondary/useSecondaryDailyContent";
import { supabase } from "@/lib/supabase";
import { getSecondaryPrograms } from "@/services/secondary/program.service";
import { SecondaryProgram } from "@/types/secondary.type";
import {
  getSecondaryProgramLabel,
  isSameTrack,
  mergeSecondaryPreferences,
  matchesPreferredSecondaryProgram,
  parseSecondaryPreferences,
  TERMINALE_TRACK_OPTIONS,
} from "@/utils/secondaryPreferences";
import { syncSecondaryDailyReminder } from "@/utils/secondaryDailyReminder";

const SecondaryPrograms = () => {
  const { session, user, mutateUser } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [additionalSearchQuery, setAdditionalSearchQuery] = useState("");
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [isClassPickerVisible, setIsClassPickerVisible] = useState(false);

  const secondaryPreferences = useMemo(
    () => {
      const parsedPreferences = parseSecondaryPreferences(user?.metadata);

      if (
        !parsedPreferences.preferredTrack &&
        typeof user?.gradelevel === "string" &&
        /^terminale/i.test(user.gradelevel.trim())
      ) {
        return {
          ...parsedPreferences,
          preferredTrack: user.gradelevel.trim(),
          preferredClassName: user.gradelevel.trim().split(/\s+/)[0] || null,
          preferredSeriesName: user.gradelevel.trim().split(/\s+/)[1] || null,
        };
      }

      return parsedPreferences;
    },
    [user?.gradelevel, user?.metadata]
  );

  const {
    data: secondaryPrograms,
    isLoading: secondaryProgramsLoading,
    error: secondaryProgramsError,
    mutate: mutateSecondaryPrograms,
  } = useSWR<SecondaryProgram[] | null>(
    "secondary-program",
    async () => await getSecondaryPrograms()
  );

  const preferredPrograms = useMemo(
    () =>
      (secondaryPrograms ?? []).filter((program) =>
        matchesPreferredSecondaryProgram(program, secondaryPreferences)
      ),
    [secondaryPreferences, secondaryPrograms]
  );

  const selectedExtraPrograms = useMemo(
    () =>
      (secondaryPrograms ?? []).filter((program) =>
        secondaryPreferences.selectedTracks.some((track) =>
          isSameTrack(track, getSecondaryProgramLabel(program))
        )
      ),
    [secondaryPreferences.selectedTracks, secondaryPrograms]
  );

  const visiblePrograms = useMemo(
    () => [
      ...preferredPrograms,
      ...selectedExtraPrograms.filter(
        (program) =>
          !preferredPrograms.some((preferredProgram) => preferredProgram.id === program.id)
      ),
    ],
    [preferredPrograms, selectedExtraPrograms]
  );

  const manageablePrograms = useMemo(
    () =>
      (secondaryPrograms ?? []).filter(
        (program) => !preferredPrograms.some((preferredProgram) => preferredProgram.id === program.id)
      ),
    [secondaryPrograms, preferredPrograms]
  );

  const filteredManageablePrograms = useMemo(() => {
    const normalizedSearch = additionalSearchQuery.trim().toLowerCase();
    if (!normalizedSearch) return manageablePrograms;

    return manageablePrograms.filter((program) =>
      [
        getSecondaryProgramLabel(program),
        program.class?.name ?? "",
        program.serie?.name ?? "",
        program.description ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [additionalSearchQuery, manageablePrograms]);

  const visibleProgramIds = useMemo(
    () => visiblePrograms.map((program) => program.id),
    [visiblePrograms]
  );

  const { dailyContents } = useSecondaryDailyContentForPrograms(
    visibleProgramIds,
    user?.id
  );

  useEffect(() => {
    void syncSecondaryDailyReminder({
      dailyContents,
      reminderEnabled: secondaryPreferences.reminderEnabled,
      reminderTime: secondaryPreferences.reminderTime,
    });
  }, [
    dailyContents,
    secondaryPreferences.reminderEnabled,
    secondaryPreferences.reminderTime,
  ]);

  const persistPreferences = async (updates: {
    preferredTrack?: string;
    selectedTracks?: string[];
    schoollevel?: string;
    gradelevel?: string;
  }) => {
    if (!user?.id) return;

    const nextMetadata = mergeSecondaryPreferences(user.metadata, {
      preferredTrack:
        updates.preferredTrack ?? secondaryPreferences.preferredTrack,
      selectedTracks:
        updates.selectedTracks ?? secondaryPreferences.selectedTracks,
    });

    const payload: {
      metadata: ReturnType<typeof mergeSecondaryPreferences>;
      schoollevel?: string;
      gradelevel?: string;
    } = {
      metadata: nextMetadata,
    };

    if (updates.schoollevel !== undefined) payload.schoollevel = updates.schoollevel;
    if (updates.gradelevel !== undefined) payload.gradelevel = updates.gradelevel;

    const { error } = await supabase
      .from("accounts")
      .update(payload)
      .eq("id", user.id);

    if (error) throw error;
    await mutateUser();
  };

  const handleTrackSelection = async (trackValue: string) => {
    try {
      setIsSavingPreference(true);
      await persistPreferences({
        preferredTrack: trackValue,
        selectedTracks: secondaryPreferences.selectedTracks.filter(
          (track) => !isSameTrack(track, trackValue)
        ),
        schoollevel: "secondary",
        gradelevel: trackValue,
      });
    } finally {
      setIsSavingPreference(false);
    }
  };

  const handleToggleTrack = async (trackValue: string) => {
    try {
      setIsSavingPreference(true);
      const isSelected = secondaryPreferences.selectedTracks.some(
        (track) => isSameTrack(track, trackValue)
      );

      let nextTracks = [];
      if (isSelected) {
        nextTracks = secondaryPreferences.selectedTracks.filter(
          (track) => !isSameTrack(track, trackValue)
        );
      } else {
        nextTracks = [...secondaryPreferences.selectedTracks, trackValue];
      }

      await persistPreferences({
        selectedTracks: nextTracks,
      });
    } finally {
      setIsSavingPreference(false);
    }
  };

  if (!session) {
    router.replace("/(auth)/login");
    return null;
  }

  if (secondaryProgramsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <Text style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
          Chargement des programmes...
        </Text>
      </View>
    );
  }

  if (secondaryProgramsError) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={isDarkMode ? "#CCCCCC" : "#6B7280"}
        />
        <Text style={[styles.errorText, isDarkMode && styles.loadingTextDark]}>
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
            {secondaryPreferences.preferredTrack
              ? `Vos programmes de terminale`
              : "Choisissez votre Terminale pour afficher le contenu"}
          </Text>
        </View>

        {!secondaryPreferences.preferredTrack ? (
          <View
            style={[
              styles.selectorContainer,
              isDarkMode && styles.selectorContainerDark,
            ]}
          >
            <Text
              style={[styles.selectorTitle, isDarkMode && styles.selectorTitleDark]}
            >
              Sélectionnez votre Terminale
            </Text>
            <Text style={[styles.selectorText, isDarkMode && styles.selectorTextDark]}>
              Pour accéder aux programmes, sujets et exercices adaptés à votre classe, sélectionnez votre Terminale parmi les options ci-dessous. Vous pourrez également ajouter d'autres classes ou séries si vous le souhaitez.
            </Text>

            <View style={styles.trackOptions}>
              {TERMINALE_TRACK_OPTIONS.filter((option) => option.value).map(
                (option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => void handleTrackSelection(option.value as string)}
                    disabled={isSavingPreference}
                    style={[
                      styles.trackChip,
                      isDarkMode && styles.trackChipDark,
                      isSavingPreference && styles.trackChipDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackChipText,
                        isDarkMode && styles.trackChipTextDark,
                      ]}
                    >
                      {option.value}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            {isSavingPreference ? (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={theme.color.primary[500]} />
                <Text style={[styles.savingText, isDarkMode && styles.selectorTextDark]}>
                  Enregistrement de votre Terminale...
                </Text>
              </View>
            ) : null}
          </View>
        ) : secondaryPrograms?.length ? (
          <FlatList
            data={visiblePrograms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SecondaryProgramCard
                program={item}
              />
            )}
            contentContainerStyle={styles.listContainer}
          
            ListFooterComponent={
              <View style={styles.footerPrograms}>
                <Pressable
                  style={[styles.addCard, isDarkMode && styles.addCardDark]}
                  onPress={() => setIsClassPickerVisible(true)}
                  disabled={manageablePrograms.length === 0}
                >
                  <View style={styles.addCardIcon}>
                    <MaterialCommunityIcons
                      name="plus"
                      size={24}
                      color={theme.color.primary[500]}
                    />
                  </View>
                  <View style={styles.addCardCopy}>
                    <Text
                      style={[styles.addCardTitle, isDarkMode && styles.addCardTitleDark]}
                    >
                      {manageablePrograms.length > 0
                        ? "Gérer mes classes"
                        : "Aucune classe disponible"}
                    </Text>
                    <Text
                      style={[styles.addCardText, isDarkMode && styles.addCardTextDark]}
                    >
                      {manageablePrograms.length > 0
                        ? "Ouvrir pour ajouter ou retirer des classes de votre liste."
                        : "Il n'y a aucune classe supplémentaire à gérer."}
                    </Text>
                  </View>
                </Pressable>
              </View>
            }
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
            getItemLayout={(_, index) => ({
              length: 170,
              offset: 170 * index,
              index,
            })}
          />
        ) : (
          <NoProgram />
        )}
      <Modal
        visible={isClassPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsClassPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsClassPickerVisible(false)}
          />
          <View style={[styles.modalSheet, isDarkMode && styles.modalSheetDark]}>
            <View style={[styles.modalHandle, isDarkMode && styles.modalHandleDark]} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.sheetTitle, isDarkMode && styles.sheetTitleDark]}>
                  Gérer mes classes
                </Text>
                <Text style={[styles.sheetText, isDarkMode && styles.sheetTextDark]}>
                  Recherchez et sélectionnez les classes que vous souhaitez suivre.
                </Text>
              </View>
              <Pressable
                onPress={() => setIsClassPickerVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={isDarkMode ? "#FFFFFF" : "#111827"}
                />
              </Pressable>
            </View>

            <View
              style={[
                styles.sheetSearchWrapper,
                isDarkMode && styles.sheetSearchWrapperDark,
              ]}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={isDarkMode ? "#CCCCCC" : "#6B7280"}
              />
              <TextInput
                style={[
                  styles.sheetSearchInput,
                  isDarkMode && styles.sheetSearchInputDark,
                ]}
                placeholder="Rechercher une classe..."
                placeholderTextColor={isDarkMode ? "#CCCCCC" : "#6B7280"}
                value={additionalSearchQuery}
                onChangeText={setAdditionalSearchQuery}
              />
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.sheetList}
              showsVerticalScrollIndicator={false}
            >
              {filteredManageablePrograms.length > 0 ? (
                filteredManageablePrograms.map((item) => {
                  const isTrackSelected = secondaryPreferences.selectedTracks.some(
                    (track) => isSameTrack(track, getSecondaryProgramLabel(item))
                  );
                  return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.sheetProgramCard,
                      isDarkMode && styles.sheetProgramCardDark,
                      isTrackSelected && { borderColor: "#E11D48", borderWidth: 1 },
                    ]}
                    onPress={() => void handleToggleTrack(getSecondaryProgramLabel(item))}
                    disabled={isSavingPreference}
                  >
                    <View style={styles.sheetProgramCopy}>
                      <Text
                        style={[
                          styles.sheetProgramTitle,
                          isDarkMode && styles.sheetProgramTitleDark,
                        ]}
                      >
                        {getSecondaryProgramLabel(item)}
                      </Text>
                      <Text
                        style={[
                          styles.sheetProgramText,
                          isDarkMode && styles.sheetProgramTextDark,
                        ]}
                      >
                        {item.description || (isTrackSelected ? "Retirer cette classe de votre liste." : "Ajouter cette classe à votre liste.")}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isTrackSelected ? "minus-circle" : "plus-circle"}
                      size={24}
                      color={isTrackSelected ? "#E11D48" : theme.color.primary[500]}
                    />
                  </Pressable>
                )})
              ) : (
                <View style={styles.emptySheetState}>
                  <MaterialCommunityIcons
                    name="school-outline"
                    size={40}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.emptySheetTitle,
                      isDarkMode && styles.sheetTitleDark,
                    ]}
                  >
                    {manageablePrograms.length === 0
                      ? "Aucune classe disponible"
                      : "Aucune classe trouvée"}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  selectorContainer: {
    margin: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectorContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  selectorTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  selectorTitleDark: {
    color: "#FFFFFF",
  },
  selectorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    marginBottom: 16,
  },
  selectorTextDark: {
    color: "#D1D5DB",
  },
  trackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trackChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  trackChipDark: {
    backgroundColor: "#1E3A8A",
    borderColor: "#2563EB",
  },
  trackChipDisabled: {
    opacity: 0.6,
  },
  trackChipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  trackChipTextDark: {
    color: "#DBEAFE",
  },
  savingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  savingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
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
  loadingTextDark: {
    color: "#FFFFFF",
  },
  listContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  highlightSection: {
    marginBottom: 8,
  },
  highlightTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  highlightTitleDark: {
    color: "#FFFFFF",
  },
  highlightText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  highlightTextDark: {
    color: "#D1D5DB",
  },
  footerPrograms: {
    marginTop: 4,
  },
  addCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.color.primary[500],
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  addCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  addCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 99, 235, 0.10)",
  },
  addCardCopy: {
    flex: 1,
  },
  addCardTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  addCardTitleDark: {
    color: "#FFFFFF",
  },
  addCardText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },
  addCardTextDark: {
    color: "#D1D5DB",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  modalSheet: {
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  modalSheetDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  modalHandleDark: {
    backgroundColor: "#6B7280",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  modalHeaderCopy: {
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    flexGrow: 0,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  sheetTitleDark: {
    color: "#FFFFFF",
  },
  sheetText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    marginBottom: 16,
  },
  sheetTextDark: {
    color: "#D1D5DB",
  },
  sheetSearchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  sheetSearchWrapperDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  sheetSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#111827",
  },
  sheetSearchInputDark: {
    color: "#FFFFFF",
  },
  sheetList: {
    paddingBottom: 20,
  },
  sheetProgramCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  sheetProgramCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.dark.border,
  },
  sheetProgramCopy: {
    flex: 1,
  },
  sheetProgramTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sheetProgramTitleDark: {
    color: "#FFFFFF",
  },
  sheetProgramText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },
  sheetProgramTextDark: {
    color: "#D1D5DB",
  },
  emptySheetState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptySheetTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginTop: 12,
  },
});

export default SecondaryPrograms;
