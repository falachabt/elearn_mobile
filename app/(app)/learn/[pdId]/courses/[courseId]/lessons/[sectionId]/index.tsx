import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { WebView } from "react-native-webview";
import { useAuth } from "@/contexts/auth";
import { theme } from "@/constants/theme";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useColorScheme } from "@/hooks/useColorScheme";
import { CoursesContent, Courses } from "@/types/type";

interface Course extends Courses {
  courses_content: CoursesContent[];
}

const SectionDetail = () => {
  const router = useRouter();
  const { sectionId, courseId, pdId } = useLocalSearchParams();
  const { session } = useAuth();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { markSectionComplete, sectionsProgress, updateLastAccessed } = useCourseProgress(
    Number(courseId)
  );


  useEffect( () => {
updateLastAccessed(Number(sectionId))
  } , [sectionId]) 


  
  const progress = sectionsProgress?.find(
    (section) => section.sectionid == Number(sectionId)
  );

  // Fetch category data
  const {
    data: category,
    error: categoryError,
    isLoading: categoryLoading,
    mutate: mutateC,
  } = useSWR(sectionId ? `content-${sectionId}` : null, async () => {
    const { data } = await supabase
      .from("courses_content")
      .select("*, courses(name)")
      .eq("id", sectionId)
      .order("order", { ascending: true })
      .single();
    return data;
  });

  // Fetch course data to get sections
  const {
    data: course,
    error: courseError,
    isLoading: courseLoading,
    mutate,
  } = useSWR<Course | null>(
    courseId ? `course-section-${courseId}` : null,
    async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, courses_content(name, order, id)")
        .eq("id", courseId)
        .single();

      // Sort the sections by the 'order' field
      if (data && data.courses_content) {
        data.courses_content.sort(
          (a: CoursesContent, b: CoursesContent) =>
            (a?.order ?? 0) - (b?.order ?? 0)
        );
      }

      return data;
    }
  );

  useEffect(() => {
    mutate(), mutateC();
  }, [courseId, sectionId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsListening(true);
    }, 10000); // Start listening after 10 seconds

    return () => clearTimeout(timer); // Cleanup the timer on component unmount
  }, []);

  if (categoryLoading || courseLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#65B741" />
      </View>
    );
  }

  if (categoryLoading || courseLoading) {
    return (
      <View
        style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#6EE7B7" : "#65B741"}
        />
      </View>
    );
  }

  if (categoryError || courseError) {
    return (
      <View
        style={[styles.errorContainer, isDark && styles.errorContainerDark]}
      >
        <ThemedText style={styles.errorText}>
          Une erreur s'est produite lors du chargement de la catégorie ou du
          cours.
        </ThemedText>
      </View>
    );
  }

  const sections = course?.courses_content.sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const currentIndex =
    sections?.findIndex((section) => section.id == Number(sectionId)) ?? -1;
  const previousSection =
    sections && currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection =
    sections && currentIndex >= 0 && currentIndex < sections.length - 1
      ? sections[currentIndex + 1]
      : null;

  function handleNext() {
    console.log("handleNext", scrolledToEnd, progress?.progress, sectionId);
    if (progress?.progress !== 1) {
      markSectionComplete(Number(sectionId));
    } else if (progress === undefined) {
      markSectionComplete(Number(sectionId));
    }

    if (nextSection) {
      if (scrolledToEnd || progress?.progress === 1) {
        router.push(
          `/(app)/learn/${pdId}/courses/${courseId}/lessons/${nextSection.id}`
        );
      }
    } else {
      if (scrolledToEnd || progress?.progress === 1) {
        router.push(`/(app)/learn/${pdId}/courses/${courseId}`);
      }
    }
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.push(`/(app)/learn/${pdId}/courses/${courseId}`)
          }
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText
            style={[styles.courseTitle, isDark && styles.courseTitleDark]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {category?.name}
          </ThemedText>
          <ThemedText
            style={[styles.courseInfo, isDark && styles.courseInfoDark]}
          >
            {course?.name && course.name.length > 15
              ? `${course.name.substring(0, 15)}...`
              : course?.name}{" "}
            • cat • {sections?.length} sections
          </ThemedText>
        </View>
      </View>

      <WebView
        source={{
          uri: `https://elearn.ezadrive.com/webview/courseContent/${sectionId}?theme=${
            isDark ? "dark" : "light"
          }`,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "color-scheme": isDark ? "dark" : "light",
          },
        }}
        style={[styles.webView, isDark && styles.webViewDark]}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onShouldStartLoadWithRequest={() => true}
        startInLoadingState={true}
        renderLoading={() => (
          <View
            style={[
              styles.loadingContainer,
              isDark && styles.loadingContainerDark,
            ]}
          >
            <ActivityIndicator
              size="large"
              color={isDark ? "#6EE7B7" : "#65B741"}
            />
          </View>
        )}
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

            function checkIfContentLoaded() {
                if (document.readyState === 'complete') {
                    document.body.style.userSelect = 'none';
                    applyDarkMode();
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: "scrolledToEnd",
                        windowInnerHeight: window.innerHeight,
                        windowScrollY: window.scrollY,
                        documentBodyOffsetHeight: document.body.offsetHeight
                    }));
                    
                    window.onscroll = function() {
                        if ((window.innerHeight + window.scrollY + 120) >= document.body.offsetHeight) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: "scrolledToEnd",
                                windowInnerHeight: window.innerHeight,
                                windowScrollY: window.scrollY,
                                documentBodyOffsetHeight: document.body.offsetHeight
                            }));
                        }
                    };
                } else {
                    setTimeout(checkIfContentLoaded, 500);
                }
            }

            checkIfContentLoaded();

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
        onMessage={(event) => {
          if (!isListening) return;
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === "scrolledToEnd") {
            console.log("User has scrolled to the end of the page", data);
            setScrolledToEnd(true);
          }
        }}
      />

      <View
        style={[
          styles.navigationContainer,
          isDark && styles.navigationContainerDark,
        ]}
      >
        {previousSection && (
          <Pressable
            style={[
              styles.navigationButton,
              isDark && styles.navigationButtonDark,
            ]}
            onPress={() =>
              router.push(
                `/(app)/learn/${courseId}/courses/${courseId}/lessons/${previousSection.id}`
              )
            }
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
        )}
        <Pressable
          style={[
            styles.navigationButton,
            isDark && styles.navigationButtonDark,
            !scrolledToEnd && progress?.progress !== 1 && styles.disabledButton,
            !scrolledToEnd &&
              progress?.progress !== 1 &&
              isDark &&
              styles.disabledButtonDark,
          ]}
          onPress={() => handleNext()}
          disabled={!scrolledToEnd && progress?.progress !== 1}
        >
          <MaterialCommunityIcons
            name={nextSection ? "arrow-right" : "check"}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    marginBottom: 60,
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingContainerDark: {
    backgroundColor: "#111827",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  errorContainerDark: {
    backgroundColor: "#111827",
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  courseTitleDark: {
    color: "#FFFFFF",
  },
  courseInfo: {
    fontSize: 14,
    color: "#6B7280",
  },
  courseInfoDark: {
    color: "#9CA3AF",
  },
  webView: {
    flex: 1,
    left: "-10%",
    width: "120%",
    backgroundColor: "#FFFFFF",
  },
  webViewDark: {
    backgroundColor: "#111827",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navigationContainerDark: {
    backgroundColor: "#1F2937",
    borderTopColor: "#374151",
  },
  navigationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#65B741",
    padding: 12,
    borderRadius: 8,
  },
  navigationButtonDark: {
    backgroundColor: "#059669",
  },
  disabledButton: {
    backgroundColor: "#A0AEC0",
  },
  disabledButtonDark: {
    backgroundColor: "#4B5563",
  },
  navigationButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
});

export default SectionDetail;
