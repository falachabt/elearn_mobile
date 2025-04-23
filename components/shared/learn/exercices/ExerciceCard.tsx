import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/components/shared/learn/CategoryFilter";

// Match this interface with the actual data structure from the API
interface ExerciseCardProps {
    exercise: {
        id: string | number;
        title: string;
        description: string;
        is_pinned: boolean;
        is_completed: boolean;
        created_at?: string;
        course_id?: number;
        course?: {
            name: string;
            category?: string;
            courses_categories?: {
                name: string;
                description: string;
            };
        };
        exercices_pin?: Array<any>;
        exercices_complete?: Array<any>;
    };
    onPress: (exercise: any) => void;
    onPinPress: (e: any) => Promise<void>;
    onCompletePress: (e: any) => Promise<void>;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
                                                       exercise,
                                                       onPress,
                                                       onPinPress,
                                                       onCompletePress
                                                   }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Get category name or default if not available
    const categoryName = exercise.course?.courses_categories?.name || "default";

    // Get category color or default to primary color
    const categoryColor = CATEGORY_COLORS[categoryName] || theme.color.primary[500];

    // Get category icon or default to book-education
    const categoryIcon = CATEGORY_ICONS[categoryName] || "book-education";

    // Calculate background color for category tag based on theme
    const getCategoryTagBackground = () => {
        if (isDark) {
            // For dark mode, create a darker version of the category color with low opacity
            return `${categoryColor}30`; // 30 = 19% opacity
        } else {
            // For light mode, create a lighter version of the category color with low opacity
            return `${categoryColor}15`; // 15 = 8% opacity
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? theme.color.dark.background.secondary : "#FFFFFF",
                    borderColor: categoryColor,
                    borderLeftWidth: 4,
                },
            ]}
            activeOpacity={0.7}
            onPress={() => onPress(exercise)}
        >
            {/* Status indicators row */}
            <View style={styles.statusRow}>
                <View
                    style={[
                        styles.categoryTag,
                        {
                            backgroundColor: getCategoryTagBackground(),
                        },
                    ]}
                >
                    <MaterialCommunityIcons
                        // @ts-ignore - we know this could potentially have an invalid icon name, but it's handled
                        name={categoryIcon}
                        size={14}
                        color={categoryColor}
                        style={styles.categoryIcon}
                    />
                    <Text
                        style={[
                            styles.categoryText,
                            { color: categoryColor },
                        ]}
                    >
                        {categoryName}
                    </Text>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        onPress={onPinPress}
                        style={styles.actionButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons
                            name={exercise.is_pinned ? "pin" : "pin-outline"}
                            size={18}
                            color={
                                exercise.is_pinned
                                    ? "#FFC107"
                                    : isDark
                                        ? theme.color.gray[400]
                                        : theme.color.gray[600]
                            }
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onCompletePress}
                        style={styles.actionButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons
                            name={
                                exercise.is_completed
                                    ? "check-circle"
                                    : "check-circle-outline"
                            }
                            size={18}
                            color={
                                exercise.is_completed
                                    ? theme.color.primary[500]
                                    : isDark
                                        ? theme.color.gray[400]
                                        : theme.color.gray[600]
                            }
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main content */}
            <View style={styles.contentContainer}>
                <Text
                    style={[
                        styles.title,
                        isDark && styles.titleDark
                    ]}
                    numberOfLines={2}
                >
                    {exercise.title}
                </Text>

                <Text
                    style={[
                        styles.description,
                        isDark && styles.descriptionDark
                    ]}
                    numberOfLines={2}
                >
                    {exercise.description}
                </Text>

                <Text
                    style={[
                        styles.courseName,
                        isDark && styles.courseNameDark
                    ]}
                >
                    {exercise.course?.name}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        overflow: "hidden",
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    contentContainer: {
        padding: 16,
        paddingTop: 8,
    },
    categoryTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
    },
    categoryIcon: {
        marginRight: 4,
    },
    categoryText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        fontWeight: "600",
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        padding: 6,
    },
    title: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: "700",
        marginBottom: 6,
        color: "#1A1A1A",
    },
    titleDark: {
        color: "#FFFFFF",
    },
    description: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        lineHeight: 20,
        color: "#666666",
        marginBottom: 8,
    },
    descriptionDark: {
        color: "#BBBBBB",
    },
    courseName: {
        fontFamily : theme.typography.fontFamily,
fontSize: 13,
        color: "#888888",
        fontWeight: "500",
    },
    courseNameDark: {
        color: "#AAAAAA",
    }
});

export default ExerciseCard;