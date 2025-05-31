import React from "react";
import {Image, Pressable, StyleSheet, View} from "react-native";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {theme} from "@/constants/theme";
import {useCourseProgress} from "@/hooks/useCourseProgress";
import {HapticType, useHaptics} from "@/hooks/useHaptics";

interface CourseRowItemProps {
    courseItem: any;
    pdId: string;
    isDark: boolean;
    isEnrolled?: boolean;
}

const CourseRowItem: React.FC<CourseRowItemProps> = ({courseItem, pdId, isDark, isEnrolled = false}) => {
    const router = useRouter();
    const sections = courseItem.course?.courses_content?.length || 0;
    const videos = courseItem.course?.course_videos?.length || 0;
    const {progress} = useCourseProgress(courseItem.course?.id);
    const {trigger} = useHaptics();

    return (
        <Pressable
            style={[styles.courseItem, isDark && styles.courseItemDark]}
            onPress={() => {
                trigger(HapticType.SELECTION);

                router.push(`/(app)/learn/${pdId}/courses/${courseItem.course?.id}`)
            }
            }
        >
            <View style={styles.courseContent}>
                <View style={styles.courseHeader}>
                    <View
                        style={[
                            progress?.is_completed ? styles.courseIcon : styles.courseIconIncomplete,
                            isDark && (progress?.is_completed ? styles.courseIconDark : styles.courseIconIncompleteDark)
                        ]}
                    >
                        {
                            !progress?.is_completed ? (
                                courseItem.course.category?.icon ? (
                                    <Image
                                        source={{uri: courseItem.course.category?.icon}}
                                        style={styles.categoryIconImage}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name="book"
                                        size={24}
                                        color={isDark ? "#9CA3AF" : theme.color.gray[600]}
                                    />

                                )


                            ) : (
                                <MaterialCommunityIcons
                                    name="check"
                                    size={24}
                                    color={isDark ? "#6EE7B7" : "#4CAF50"}
                                />

                            )
                        }
                        {/*<Image*/}
                        {/*    source={{ uri: courseItem.course.category?.icon }}*/}
                        {/*    style={styles.categoryIconImage}*/}
                        {/*    resizeMode="contain"*/}
                        {/*/>*/}

                        {/*<MaterialCommunityIcons*/}
                        {/*    name={progress?.is_completed ? "check" : "book"}*/}
                        {/*    size={24}*/}
                        {/*    color={*/}
                        {/*        progress?.is_completed */}
                        {/*            ? (isDark ? "#6EE7B7" : "#4CAF50") */}
                        {/*            : (isDark ? "#9CA3AF" : theme.color.gray[600])*/}
                        {/*    }*/}
                        {/*/>*/}
                    </View>
                    <View style={styles.courseTitleContainer}>
                        <ThemedText
                            style={[styles.courseTitle, isDark && styles.courseTitleDark]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {courseItem.course?.name}
                        </ThemedText>
                        <View style={styles.courseMetricsContainer}>
                            <ThemedText style={[styles.courseMetrics, isDark && styles.courseMetricsDark]}>
                                {courseItem.course?.category?.name} • {sections} sections • {videos} vidéos
                            </ThemedText>
                            {!isEnrolled && (
                                <View style={[styles.previewBadge, isDark && styles.previewBadgeDark]}>
                                    <MaterialCommunityIcons
                                        name="eye-outline"
                                        size={12}
                                        color="#FFFFFF"
                                    />
                                    <ThemedText style={styles.previewText}>Aperçu</ThemedText>
                                </View>
                            )}
                        </View>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={isDark ? "#6B7280" : "#9CA3AF"}
                    />
                </View>

                <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                    <View
                        style={[
                            styles.progressFill,
                            isDark && styles.progressFillDark,
                            {width: progress?.progress_percentage !== undefined ? `${progress.progress_percentage}%` : 0}
                        ]}
                    />
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    courseItem: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    courseItemDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    courseMetricsContainer: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    previewBadgeDark: {
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
    },
    previewText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 2,
    },
    courseContent: {
        padding: 16,
    },
    courseHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    courseIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#E8F5E9",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    courseIconDark: {
        backgroundColor: "rgba(110, 231, 183, 0.1)", // Matching the green theme in dark mode
    },
    courseIconIncomplete: {
        width: 40,
        height: 40,
        backgroundColor: theme.color.gray[200],
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    courseIconIncompleteDark: {
        backgroundColor: "#374151",
    },
    courseTitleContainer: {
        flex: 1,
    },
    courseTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: "500",
        color: "#111827",
        marginBottom: 4,
        flexShrink: 1,
    },
    courseTitleDark: {
        color: "#FFFFFF",
    },
    courseMetrics: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: "#6B7280",
    },
    courseMetricsDark: {
        color: "#9CA3AF",
    },
    categoryIconImage: {
        width: 24,
        height: 24,
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 12,
    },
    progressBarDark: {
        backgroundColor: "#374151",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#65B741",
        borderRadius: 2,
    },
    progressFillDark: {
        backgroundColor: "#059669",
    }
});

export default CourseRowItem;
