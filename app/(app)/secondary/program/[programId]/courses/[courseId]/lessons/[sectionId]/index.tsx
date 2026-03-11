import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useSWR, { mutate as globalMutate } from "swr";
import { WebView } from "react-native-webview";

import { logger } from '@/utils/logger';
import { LessonContentViewer } from "@/components/shared/learn/LessonContentViewer";
import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { useAppConfig } from "@/contexts/useAppConfig";
import { useUser } from "@/contexts/useUserInfo";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useCustomRouter } from "@/hooks/useCustomRouter";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useSound } from "@/hooks/useSound";
import { supabase } from "@/lib/supabase";
import { Events, trackEvent } from "@/utils/analytics";
import { useNavigation } from "@/contexts/NavigationContext";


interface CourseSection {
  id: number;
  name: string | null;
  order: number | null;
}

interface Course {
  id: number;
  name: string;
  courses_content: CourseSection[];
}

interface CategoryDetail {
  id: number;
  name: string | null;
  order: number | null;
  courseId: number | null;
  courses: {
    name: string | null;
  } | null;
}

const SecondarySectionDetail = () => {
  const router = useCustomRouter();
  const { sectionId, courseId, programId } = useLocalSearchParams();
  const sectionIdParam = Array.isArray(sectionId) ? sectionId[0] : sectionId;
  const courseIdParam = Array.isArray(courseId) ? courseId[0] : courseId;
  const secondaryProgramId = Array.isArray(programId) ? programId[0] : programId;
  const { getCoursePath, getLessonPath, getBasePath } = useNavigation();
  const { session } = useAuth();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
  const [showSectionList, setShowSectionList] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Check if user is enrolled in this program
  const { isSecondaryProgramEnrolled } = useUser();
  const isEnrolled = isSecondaryProgramEnrolled(secondaryProgramId ?? "");

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { playNextLesson, playCorrect } = useSound();
  const { trigger } = useHaptics();
  const { getWebViewUrls } = useAppConfig();
  const webViewUrls = getWebViewUrls();


  const {
    markSectionComplete,
    sectionsProgress,
    updateLastAccessed,
    refreshProgress,
  } = useCourseProgress(Number(courseIdParam ?? 0));

  // Prevent screenshots
  useEffect(() => {
    if (Platform.OS === "web") return;

    const preventScreenshots = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (error) {
        logger.error("Error preventing screen capture:", error);
      }
    };

    preventScreenshots();

    return () => {
      const allowScreenshots = async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (error) {
          logger.error("Error allowing screen capture:", error);
        }
      };
      allowScreenshots();
    };
  }, []);

  const { data: category } = useSWR<CategoryDetail | null>(
    sectionIdParam ? `secondary-content-${sectionIdParam}` : null,
    async () => {
      const { data } = await supabase
        .from("courses_content")
        .select("id, name, order, courseId, courses(name)")
        .eq("id", Number(sectionIdParam ?? 0))
        .order("order", { ascending: true })
        .single();
      return data;
    }
  );

  const { data: course } = useSWR<Course | null>(
    courseIdParam ? `secondary-course-sections-${courseIdParam}` : null,
    async () => {
      const { data } = await supabase
        .from("courses")
        .select(
          `
                *,
                courses_content(name, id, order)
            `
        )
        .eq("id", Number(courseIdParam ?? 0))
        .single();
      return data;
    }
  );

  useEffect(() => {
    updateLastAccessed(Number(sectionIdParam ?? 0));

    if (category) {
      trackEvent(Events.START_LESSON, {
        lesson_id: sectionIdParam ?? "",
        lesson_name: category.name ?? "Leçon",
        course_id: courseIdParam ?? "",
        course_name: category.courses?.name ?? "Cours",
        program_id: secondaryProgramId ?? "",
      });
    }
  }, [category, courseIdParam, secondaryProgramId, sectionIdParam, updateLastAccessed]);

  // Refresh progress when the sections list modal is opened
  useEffect(() => {
    if (showSectionList) {
      refreshProgress();
    }
  }, [refreshProgress, showSectionList]);

  const progress = sectionsProgress?.find(
    (s) => s.sectionid === Number(sectionIdParam ?? 0)
  );

  const sections =
    course?.courses_content?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) ||
    [];

  const currentIndex = sections.findIndex(
    (section) => section.id === Number(sectionIdParam ?? 0)
  );
  const previousSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection =
    currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  // Check if current section is locked (beyond first for non-enrolled users)
  const isCurrentSectionLocked = !isEnrolled && currentIndex >= 1;

  // Check if next section is locked
  const isNextSectionLocked =
    !isEnrolled &&
    nextSection &&
    (sections?.findIndex((section) => section.id === nextSection.id) ?? -1) >= 1;

