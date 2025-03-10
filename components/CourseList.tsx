import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import CourseRowItem from "./shared/CourseRowItem";
import { ThemedText } from "@/components/ThemedText";

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
}

interface CourseListProps {
    courses: CourseItem[];
    pdId: string;
    onCoursePress?: (courseItem: CourseItem) => void;
    emptyMessage?: string;
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
                                                   emptyMessage = "Aucun cours disponible"
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

    return (
        <ScrollView
            style={styles.courseList}
            contentContainerStyle={styles.courseListContent}
            showsVerticalScrollIndicator={false}
        >
            {courses.map((courseItem, index) => (
                <CourseRowItem
                    key={`course-${courseItem.course.id}-${index}`}
                    courseItem={courseItem}
                    pdId={pdId}
                    isDark={isDark}
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
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    }
});

export default CourseList;