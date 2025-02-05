import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import ExerciseContent, { Block as ContentBlock } from "@/components/shared/BlockNoteContent";
import WebView from "react-native-webview";
import { useAuth } from "@/contexts/auth";

// TODO: handle last exercises acced track


interface TextStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

interface BlockProps {
  textColor?: string;
  textAlignment?: string;
  backgroundColor?: string;
}



interface Exercise {
  id: string;
  title: string;
  description: string;
  content: ContentBlock[];
  correction: ContentBlock[];
  course: {
    name: string;
    courses_categories?: {
      name: string;
    };
  };
}

const ExercisePage = () => {
  const { exerciceId } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCorrection, setIsCorrection] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    fetchExerciseData();
  }, [exerciceId]);

  const fetchExerciseData = async () => {
    try {
      const {data, error} = await supabase
          .from("exercices")
          .select(`
          *,
          course:courses (
            name,
            courses_categories (
              name
            )
          )
        `)
          .eq("id", exerciceId)
          .single();

      if (error) {
        console.error("Error fetching exercise:", error);
        return;
      }
      setExercise(data);
    } catch (error) {
      console.error("Unexpected error fetching exercise:", error);
    } finally {
      setLoading(false);
    }
  };

 


  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, isDark && styles.textDark]}>
          Exercise not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.courseName, isDark && styles.textDark]}>
            {exercise.course.name}
          </Text>
          <Text style={[styles.categoryName, isDark && styles.textDark]}>
            {exercise.course.courses_categories?.name || "No category"}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}

      >
        <View style={styles.content}>
        <WebView
        source={{
          uri: `https://elearn.ezadrive.com/fr/webview/exercices/${exerciceId}/correction?theme=${isDark ? "dark" : "light"}`,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "color-scheme": isDark ? "dark" : "light",
          },
        }}
        style={[styles.webView, isDark && styles.webViewDark, (webLoading || !isCorrection) && { height: 0 }]}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onShouldStartLoadWithRequest={() => true}
        startInLoadingState={true}
        onLoadStart={() => setWebLoading(true)}
        onLoadEnd={() => setWebLoading(false)}
        onError={ () => {setWebLoading(true)} }
        injectedJavaScript={`(function() {
            function applyDarkMode() {
                if (${isDark}) {
                    const container = document.querySelector('.bn-container');
                    if (container) {
                        container.classList.add('dark');
                        container.setAttribute('data-color-scheme', 'dark');
                        
                        // Add custom CSS variables for dark mode colors
                        document.documentElement.style.setProperty('--bn-colors-editor-text', '#FFFFFF');
                        document.documentElement.style.setProperty('--bn-colors-editor-background', '#111827');
                        document.documentElement.style.setProperty('--bn-colors-menu-text', '#F3F4F6');
                        document.documentElement.style.setProperty('--bn-colors-menu-background', '#1F2937');
                        document.documentElement.style.setProperty('--bn-colors-editor-border', '#374151');

                        // Add custom styles for specific elements
                        const style = document.createElement('style');
                        style.textContent = \`
                            .bn-container[data-color-scheme=dark] {
                                --bn-colors-editor-text: #FFFFFF;
                                --bn-colors-editor-background: #111827;
                                --bn-colors-menu-text: #F3F4F6;
                                --bn-colors-menu-background: #1F2937;
                                background-color: #111827;
                                color: #FFFFFF;
                            }
                            .bn-container[data-color-scheme=dark] * {
                                border-color: #374151 !important;
                            }
                            .bn-container[data-color-scheme=dark] .content {
                                background-color: #111827;
                                color: #FFFFFF;
                            }
                        \`;
                        document.head.appendChild(style);
                    }
                }
            }


            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length) {
                        applyDarkMode();
                    }
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        })();`}
       
      />
        <WebView
        source={{
          uri: `https://elearn.ezadrive.com/fr/webview/exercices/${exerciceId}/content?theme=${isDark ? "dark" : "light"}`,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "color-scheme": isDark ? "dark" : "light",
          },
        }}
        style={[styles.webView, isDark && styles.webViewDark, (webLoading || isCorrection ) && { height: 0 }]}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onShouldStartLoadWithRequest={() => true}
        startInLoadingState={true}
        onLoadStart={() => setWebLoading(true)}
        onLoadEnd={() => setWebLoading(false)}
        onError={ () => {setWebLoading(true)} }
        injectedJavaScript={`(function() {
            function applyDarkMode() {
                if (${isDark}) {
                    const container = document.querySelector('.bn-container');
                    if (container) {
                        container.classList.add('dark');
                        container.setAttribute('data-color-scheme', 'dark');
                        
                        // Add custom CSS variables for dark mode colors
                        document.documentElement.style.setProperty('--bn-colors-editor-text', '#FFFFFF');
                        document.documentElement.style.setProperty('--bn-colors-editor-background', '#111827');
                        document.documentElement.style.setProperty('--bn-colors-menu-text', '#F3F4F6');
                        document.documentElement.style.setProperty('--bn-colors-menu-background', '#1F2937');
                        document.documentElement.style.setProperty('--bn-colors-editor-border', '#374151');

                        // Add custom styles for specific elements
                        const style = document.createElement('style');
                        style.textContent = \`
                            .bn-container[data-color-scheme=dark] {
                                --bn-colors-editor-text: #FFFFFF;
                                --bn-colors-editor-background: #111827;
                                --bn-colors-menu-text: #F3F4F6;
                                --bn-colors-menu-background: #1F2937;
                                background-color: #111827;
                                color: #FFFFFF;
                            }
                            .bn-container[data-color-scheme=dark] * {
                                border-color: #374151 !important;
                            }
                            .bn-container[data-color-scheme=dark] .content {
                                background-color: #111827;
                                color: #FFFFFF;
                            }
                        \`;
                        document.head.appendChild(style);
                    }
                }
            }


            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length) {
                        applyDarkMode();
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        })();`}
       
      />
          { webLoading &&   <ExerciseContent blocks={ isCorrection ? exercise?.correction :  exercise.content} />} 
        </View>
      </ScrollView>
      <TouchableOpacity
        style={[styles.correctionButton, !exercise.correction && { backgroundColor: "#BDBDBD" }]}
        onPress={() => setIsCorrection(!isCorrection)}
        disabled={(!exercise.correction || webLoading)}
      >
        <Text style={[styles.correctionButtonText, isDark && styles.textDark]}>
          {isCorrection ? "Voir l'exercice" : "Voir la correction"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginBottom: 68,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
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
  headerTitleContainer: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  categoryName: {
    fontSize: 14,
    color: theme.color.gray[600],
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 4,
  },
  block: {
    marginBottom: 12,
  },
  paragraph: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 24,
  },
  textDark: {
    color: "#FFFFFF",
  },
  boldText: {
    fontWeight: "700",
  },
  italicText: {
    fontStyle: "italic",
  },
  underlineText: {
    textDecorationLine: "underline",
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    color: "#1A1A1A",
  },
  bulletContent: {
    flex: 1,
  },
  numberedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  number: {
    fontSize: 16,
    marginRight: 8,
    minWidth: 24,
    color: "#1A1A1A",
  },
  numberedContent: {
    flex: 1,
  },
  webView: {
    flex: 1,
    height: Dimensions.get("window").height,
    left: "-12%",
    width: "130%",
    // paddingBottom: 160,
    backgroundColor: "#FFFFFF",
  },
  webViewDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  errorText: {
    fontSize: 18,
    color: theme.color.gray[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  correctionButton: {
    backgroundColor: theme.color.primary[500],
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
  },
  correctionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
});

export default ExercisePage;