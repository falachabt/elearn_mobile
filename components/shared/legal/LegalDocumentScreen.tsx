import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { WebView } from "react-native-webview";

import { theme } from "@/constants/theme";

type LegalDocumentScreenProps = {
  title: string;
  url: string;
};

export default function LegalDocumentScreen({
  title,
  url,
}: LegalDocumentScreenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasWebError, setHasWebError] = useState(false);
  const isDark = useColorScheme() === "dark";
  const isWeb = Platform.OS === "web";

  const backgroundColor = useMemo(
    () =>
      isDark
        ? theme.color.dark.background.primary
        : theme.color.light.background.primary,
    [isDark]
  );

  const headerBackgroundColor = useMemo(
    () =>
      isDark
        ? theme.color.dark.background.tertiary
        : theme.color.light.background.primary,
    [isDark]
  );

  const iframeStyle = useMemo(
    () => ({
      flex: 1,
      width: "100%",
      height: "100%",
      border: "none",
      backgroundColor: "transparent",
    }),
    []
  );

  const textPrimaryColor = isDark
    ? theme.color.dark.text.primary
    : theme.color.light.text.primary;
  const textSecondaryColor = isDark
    ? theme.color.dark.text.secondary
    : theme.color.light.text.secondary;

  const handleBackPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  }, [router]);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleWebError = useCallback(() => {
    setLoading(false);
    setHasWebError(true);
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    Linking.openURL(url);
  }, [url]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top", "right", "left"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={headerBackgroundColor}
        translucent={false}
      />

      <View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={textPrimaryColor}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: textPrimaryColor }]}>
          {title}
        </Text>

        <View style={styles.placeholder} />
      </View>

      <View style={styles.contentContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
            <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
              Chargement en cours...
            </Text>
          </View>
        )}

        {isWeb ? (
          hasWebError ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: textPrimaryColor }]}>
                Impossible d&apos;afficher cette page ici.
              </Text>
              <TouchableOpacity
                style={styles.openLinkButton}
                onPress={handleOpenInNewTab}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="open-in-new"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.openLinkButtonText}>Ouvrir la page</Text>
              </TouchableOpacity>
            </View>
          ) : (
            React.createElement("iframe", {
              src: url,
              title,
              onLoad: handleLoadEnd,
              onError: handleWebError,
              style: iframeStyle,
            })
          )
        ) : (
          <WebView
            source={{ uri: url }}
            style={styles.webView}
            onLoadEnd={handleLoadEnd}
            javaScriptEnabled
            domStorageEnabled
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.typography.fontFamily,
  },
  placeholder: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: theme.typography.fontFamily,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: theme.typography.fontFamily,
  },
  openLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.color.primary[500],
  },
  openLinkButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.typography.fontFamily,
  },
});