//   Handle purchase flow  TOOD: later reidrect to the payment page
  const handlePurchaseFlow = () => {
    trigger(HapticType.SELECTION);
    router.push(getBasePath() as Href);
  };

  // Preload next section data
  useEffect(() => {
    if (nextSection && nextSection.id && !isNextSectionLocked) {
      const fetchAndCacheNextSection = async () => {
        try {
          const { data } = await supabase
            .from("courses_content")
            .select("id, name, order, courseId, courses(name)")
            .eq("id", nextSection.id)
            .order("order", { ascending: true })
            .single();

          if (data) {
            globalMutate(`secondary-content-${nextSection.id}`, data, false);
          }
        } catch {
          // Silently handle errors
        }
      };

      fetchAndCacheNextSection();
    }
  }, [nextSection, isNextSectionLocked]);

  async function handleNext() {
    if (isNextSectionLocked) {
      handlePurchaseFlow();
      return;
    }

    const shouldCheckScroll = Platform.OS !== "web";

    if (shouldCheckScroll && !scrolledToEnd && progress?.progress !== 1) {
      return;
    }

    // Track lesson completion
    if ((progress?.progress !== 1 || progress === undefined) && category) {
      trackEvent(Events.COMPLETE_LESSON, {
        lesson_id: sectionIdParam ?? "",
        lesson_name: category.name ?? "Leçon",
        course_id: courseIdParam ?? "",
        course_name: category.courses?.name ?? "Cours",
        program_id: secondaryProgramId ?? "",
      });
    }

    if (progress?.progress !== 1 || progress === undefined) {
      await markSectionComplete(Number(sectionIdParam ?? 0));
      
      // Attendre un peu pour que les mutations se propagent
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (nextSection) {
      playNextLesson();
      trigger(HapticType.LIGHT);
      router.push(
        getLessonPath(String(courseIdParam ?? ""), String(nextSection.id)) as Href
      );
    } else {
      playCorrect();
      trigger(HapticType.LIGHT);
      router.push(getCoursePath(String(courseIdParam ?? "")) as Href);
    }
  }

  function handlePrevious() {
    if (previousSection) {
      playNextLesson();
      trigger(HapticType.LIGHT);
      router.push(
        getLessonPath(String(courseIdParam ?? ""), String(previousSection.id)) as Href
      );
    }
  }

  const darkModeScript = `(function() {
        function applyDarkMode() {
            if (${isDark}) {
                const container = document.querySelector('.bn-container');
                if (container) {
                    container.classList.add('dark');
                    container.setAttribute('data-color-scheme', 'dark');
                    document.documentElement.style.setProperty('--bn-colors-editor-text', '#FFFFFF');
                    document.documentElement.style.setProperty('--bn-colors-editor-background', '#111827');
                    document.documentElement.style.setProperty('--bn-colors-menu-text', '#F3F4F6');
                    document.documentElement.style.setProperty('--bn-colors-menu-background', '#1F2937');
                    document.documentElement.style.setProperty('--bn-colors-editor-border', '#374151');
                    
                    const style = document.createElement('style');
                    style.textContent = \`
                        body { 
                            background-color: #111827;
                            color: #FFFFFF;
                        }
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
                    \`;
                    document.head.appendChild(style);
                }
            }
        }

        function checkIfContentLoaded() {
            if (document.readyState === 'complete') {
                document.body.style.userSelect = 'none';
                applyDarkMode();

                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: "contentLoaded",
                        windowInnerHeight: window.innerHeight,
                        windowScrollY: window.scrollY,
                        documentBodyOffsetHeight: document.body.offsetHeight
                    }));
                } else {
                    window.parent.postMessage(JSON.stringify({
                        type: "contentLoaded",
                        windowInnerHeight: window.innerHeight,
                        windowScrollY: window.scrollY,
                        documentBodyOffsetHeight: document.body.offsetHeight
                    }), '*');
                }

                window.onscroll = function() {
                    if ((window.innerHeight + window.scrollY + 120) >= document.body.offsetHeight) {
                        const message = JSON.stringify({
                            type: "scrolledToEnd",
                            windowInnerHeight: window.innerHeight,
                            windowScrollY: window.scrollY,
                            documentBodyOffsetHeight: document.body.offsetHeight
                        });

                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(message);
                        } else {
                            window.parent.postMessage(message, '*');
                        }
                    }
                };
            } else {
                setTimeout(checkIfContentLoaded, 100);
            }
        }

        checkIfContentLoaded();

        function preloadImages() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                const src = img.getAttribute('src');
                if (src) {
                    const preloadLink = document.createElement('link');
                    preloadLink.rel = 'preload';
                    preloadLink.as = 'image';
                    preloadLink.href = src;
                    document.head.appendChild(preloadLink);
                }
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', preloadImages);
        } else {
            preloadImages();
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    applyDarkMode();
                    preloadImages();
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    })();`;

  const LoadingIndicator = () => (
    <View
      style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
    >
      <ActivityIndicator
        size="large"
        color={isDark ? "#6EE7B7" : "#65B741"}
      />
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            isDark && styles.progressBarDark,
            { width: `${loadingProgress * 100}%` },
          ]}
        />
      </View>
      <ThemedText style={styles.loadingText}>
        Chargement de la leçon...
      </ThemedText>
    </View>
  );

  const LockedContent = () => (
    <View
      style={[styles.lockedContainer, isDark && styles.lockedContainerDark]}
    >
      <MaterialCommunityIcons
        name="lock"
        size={64}
        color={isDark ? "#6EE7B7" : "#65B741"}
      />
      <ThemedText style={[styles.lockedTitle, isDark && styles.lockedTitleDark]}>
        Contenu verrouillé
      </ThemedText>
      <ThemedText
        style={[
          styles.lockedDescription,
          isDark && styles.lockedDescriptionDark,
        ]}
      >
        Cette leçon fait partie du contenu premium. Inscrivez-vous au programme
        pour accéder à toutes les leçons, quiz et exercices.
      </ThemedText>
      <Pressable
        style={[styles.purchaseButton, isDark && styles.purchaseButtonDark]}
        onPress={handlePurchaseFlow}
      >
        <MaterialCommunityIcons name="cart" size={20} color="#FFFFFF" />
        <ThemedText style={styles.purchaseButtonText}>
          S'inscrire au programme
        </ThemedText>
      </Pressable>
      <Pressable
        style={[
          styles.backToCourseButton,
          isDark && styles.backToCourseButtonDark,
        ]}
        onPress={() =>
          router.push(getCoursePath(String(courseIdParam ?? "")) as Href)
        }
      >
        <ThemedText
          style={[
            styles.backToCourseButtonText,
            isDark && styles.backToCourseButtonTextDark,
          ]}
        >
          Retour au cours
        </ThemedText>
      </Pressable>
    </View>
  );

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleMessage = (event: { data: string }) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "contentLoaded") {
            setIsListening(true);
            setIsWebViewLoaded(true);
          }
          if (isListening && data.type === "scrolledToEnd") {
            setScrolledToEnd(true);
          }
        } catch (error) {
          // Handle parse errors
          logger.error("Error parsing message from WebView:", error);
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [isListening]);

  // Show locked content if user is not enrolled and section is beyond first one
  if (isCurrentSectionLocked) {
    return <LockedContent />;
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable
          style={styles.backButton}
        onPress={() => {
          trigger(HapticType.LIGHT);
          router.push(getCoursePath(String(courseIdParam ?? "")) as Href);
        }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <ThemedText
              style={[styles.courseTitle, isDark && styles.courseTitleDark]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {category?.name}
            </ThemedText>
            <View
              style={[
                styles.enrollmentBadge,
                isEnrolled ? styles.enrolledBadge : styles.previewBadge,
              ]}
            >
              <MaterialCommunityIcons
                name={isEnrolled ? "check-circle" : "eye-outline"}
                size={14}
                color={isEnrolled ? "#10B981" : "#F59E0B"}
              />
              <ThemedText
                style={[
                  styles.enrollmentBadgeText,
                  isEnrolled
                    ? styles.enrolledBadgeText
                    : styles.previewBadgeText,
                ]}
              >
                {isEnrolled ? "Inscrit" : "Aperçu"}
              </ThemedText>
            </View>
          </View>
          <ThemedText
            style={[styles.courseInfo, isDark && styles.courseInfoDark]}
          >
            {course?.name && course.name.length > 15
              ? `${course.name.substring(0, 15)}...`
              : course?.name}{" "}
            • Section {currentIndex + 1}/{sections?.length}
          </ThemedText>
        </View>
      </View>

      <View style={styles.contentArea}>
        {!isWebViewLoaded && <LoadingIndicator />}
        <LessonContentViewer
          contentId={sectionIdParam ?? ""}
          isDark={isDark}
          baseUrl={webViewUrls?.course_url}
          session={session}
          webViewRef={webViewRef}
          isWebViewLoaded={isWebViewLoaded}
          darkModeScript={darkModeScript}
          isListening={isListening}
          onLoadProgress={setLoadingProgress}
          onWebViewLoaded={() => setIsWebViewLoaded(true)}
          onContentLoaded={() => setIsListening(true)}
          onScrolledToEnd={() => setScrolledToEnd(true)}
        />
      </View>

      <View style={[styles.navigationContainer, isDark && styles.navigationContainerDark]}>
        {previousSection && (
          <Pressable
            style={[styles.navigationButton, isDark && styles.navigationButtonDark]}
            onPress={handlePrevious}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
        )}

        <Pressable
          style={[styles.progressIndicator, isDark && styles.progressIndicatorDark]}
          onPress={() => {
            trigger(HapticType.LIGHT);
            setShowSectionList(true);
          }}
        >
          <ThemedText style={[styles.progressIndicatorText, isDark && styles.progressIndicatorTextDark]}>
            {currentIndex + 1}/{sections?.length || 0}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.navigationButton,
            isDark && styles.navigationButtonDark,
            (!scrolledToEnd && progress?.progress !== 1 && Platform.OS !== 'web' && !isCurrentSectionLocked) && styles.disabledButton,
            (!scrolledToEnd && progress?.progress !== 1 && Platform.OS !== 'web' && !isCurrentSectionLocked && isDark) && styles.disabledButtonDark,
            isNextSectionLocked && styles.lockedNextButton,
            isNextSectionLocked && isDark && styles.lockedNextButtonDark,
          ]}
          onPress={() => handleNext()}
          disabled={!scrolledToEnd && progress?.progress !== 1 && Platform.OS !== 'web' && !isCurrentSectionLocked && !isNextSectionLocked}
        >
          <MaterialCommunityIcons
            name={isNextSectionLocked ? "lock" : (nextSection ? "arrow-right" : "check")}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {/* Sections List Modal */}
      <Modal
        visible={showSectionList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSectionList(false)}
      >
        <View style={styles.sectionListModal}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
              <ThemedText style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                Sections du cours
              </ThemedText>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowSectionList(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={isDark ? "#FFFFFF" : "#111827"}
                />
              </Pressable>
            </View>

            <FlatList
              data={sections}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => {
                const isCurrentSection = item.id === Number(sectionIdParam ?? 0);
                const sectionProgress = sectionsProgress?.find(
                  (sp) => sp.sectionid === item.id
                );
                const isCompleted = sectionProgress?.progress === 1;
                const isSectionLocked = !isEnrolled && index >= 1;

                return (
                  <TouchableOpacity
                    style={[
                      styles.sectionItem,
                      isDark && styles.sectionItemDark,
                      isCurrentSection && styles.sectionItemActive,
                      isCurrentSection && isDark && styles.sectionItemActiveDark,
                      isCompleted && styles.sectionItemCompleted,
                      isCompleted && isDark && styles.sectionItemCompletedDark,
                      isSectionLocked && styles.sectionItemLocked,
                      isSectionLocked && isDark && styles.sectionItemLockedDark,
                    ]}
                    onPress={() => {
                      if (isSectionLocked) {
                        handlePurchaseFlow();
                        return;
                      }
                      trigger(HapticType.LIGHT);
                      setShowSectionList(false);
                      router.push(
                        getLessonPath(String(courseIdParam ?? ""), String(item.id)) as Href
                      );
                    }}
                    disabled={isSectionLocked}
                  >
                    <View
                      style={[
                        styles.sectionNumber,
                        isDark && styles.sectionNumberDark,
                        isCurrentSection && styles.sectionNumberActive,
                        isCompleted && styles.sectionNumberCompleted,
                        isSectionLocked && styles.sectionNumberLocked,
                      ]}
                    >
                      {isSectionLocked ? (
                        <MaterialCommunityIcons
                          name="lock"
                          size={12}
                          color="#F59E0B"
                        />
                      ) : (
                        <Text
                          style={[
                            styles.sectionNumberText,
                            (isCurrentSection || isCompleted) &&
                              styles.sectionNumberTextActive,
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <ThemedText
                      style={[
                        styles.sectionName,
                        isDark && styles.sectionNameDark,
                        isCurrentSection && styles.sectionNameActive,
                        isCurrentSection && isDark && styles.sectionNameActiveDark,
                        isSectionLocked && styles.sectionNameLocked,
                        isSectionLocked && isDark && styles.sectionNameLockedDark,
                      ]}
                    >
                      {item.name}
                    </ThemedText>
                    {isCompleted && !isSectionLocked ? (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={isDark ? "#10B981" : "#059669"}
                      />
                    ) : isSectionLocked ? (
                      <MaterialCommunityIcons
                        name="lock"
                        size={16}
                        color="#F59E0B"
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
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
    marginBottom: 60,
  },
  containerDark: {
    backgroundColor: "#111827",
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  courseTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  courseTitleDark: {
    color: "#FFFFFF",
  },
  courseInfo: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
  },
  courseInfoDark: {
    color: "#9CA3AF",
  },
  enrollmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enrolledBadge: {
    backgroundColor: '#DCFCE7',
  },
  enrolledBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  previewBadge: {
    backgroundColor: '#FEF3C7',
  },
  previewBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  enrollmentBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  contentArea: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    zIndex: 10,
  },
  loadingContainerDark: {
    backgroundColor: "#111827",
  },
  progressBarContainer: {
    width: "80%",
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#65B741",
  },
  progressBarDark: {
    backgroundColor: "#059669",
  },
  loadingText: {
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
  },
  navigationContainer: {
    flexDirection: "row",
    paddingBottom: Platform.OS === "ios" ? 30 : 30,
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
  lockedNextButton: {
    backgroundColor: "#F59E0B",
  },
  lockedNextButtonDark: {
    backgroundColor: "#D97706",
  },
  progressIndicator: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  progressIndicatorDark: {
    backgroundColor: "#374151",
    borderColor: "#4B5563",
  },
  progressIndicatorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  progressIndicatorTextDark: {
    color: "#E5E7EB",
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
  },
  lockedContainerDark: {
    backgroundColor: "#111827",
  },
  lockedTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  lockedTitleDark: {
    color: "#FFFFFF",
  },
  lockedDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: "80%",
  },
  lockedDescriptionDark: {
    color: "#9CA3AF",
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  purchaseButtonDark: {
    backgroundColor: "#059669",
  },
  purchaseButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  backToCourseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  backToCourseButtonDark: {
    borderColor: "#4B5563",
  },
  backToCourseButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  backToCourseButtonTextDark: {
    color: "#9CA3AF",
  },
  sectionListModal: {
    flex: 1,
    margin: 0,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    maxHeight: "70%",
  },
  modalContentDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalHeaderDark: {
    borderBottomColor: "#374151",
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalTitleDark: {
    color: "#FFFFFF",
  },
  closeButton: {
    padding: 8,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionItemDark: {
    borderBottomColor: "#374151",
  },
  sectionItemActive: {
    backgroundColor: "#F9FAFB",
  },
  sectionItemActiveDark: {
    backgroundColor: "#374151",
  },
  sectionItemCompleted: {
    backgroundColor: "#F0FDF4",
  },
  sectionItemCompletedDark: {
    backgroundColor: "#064E3B",
  },
  sectionItemLocked: {
    backgroundColor: "#FEF3C7",
    opacity: 0.7,
  },
  sectionItemLockedDark: {
    backgroundColor: "#78350F",
    opacity: 0.8,
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionNumberActive: {
    backgroundColor: "#65B741",
  },
  sectionNumberCompleted: {
    backgroundColor: "#10B981",
  },
  sectionNumberLocked: {
    backgroundColor: "#FEF3C7",
  },
  sectionNumberDark: {
    backgroundColor: "#4B5563",
  },
  sectionNumberText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  sectionNumberTextActive: {
    color: "#FFFFFF",
  },
  sectionName: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    flex: 1,
    color: "#4B5563",
  },
  sectionNameDark: {
    color: "#E5E7EB",
  },
  sectionNameActive: {
    color: "#111827",
    fontWeight: "600",
  },
  sectionNameActiveDark: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  sectionNameLocked: {
    color: "#92400E",
    fontStyle: "italic",
  },
  sectionNameLockedDark: {
    color: "#F59E0B",
    fontStyle: "italic",
  },
});

export default SecondarySectionDetail;




