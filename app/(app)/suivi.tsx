import React, { useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Href, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { useUser } from "@/contexts/useUserInfo";
import { parseSecondaryPreferences } from "@/utils/secondaryPreferences";

export const SUIVI_SEEN_KEY = "suivi_announcement_seen_v1";

const FEATURES: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }[] = [
  { icon: "comment-question-outline", text: "Poser vos questions sur le programme" },
  { icon: "lightbulb-on-outline", text: "Demander des conseils de méthode et d'organisation" },
  { icon: "account-search-outline", text: "Vous renseigner sur les concours et examens" },
  { icon: "account-heart-outline", text: "Bénéficier d'un suivi personnalisé tout au long de l'année" },
];

const SuiviWelcome = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { user } = useAuth();
  const { userPrograms } = useUser();

  // Marque l'annonce comme vue dès l'ouverture : ne réapparaîtra plus.
  useEffect(() => {
    AsyncStorage.setItem(SUIVI_SEEN_KEY, "true").catch(() => {});
  }, []);

  // Prepa : a-t-il un programme de prépa actif ?
  const activePrepa = userPrograms?.[0] ?? null;
  const hasPrepa = !!activePrepa?.id;

  // Secondaire : a-t-il déjà choisi une classe ?
  const secondaryPreferences = parseSecondaryPreferences(user?.metadata);
  const preferredTrack = secondaryPreferences.preferredTrack;
  const hasSecondary = !!preferredTrack;

  const goPrepa = () => {
    if (!hasPrepa) return;
    router.replace(`/(app)/learn/${activePrepa!.id}` as Href);
  };

  const goSecondary = () => {
    if (!hasSecondary) return;
    router.replace(`/(app)/secondary` as Href);
  };

  const dismiss = () => {
    router.replace(`/(app)` as Href);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Hero */}
        <LinearGradient
          colors={[theme.color.primary[600], theme.color.primary[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="check-decagram" size={16} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>Nouveau</Text>
          </View>

          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="forum" size={44} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>
            Un vrai professeur vous accompagne
          </Text>
          <Text style={styles.heroSubtitle}>
            Vous pouvez désormais discuter et être suivi personnellement par un
            enseignant, directement dans l'application.
          </Text>
        </LinearGradient>

        {/* Body */}
        <View style={styles.body}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            Ce que vous pouvez faire
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View
                key={f.text}
                style={[styles.featureRow, isDark && styles.featureRowDark]}
              >
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={22}
                    color={theme.color.primary[500]}
                  />
                </View>
                <Text style={[styles.featureText, isDark && styles.textMuted]}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.ctaSectionTitle, isDark && styles.textLight]}>
            Rejoignez votre groupe de suivi
          </Text>

          {/* CTA Prépa */}
          <Pressable
            onPress={goPrepa}
            disabled={!hasPrepa}
            style={({ pressed }) => [
              styles.cta,
              isDark && styles.ctaDark,
              styles.ctaPrepa,
              !hasPrepa && styles.ctaDisabled,
              pressed && hasPrepa && styles.ctaPressed,
            ]}
          >
            <View style={[styles.ctaIcon, { backgroundColor: "rgba(5,150,105,0.12)" }]}>
              <MaterialCommunityIcons
                name="school"
                size={26}
                color={theme.color.primary[500]}
              />
            </View>
            <View style={styles.ctaContent}>
              <Text style={[styles.ctaTitle, isDark && styles.textLight]}>
                Prépa concours
              </Text>
              <Text style={[styles.ctaSubtitle, isDark && styles.textMuted]}>
                {hasPrepa
                  ? "Ouvrez votre programme et accédez au groupe de suivi du concours."
                  : "Inscrivez-vous à un programme de prépa pour débloquer le suivi."}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={hasPrepa ? "chevron-right" : "lock-outline"}
              size={22}
              color={hasPrepa ? theme.color.primary[500] : "#9CA3AF"}
            />
          </Pressable>

          {/* CTA Secondaire */}
          <Pressable
            onPress={goSecondary}
            disabled={!hasSecondary}
            style={({ pressed }) => [
              styles.cta,
              isDark && styles.ctaDark,
              !hasSecondary && styles.ctaDisabled,
              pressed && hasSecondary && styles.ctaPressed,
            ]}
          >
            <View style={[styles.ctaIcon, { backgroundColor: "rgba(37,99,235,0.12)" }]}>
              <MaterialCommunityIcons name="book-open-variant" size={26} color="#2563EB" />
            </View>
            <View style={styles.ctaContent}>
              <Text style={[styles.ctaTitle, isDark && styles.textLight]}>
                Secondaire {hasSecondary ? `· ${preferredTrack}` : ""}
              </Text>
              <Text style={[styles.ctaSubtitle, isDark && styles.textMuted]}>
                {hasSecondary
                  ? "Accédez à votre classe et au groupe de suivi de votre série."
                  : "Choisissez d'abord votre classe pour rejoindre le suivi."}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={hasSecondary ? "chevron-right" : "lock-outline"}
              size={22}
              color={hasSecondary ? "#2563EB" : "#9CA3AF"}
            />
          </Pressable>

          <Pressable onPress={dismiss} style={styles.dismiss} hitSlop={8}>
            <Text style={[styles.dismissText, isDark && styles.textMuted]}>
              Plus tard
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  scroll: {
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 20,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  ctaSectionTitle: {
    marginTop: 28,
  },
  textLight: {
    color: "#FFFFFF",
  },
  textMuted: {
    color: "#9CA3AF",
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  featureRowDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(5,150,105,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    fontWeight: "500",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ctaDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  ctaPrepa: {
    borderColor: "rgba(5,150,105,0.35)",
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaPressed: {
    transform: [{ scale: 0.985 }],
  },
  ctaIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  ctaSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },
  dismiss: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dismissText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
});

export default SuiviWelcome;
