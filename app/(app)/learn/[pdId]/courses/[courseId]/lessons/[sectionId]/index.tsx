import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
    Text,
    Platform,
    Modal,
    FlatList,
    TouchableOpacity,
    Dimensions
} from "react-native";
import React, {useEffect, useState, useRef} from "react";
import {useLocalSearchParams, useRouter} from "expo-router";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import useSWR, { mutate as globalMutate } from "swr";
import {supabase} from "@/lib/supabase";
import {WebView} from "react-native-webview";
import {useAuth} from "@/contexts/auth";
import {useCourseProgress} from "@/hooks/useCourseProgress";
import {useColorScheme} from "@/hooks/useColorScheme";
import {Courses, CoursesContent} from "@/types/type";
import {useSound} from "@/hooks/useSound";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import PreloadWebView from "@/components/shared/learn/WebViewCourrseSection";
import {programProgressKeys} from "@/constants/swr-path";
import {theme} from "@/constants/theme";
import {useUser} from "@/contexts/useUserInfo";

interface Course extends Courses {
    courses_content: CoursesContent[];
}

const SectionDetail = () => {
    const router = useRouter();
    const {sectionId, courseId, pdId} = useLocalSearchParams();
    const {session} = useAuth();
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
    const [showSectionList, setShowSectionList] = useState(false);
    const webViewRef = useRef(null);
    const {user} = useAuth();

    // Check if user is enrolled in this program
    const { isLearningPathEnrolled } = useUser();
    const isEnrolled = isLearningPathEnrolled(pdId);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { playNextLesson, playCorrect } = useSound();
    const { trigger } = useHaptics();

    const {markSectionComplete, sectionsProgress, updateLastAccessed, refreshProgress} = useCourseProgress(
        Number(courseId)
    );

    useEffect(() => {
        updateLastAccessed(Number(sectionId))
    }, [sectionId]);

    const progress = sectionsProgress?.find(
        (section) => section.sectionid == Number(sectionId)
    );

    // Use prefetching for category data with SWR
    const {
        data: category,
        error: categoryError,
        isLoading: categoryLoading,
        mutate: mutateC,
    } = useSWR(
        sectionId ? `content-${sectionId}` : null,
        async () => {
            const {data} = await supabase
                .from("courses_content")
                .select("id, name, order, courseId, courses(name)")
                .eq("id", sectionId)
                .order("order", {ascending: true})
                .single();
            return data;
        },
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            dedupingInterval: 60000, // 1 minute
        }
    );

    // Optimized course data query with SWR
    const {
        data: course,
        error: courseError,
        isLoading: courseLoading,
        mutate,
    } = useSWR<Course | null>(
        courseId ? `course-section-${courseId}` : null,
        async () => {
            const {data} = await supabase
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
        },
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            dedupingInterval: 60000, // 1 minute
        }
    );

    useEffect(() => {
        mutate();
        mutateC();
        globalMutate(["courseProgress", user?.id, courseId]);
        globalMutate(["sectionsProgress", user?.id, courseId]);
        globalMutate(programProgressKeys.all());
        refreshProgress()
    }, [courseId, sectionId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsListening(true);
        }, 3000); // Reduced from 10 seconds to 3 seconds

        return () => clearTimeout(timer);
    }, []);

    // Find current, previous, and next sections
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

    // Check if current section is locked (beyond first 2 for non-enrolled users)
    const isCurrentSectionLocked = !isEnrolled && currentIndex >= 1;

    // Check if next section is locked
    const isNextSectionLocked = !isEnrolled && nextSection &&
        (sections?.findIndex((section) => section.id === nextSection.id) ?? -1) >= 1;

    // Handle purchase flow
    const handlePurchaseFlow = () => {
        trigger(HapticType.SELECTION);
        router.push({
            pathname : `/(app)/(catalogue)/shop`,
            params : {
                selectedProgramId : pdId,
            }
        });
    };

    // Preload next section data directly into SWR cache
    useEffect(() => {
        if (nextSection && nextSection.id && !isNextSectionLocked) {
            // Prefetch next section data and store it in SWR cache
            const fetchAndCacheNextSection = async () => {
                try {
                    const { data } = await supabase
                        .from("courses_content")
                        .select("id, name, order, courseId, courses(name)")
                        .eq("id", nextSection.id)
                        .order("order", {ascending: true})
                        .single();

                    if (data) {
                        // Set the data in the SWR cache for the next section
                        globalMutate(`content-${nextSection.id}`, data, false);
                    }
                } catch (error) {
                    // Silently handle errors to not disrupt the user experience
                }
            };

            fetchAndCacheNextSection();
        }
    }, [nextSection, isNextSectionLocked]);

    function handleNext() {
        // Check if next section is locked
        if (isNextSectionLocked) {
            handlePurchaseFlow();
            return;
        }

        // Skip the scrolledToEnd check for web platform
        const shouldCheckScroll = Platform.OS !== 'web';

        if (shouldCheckScroll && !scrolledToEnd && progress?.progress !== 1) {
            // Optionally, show a message to the user indicating they need to scroll to the end
            return;
        }

        if (progress?.progress !== 1) {
            markSectionComplete(Number(sectionId));
        } else if (progress === undefined) {
            markSectionComplete(Number(sectionId));
        }

        // Global mutations for course progress
        if (user?.id) {
            globalMutate(["courseProgress", user.id, courseId]);
            globalMutate(["sectionsProgress", user.id, courseId]);
        }

        setTimeout(() => {
            refreshProgress();
        }, 1000);

        if (nextSection) {
            playNextLesson();
            trigger(HapticType.LIGHT);
            router.push(
                `/(app)/learn/${pdId}/courses/${courseId}/lessons/${nextSection.id}`
            );
        } else {
            playCorrect();
            trigger(HapticType.LIGHT);
            router.push(`/(app)/learn/${pdId}/courses/${courseId}`);
        }
    }

    function handlePrevious() {
        if (previousSection) {
            playNextLesson();
            trigger(HapticType.LIGHT);
            router.push(
                `/(app)/learn/${pdId}/courses/${courseId}/lessons/${previousSection.id}`
            );
        }
    }

    // Enhanced dark mode script for better iframe integration
    const darkModeScript = `(function() {
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
                
                // Send a message immediately to tell React Native the content is loaded
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: "contentLoaded",
                        windowInnerHeight: window.innerHeight,
                        windowScrollY: window.scrollY,
                        documentBodyOffsetHeight: document.body.offsetHeight
                    }));
                } else {
                    // For web platform
                    window.parent.postMessage(JSON.stringify({
                        type: "contentLoaded",
                        windowInnerHeight: window.innerHeight,
                        windowScrollY: window.scrollY,
                        documentBodyOffsetHeight: document.body.offsetHeight
                    }), '*');
                }
                
                // Setup scroll event handling
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
                            // For web platform
                            window.parent.postMessage(message, '*');
                        }
                    }
                };
            } else {
                setTimeout(checkIfContentLoaded, 100);
            }
        }

        // Initialize checks immediately
        checkIfContentLoaded();

        // Preload images to improve rendering speed
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

        // Preload images once DOM is loaded
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

    // Custom loading indicator component with progress
    const LoadingIndicator = () => (
        <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
            <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#65B741"} />
            <View style={styles.progressBarContainer}>
                <View
                    style={[
                        styles.progressBar,
                        isDark && styles.progressBarDark,
                        { width: `${loadingProgress * 100}%` }
                    ]}
                />
            </View>
            <ThemedText style={styles.loadingText}>
                Chargement de la leçon...
            </ThemedText>
        </View>
    );

    // Locked Content Component
    const LockedContent = () => (
        <View style={[styles.lockedContainer, isDark && styles.lockedContainerDark]}>
            <MaterialCommunityIcons
                name="lock"
                size={64}
                color={isDark ? "#6EE7B7" : "#65B741"}
            />
            <ThemedText style={[styles.lockedTitle, isDark && styles.lockedTitleDark]}>
                Contenu verrouillé
            </ThemedText>
            <ThemedText style={[styles.lockedDescription, isDark && styles.lockedDescriptionDark]}>
                Cette leçon fait partie du contenu premium. Inscrivez-vous au programme pour accéder à toutes les leçons, quiz et exercices.
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
                style={[styles.backToCourseButton, isDark && styles.backToCourseButtonDark]}
                onPress={() => router.push(`/(app)/learn/${pdId}/courses/${courseId}`)}
            >
                <ThemedText style={[styles.backToCourseButtonText, isDark && styles.backToCourseButtonTextDark]}>
                    Retour au cours
                </ThemedText>
            </Pressable>
        </View>
    );

    // Add message listener for web platform
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleMessage = (event: { data: string; }) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "contentLoaded") {
                        setIsListening(true);
                        setIsWebViewLoaded(true);
                    }
                    if (isListening && data.type === "scrolledToEnd") {
                        setScrolledToEnd(true);
                    }
                } catch (e) {
                    // Ignore malformed messages
                }
            };

            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }
    }, [isListening]);

    // Loading state check
    if (typeof isEnrolled === 'undefined' || categoryLoading || courseLoading) {
        return <LoadingIndicator />;
    }

    if (categoryError || courseError) {
        return (
            <View style={[styles.errorContainer, isDark && styles.errorContainerDark]}>
                <ThemedText style={styles.errorText}>
                    Une erreur s'est produite lors du chargement de la catégorie ou du
                    cours.
                </ThemedText>
            </View>
        );
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
                    <View style={styles.headerTitleRow}>
                        <ThemedText
                            style={[styles.courseTitle, isDark && styles.courseTitleDark]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {category?.name}
                        </ThemedText>
                        {/* Enrollment badge */}
                        <View style={[
                            styles.enrollmentBadge,
                            isEnrolled ? styles.enrolledBadge : styles.previewBadge
                        ]}>
                            <MaterialCommunityIcons
                                name={isEnrolled ? "check-circle" : "eye-outline"}
                                size={14}
                                color={isEnrolled ? "#10B981" : "#F59E0B"}
                            />
                            <ThemedText style={[
                                styles.enrollmentBadgeText,
                                isEnrolled ? styles.enrolledBadgeText : styles.previewBadgeText
                            ]}>
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

            {/* Content Area */}
            {isCurrentSectionLocked ? (
                <LockedContent />
            ) : (
                <>
                    {/* Conditional rendering for web and mobile platforms */}
                    {!isWebViewLoaded && <LoadingIndicator />}

                    {Platform.OS === 'web' ? (
                        <View style={styles.webViewContainer}>
                            <iframe
                                src={`https://elearn.ezadrive.com/fr/webview/courseContent/${sectionId}${isDark ? '?theme=dark' : '?theme=light'}&device=web`}
                                style={{
                                    width: Dimensions.get("window").width >= 640 ? '100%' : '117%',
                                    left: Dimensions.get("window").width  >= 640 ? 0 : "-8%",
                                    position: Dimensions.get("window").width  >= 640 ? 'relative' : 'absolute',
                                    height: '100%',
                                    border: 'none',
                                    backgroundColor: isDark ? "#111827" : '#FFFFFF',
                                }}
                                onLoad={() => {
                                    setIsWebViewLoaded(true);
                                    setLoadingProgress(1);
                                }}
                            />
                        </View>
                    ) : (
                        <WebView
                            ref={webViewRef}
                            source={{
                                uri: `https://elearn.ezadrive.com/fr/webview/courseContent/${sectionId}?theme=${
                                    isDark ? "dark" : "light"
                                }`,
                                headers: {
                                    Authorization: `Bearer ${session?.access_token}`,
                                    "color-scheme": isDark ? "dark" : "light",
                                },
                            }}
                            style={[
                                styles.webView,
                                isDark && styles.webViewDark,
                                !isWebViewLoaded && styles.hiddenWebView
                            ]}
                            originWhitelist={["*"]}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            cacheEnabled={true}
                            cacheMode="LOAD_CACHE_ELSE_NETWORK"
                            onShouldStartLoadWithRequest={() => true}
                            startInLoadingState={true}
                            onLoadProgress={({ nativeEvent }) => {
                                setLoadingProgress(nativeEvent.progress);
                            }}
                            onLoadEnd={() => {
                                setIsWebViewLoaded(true);
                            }}
                            renderLoading={() => <View />} // Empty view since we handle loading UI ourselves
                            injectedJavaScript={darkModeScript}
                            onMessage={(event) => {
                                const data = JSON.parse(event.nativeEvent.data);
                                if (data.type === "contentLoaded") {
                                    setIsListening(true);
                                }
                                if (isListening && data.type === "scrolledToEnd") {
                                    setScrolledToEnd(true);
                                }
                            }}
                        />
                    )}
                </>
            )}

            <View style={[styles.navigationContainer, isDark && styles.navigationContainerDark]}>
                {previousSection && (
                    <Pressable
                        style={[styles.navigationButton, isDark && styles.navigationButtonDark]}
                        onPress={handlePrevious}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </Pressable>
                )}

                {/* Section Progress Indicator */}
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

            {/* Preload next section - only on mobile and if not locked */}
            {Platform.OS !== 'web' && nextSection && !isNextSectionLocked && (
                <PreloadWebView
                    uri={`https://elearn.ezadrive.com/webview/courseContent/${nextSection.id}?theme=${isDark ? "dark" : "light"}`}
                    accessToken={session?.access_token}
                    isDark={isDark}
                />
            )}

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
                                const isCurrentSection = item.id == Number(sectionId);
                                const sectionProgress = sectionsProgress?.find(
                                    (sp) => sp.sectionid == item.id
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
                                                `/(app)/learn/${pdId}/courses/${courseId}/lessons/${item.id}`
                                            );
                                        }}
                                        disabled={isSectionLocked}
                                    >
                                        <View style={[
                                            styles.sectionNumber,
                                            isDark && styles.sectionNumberDark,
                                            isCurrentSection && styles.sectionNumberActive,
                                            isCompleted && styles.sectionNumberCompleted,
                                            isSectionLocked && styles.sectionNumberLocked,
                                        ]}>
                                            {isSectionLocked ? (
                                                <MaterialCommunityIcons
                                                    name="lock"
                                                    size={12}
                                                    color="#F59E0B"
                                                />
                                            ) : (
                                                <Text style={[
                                                    styles.sectionNumberText,
                                                    (isCurrentSection || isCompleted) && styles.sectionNumberTextActive,
                                                ]}>
                                                    {index + 1}
                                                </Text>
                                            )}
                                        </View>
                                        <ThemedText style={[
                                            styles.sectionName,
                                            isDark && styles.sectionNameDark,
                                            isCurrentSection && styles.sectionNameActive,
                                            isCurrentSection && isDark && styles.sectionNameActiveDark,
                                            isSectionLocked && styles.sectionNameLocked,
                                            isSectionLocked && isDark && styles.sectionNameLockedDark,
                                        ]}>
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
    // Locked Content Styles
    lockedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#F9FAFB',
    },
    lockedContainerDark: {
        backgroundColor: '#111827',
    },
    lockedTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    lockedTitleDark: {
        color: '#FFFFFF',
    },
    lockedDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        maxWidth: '80%',
    },
    lockedDescriptionDark: {
        color: '#9CA3AF',
    },
    purchaseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    purchaseButtonDark: {
        backgroundColor: '#059669',
    },
    purchaseButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    backToCourseButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    backToCourseButtonDark: {
        borderColor: '#4B5563',
    },
    backToCourseButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    backToCourseButtonTextDark: {
        color: '#9CA3AF',
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
    sectionListModal: {
        flex: 1,
        margin: 0,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopColor: "#E5E7EB",
        borderWidth: 1,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
        maxHeight: '70%',
    },
    modalContentDark: {
        backgroundColor: '#1F2937',
        borderColor: "#374151",
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalHeaderDark: {
        borderBottomColor: '#374151',
    },
    modalTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalTitleDark: {
        color: '#FFFFFF',
    },
    closeButton: {
        padding: 8,
    },
    sectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sectionItemDark: {
        borderBottomColor: '#374151',
    },
    sectionItemActive: {
        backgroundColor: '#F9FAFB',
    },
    sectionItemActiveDark: {
        backgroundColor: '#374151',
    },
    sectionItemCompleted: {
        backgroundColor: '#F0FDF4',
    },
    sectionItemCompletedDark: {
        backgroundColor: '#064E3B',
    },
    sectionItemLocked: {
        backgroundColor: '#FEF3C7',
        opacity: 0.7,
    },
    sectionItemLockedDark: {
        backgroundColor: '#78350F',
        opacity: 0.8,
    },
    sectionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionNumberActive: {
        backgroundColor: '#65B741',
    },
    sectionNumberCompleted: {
        backgroundColor: '#10B981',
    },
    sectionNumberLocked: {
        backgroundColor: '#FEF3C7',
    },
    sectionNumberDark: {
        backgroundColor: '#4B5563',
    },
    sectionNumberText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    sectionNumberTextActive: {
        color: '#FFFFFF',
    },
    sectionName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        flex: 1,
        color: '#4B5563',
    },
    sectionNameDark: {
        color: '#E5E7EB',
    },
    sectionNameActive: {
        color: '#111827',
        fontWeight: '600',
    },
    sectionNameActiveDark: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    sectionNameLocked: {
        color: '#92400E',
        fontStyle: 'italic',
    },
    sectionNameLockedDark: {
        color: '#F59E0B',
        fontStyle: 'italic',
    },
    loadingContainer: {
        position: 'absolute',
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
    loadingText: {
        marginTop: 16,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#4B5563",
    },
    progressBarContainer: {
        width: '70%',
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginTop: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#65B741',
    },
    progressBarDark: {
        backgroundColor: '#6EE7B7',
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
    webViewContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF",
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
    hiddenWebView: {
        opacity: 0, // Hide the WebView while it's loading
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
    navigationButtonText: {
        color: "#FFFFFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        marginLeft: 8,
        marginRight: 8,
    },
});

export default SectionDetail;