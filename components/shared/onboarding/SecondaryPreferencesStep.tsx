import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { AccountsInput } from "@/types/type";
import {
  mergeSecondaryPreferences,
  parseSecondaryPreferences,
  reminderTimeToDate,
  TERMINALE_TRACK_OPTIONS,
} from "@/utils/secondaryPreferences";

interface SecondaryPreferencesStepProps {
  title: string;
  description: string;
  userInfo: AccountsInput | null;
  setUserInfo: React.Dispatch<React.SetStateAction<AccountsInput | null>>;
}

const SecondaryPreferencesStep: React.FC<SecondaryPreferencesStepProps> = ({
  title,
  description,
  userInfo,
  setUserInfo,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [showTimePicker, setShowTimePicker] = useState(false);
  const secondaryPreferences = parseSecondaryPreferences(userInfo?.metadata);
  const reminderDate = reminderTimeToDate(secondaryPreferences.reminderTime);
  const [draftHour, setDraftHour] = useState(reminderDate.getHours());
  const [draftMinute, setDraftMinute] = useState(reminderDate.getMinutes());

  const updateUserInfo = (
    field: string,
    value: string | number | boolean | Date | null | object
  ) => {
    setUserInfo((prev) =>
      prev ? { ...prev, [field]: value } : { [field]: value, authId: "", email: "" }
    );
  };

  const updateSecondaryPreferences = (
    updates: Parameters<typeof mergeSecondaryPreferences>[1]
  ) => {
    const nextMetadata = mergeSecondaryPreferences(userInfo?.metadata, updates);
    updateUserInfo("metadata", nextMetadata);

    if (Object.prototype.hasOwnProperty.call(updates, "preferredTrack")) {
      updateUserInfo("schoollevel", updates.preferredTrack ? "secondary" : null);
      updateUserInfo("gradelevel", updates.preferredTrack || null);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "reminderEnabled")) {
      updateUserInfo("reminders", updates.reminderEnabled ?? false);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "reminderTime")) {
      updateUserInfo(
        "remindertime",
        updates.reminderTime ? reminderTimeToDate(updates.reminderTime) : null
      );
    }
  };

  const openTimePicker = () => {
    setDraftHour(reminderDate.getHours());
    setDraftMinute(reminderDate.getMinutes());
    setShowTimePicker(true);
  };

  const updateDraftReminderTime = (
    part: "hours" | "minutes",
    delta: number
  ) => {
    if (part === "hours") {
      setDraftHour((current) => (current + delta + 24) % 24);
      return;
    }

    setDraftMinute((current) => (current + delta + 60) % 60);
  };

  const confirmReminderTime = () => {
    const reminderTime = `${String(draftHour).padStart(2, "0")}:${String(
      draftMinute
    ).padStart(2, "0")}`;

    updateSecondaryPreferences({
      reminderEnabled: true,
      reminderTime,
    });
    setShowTimePicker(false);
  };

  return (
    <ScrollView
      style={[styles.scrollView, isDarkMode && styles.scrollViewDark]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>{title}</Text>
        <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>
          {description}
        </Text>

        <View style={styles.section}>
         

          <View style={styles.trackOptions}>
            {TERMINALE_TRACK_OPTIONS.map((option) => {
              const isSelected =
                option.value === null
                  ? secondaryPreferences.hasAnsweredTerminaleStep &&
                    !secondaryPreferences.preferredTrack
                  : secondaryPreferences.preferredTrack === option.value;

              return (
                <Pressable
                  key={String(option.label)}
                  onPress={() =>
                    updateSecondaryPreferences({
                      hasAnsweredTerminaleStep: true,
                      preferredTrack: option.value,
                      reminderEnabled: option.value
                        ? secondaryPreferences.reminderEnabled
                        : false,
                      reminderTime: option.value
                        ? secondaryPreferences.reminderTime
                        : null,
                    })
                  }
                  style={[
                    styles.trackChip,
                    isDarkMode && styles.trackChipDark,
                    isSelected && styles.trackChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.trackChipText,
                      isDarkMode && styles.trackChipTextDark,
                      isSelected && styles.trackChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {secondaryPreferences.preferredTrack && (
            <View
              style={[
                styles.preferenceCard,
                isDarkMode && styles.preferenceCardDark,
              ]}
            >
              <View style={styles.preferenceHeader}>
                <View style={styles.preferenceCopy}>
                  <Text style={[styles.preferenceTitle, isDarkMode && styles.textDark]}>
                    Rappel quotidien
                  </Text>
                  <Text
                    style={[
                      styles.preferenceText,
                      isDarkMode && styles.sectionDescriptionDark,
                    ]}
                  >
                    Heure du quiz et de l&apos;exercice du jour.
                  </Text>
                </View>
                <Switch
                  value={secondaryPreferences.reminderEnabled}
                  onValueChange={(value) =>
                    updateSecondaryPreferences({
                      reminderEnabled: value,
                      reminderTime: secondaryPreferences.reminderTime ?? "19:00",
                    })
                  }
                  trackColor={{
                    false: isDarkMode
                      ? theme.color.gray[700]
                      : theme.color.gray[300],
                    true: theme.color.primary[500],
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Pressable
                onPress={openTimePicker}
                disabled={!secondaryPreferences.reminderEnabled}
                style={[
                  styles.timeButton,
                  isDarkMode && styles.timeButtonDark,
                  !secondaryPreferences.reminderEnabled && styles.timeButtonDisabled,
                ]}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={
                    secondaryPreferences.reminderEnabled
                      ? theme.color.primary[500]
                      : theme.color.gray[500]
                  }
                />
                <Text
                  style={[
                    styles.timeButtonText,
                    isDarkMode && styles.textDark,
                    !secondaryPreferences.reminderEnabled &&
                      styles.timeButtonTextDisabled,
                  ]}
                >
                  {secondaryPreferences.reminderEnabled
                    ? `Tous les jours à ${String(reminderDate.getHours()).padStart(2, "0")}:${String(reminderDate.getMinutes()).padStart(2, "0")}`
                    : "Activer le rappel pour choisir une heure"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.timeModalOverlay}>
            <Pressable
              style={styles.timeModalBackdrop}
              onPress={() => setShowTimePicker(false)}
            />
            <View
              style={[
                styles.timeModalCard,
                isDarkMode && styles.timeModalCardDark,
              ]}
            >
              <Text style={[styles.timeModalTitle, isDarkMode && styles.textDark]}>
                Heure du rappel
              </Text>
              <Text
                style={[
                  styles.timeModalSubtitle,
                  isDarkMode && styles.sectionDescriptionDark,
                ]}
              >
                Réglez l&apos;heure.
              </Text>

              <View style={styles.timeAdjustRow}>
                <View
                  style={[
                    styles.timeAdjustCard,
                    isDarkMode && styles.timeAdjustCardDark,
                  ]}
                >
                  <Text style={[styles.timeAdjustLabel, isDarkMode && styles.textDark]}>
                    Heure
                  </Text>
                  <Pressable
                    style={styles.timeAdjustButton}
                    onPress={() => updateDraftReminderTime("hours", 1)}
                  >
                    <MaterialCommunityIcons
                      name="chevron-up"
                      size={22}
                      color={theme.color.primary[500]}
                    />
                  </Pressable>
                  <Text style={[styles.timeAdjustValue, isDarkMode && styles.textDark]}>
                    {String(draftHour).padStart(2, "0")}
                  </Text>
                  <Pressable
                    style={styles.timeAdjustButton}
                    onPress={() => updateDraftReminderTime("hours", -1)}
                  >
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={22}
                      color={theme.color.primary[500]}
                    />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.timeAdjustCard,
                    isDarkMode && styles.timeAdjustCardDark,
                  ]}
                >
                  <Text style={[styles.timeAdjustLabel, isDarkMode && styles.textDark]}>
                    Minutes
                  </Text>
                  <Pressable
                    style={styles.timeAdjustButton}
                    onPress={() => updateDraftReminderTime("minutes", 5)}
                  >
                    <MaterialCommunityIcons
                      name="chevron-up"
                      size={22}
                      color={theme.color.primary[500]}
                    />
                  </Pressable>
                  <Text style={[styles.timeAdjustValue, isDarkMode && styles.textDark]}>
                    {String(draftMinute).padStart(2, "0")}
                  </Text>
                  <Pressable
                    style={styles.timeAdjustButton}
                    onPress={() => updateDraftReminderTime("minutes", -5)}
                  >
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={22}
                      color={theme.color.primary[500]}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.timeModalActions}>
                <Pressable
                  style={[
                    styles.timeModalSecondaryButton,
                    isDarkMode && styles.timeModalSecondaryButtonDark,
                  ]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text
                    style={[
                      styles.timeModalSecondaryText,
                      isDarkMode && styles.textDark,
                    ]}
                  >
                    Annuler
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.timeModalPrimaryButton}
                  onPress={confirmReminderTime}
                >
                  <Text style={styles.timeModalPrimaryText}>Confirmer</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewDark: {},
  container: {},
  containerDark: {},
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: "700",
    marginBottom: theme.spacing.small,
    color: theme.color.gray[900],
  },
  description: {
    marginBottom: theme.spacing.medium,
    color: theme.color.gray[600],
  },
  descriptionDark: {
    color: theme.color.gray[300],
  },
  textDark: {
    color: theme.color.gray[50],
  },
  section: {
    marginBottom: theme.spacing.large,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: "600",
    marginBottom: theme.spacing.small,
    color: theme.color.gray[700],
  },
  sectionDescription: {
    color: theme.color.gray[600],
    marginBottom: theme.spacing.medium,
  },
  sectionDescriptionDark: {
    color: theme.color.gray[300],
  },
  trackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trackChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.gray[300],
    backgroundColor: theme.color.gray[50],
  },
  trackChipDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  trackChipSelected: {
    backgroundColor: theme.color.primary[500],
    borderColor: theme.color.primary[500],
  },
  trackChipText: {
    fontFamily: theme.typography.fontFamily,
    color: theme.color.gray[800],
    fontWeight: "600",
  },
  trackChipTextDark: {
    color: theme.color.gray[100],
  },
  trackChipTextSelected: {
    color: "#FFFFFF",
  },
  preferenceCard: {
    marginTop: theme.spacing.medium,
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    borderRadius: theme.border.radius.medium,
    padding: theme.spacing.medium,
    backgroundColor: "#FFFFFF",
  },
  preferenceCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  preferenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: "700",
    color: theme.color.gray[900],
    marginBottom: 4,
  },
  preferenceText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
    color: theme.color.gray[600],
  },
  timeButton: {
    marginTop: theme.spacing.medium,
    borderRadius: theme.border.radius.small,
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    padding: theme.spacing.medium,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeButtonDark: {
    borderColor: theme.color.gray[700],
  },
  timeButtonDisabled: {
    opacity: 0.55,
  },
  timeButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.gray[900],
    fontWeight: "600",
  },
  timeButtonTextDisabled: {
    color: theme.color.gray[500],
  },
  timeModalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  timeModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  timeModalCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  timeModalCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  timeModalTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: theme.color.gray[900],
    marginBottom: 6,
  },
  timeModalSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
    color: theme.color.gray[600],
    marginBottom: 18,
  },
  timeAdjustRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeAdjustCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    padding: 14,
    alignItems: "center",
    backgroundColor: theme.color.gray[50],
  },
  timeAdjustCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.gray[700],
  },
  timeAdjustLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
    fontWeight: "600",
    color: theme.color.gray[700],
    marginBottom: 8,
  },
  timeAdjustButton: {
    padding: 6,
  },
  timeAdjustValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 28,
    fontWeight: "700",
    color: theme.color.gray[900],
    marginVertical: 6,
  },
  timeModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  timeModalSecondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color.gray[300],
    paddingVertical: 12,
    alignItems: "center",
  },
  timeModalSecondaryButtonDark: {
    borderColor: theme.color.gray[700],
  },
  timeModalSecondaryText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: "600",
    color: theme.color.gray[900],
  },
  timeModalPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: theme.color.primary[500],
    paddingVertical: 12,
    alignItems: "center",
  },
  timeModalPrimaryText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default SecondaryPreferencesStep;
