import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { theme } from "@/constants/theme";

interface CourseRowItemSkeletonProps {
    isDark: boolean;
    shimmerAnim: Animated.Value;
}

const CourseRowItemSkeleton: React.FC<CourseRowItemSkeletonProps> = ({ isDark, shimmerAnim }) => {
    return (
        <View style={[styles.courseItem, isDark && styles.courseItemDark]}>
            <View style={styles.courseContent}>
                <View style={styles.courseHeader}>
                    <Animated.View
                        style={[
                            styles.courseIconIncomplete,
                            isDark && styles.courseIconIncompleteDark,
                            {
                                backgroundColor: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: isDark
                                        ? ['#374151', '#4B5563']
                                        : [theme.color.gray[200], theme.color.gray[300]]
                                })
                            }
                        ]}
                    />
                    <View style={styles.courseTitleContainer}>
                        <Animated.View
                            style={{
                                height: 16,
                                width: '80%',
                                marginBottom: 8,
                                borderRadius: 4,
                                backgroundColor: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: isDark
                                        ? ['#374151', '#4B5563']
                                        : ['#E5E7EB', '#F3F4F6']
                                })
                            }}
                        />
                        <Animated.View
                            style={{
                                height: 12,
                                width: '60%',
                                borderRadius: 4,
                                backgroundColor: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: isDark
                                        ? ['#374151', '#4B5563']
                                        : ['#E5E7EB', '#F3F4F6']
                                })
                            }}
                        />
                    </View>
                </View>

                <Animated.View
                    style={[
                        styles.progressBar,
                        isDark && styles.progressBarDark,
                        {
                            backgroundColor: shimmerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: isDark
                                    ? ['#374151', '#4B5563']
                                    : ['#E5E7EB', '#F3F4F6']
                            })
                        }
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.progressFill,
                            isDark && styles.progressFillDark,
                            {
                                width: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['10%', '40%']
                                }),
                                backgroundColor: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: isDark
                                        ? ['#059669', '#10B981']
                                        : ['#65B741', '#8BC34A']
                                })
                            }
                        ]}
                    />
                </Animated.View>
            </View>
        </View>
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
        backgroundColor: "rgba(110, 231, 183, 0.1)",
    },
    courseIconIncomplete: {
        width: 40,
        height: 40,
        backgroundColor: theme.color.gray[200],
        borderRadius: 8,
        marginRight: 12,
    },
    courseIconIncompleteDark: {
        backgroundColor: "#374151",
    },
    courseTitleContainer: {
        flex: 1,
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

export default CourseRowItemSkeleton;