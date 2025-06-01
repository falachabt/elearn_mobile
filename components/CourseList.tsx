import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import CourseRowItem from "./shared/CourseRowItem";
import { ThemedText } from "@/components/ThemedText";
import {theme} from "@/constants/theme";

// Define proper TypeScript interfaces for our data
interface Category {
    id?: number;
    name: string;
    icon?: string;
}

interface CourseContent {
    id: number;
    name: string;
    order: number;
}

interface CourseVideo {
    id: number;
}

interface Course {
    id: number;
    name: string;
    category?: Category;
    courses_content?: CourseContent[];
    course_videos?: CourseVideo[];
    goals?: string[];
}

interface CourseItem {
    id?: number;
    lpId?: string;
    course: Course;
    order_index?: number;
}

interface CourseListProps {
    courses: CourseItem[];
    pdId: string;
    onCoursePress?: (courseItem: CourseItem) => void;
    emptyMessage?: string;
    isEnrolled?: boolean;
}

/**
 * CourseList component that displays courses in a vertical list format
 * This optimized version assumes data fetching, category filtering, and search
 * happens in the parent component.
 */
const CourseList: React.FC<CourseListProps> = ({
                                                   courses,
                                                   pdId,
                                                   onCoursePress,
                                                   emptyMessage = "Aucun cours disponible",
                                                   isEnrolled = false
                                               }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // If no courses are available, display a message
    if (!courses || courses.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>{emptyMessage}</ThemedText>
            </View>
        );
    }

    // Sort courses by order_index if available
    const sortedCourses = [...courses].sort((a, b) => {
        // If both courses have order_index, sort by order_index
        if (a.order_index !== undefined && b.order_index !== undefined) {
            return a.order_index - b.order_index;
        }
        // If only one course has order_index, prioritize it
        if (a.order_index !== undefined) return -1;
        if (b.order_index !== undefined) return 1;
        // If neither has order_index, maintain original order
        return 0;
    });

    return (
        <ScrollView
            style={styles.courseList}
            contentContainerStyle={styles.courseListContent}
            showsVerticalScrollIndicator={false}
        >
            {sortedCourses.map((courseItem, index) => (
                <CourseRowItem
                    key={`course-${courseItem.course.id}-${index}`}
                    courseItem={courseItem}
                    pdId={pdId}
                    isDark={isDark}
                    isEnrolled={isEnrolled}
                />
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    courseList: {
        flex: 1,
    },
    courseListContent: {
        paddingBottom: 80,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    }
});

export default CourseList;
