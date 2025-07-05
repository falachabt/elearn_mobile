// Type definitions for course-related components

// Category type
export interface Category {
    id?: number;
    name: string;
    icon?: string;
}

// Course content type
export interface CourseContent {
    id: number;
    name: string;
    order: number;
}

// Course video type
export interface CourseVideo {
    id: number;
}

// Course type
export interface Course {
    id: number;
    name: string;
    category?: Category;
    courses_content?: CourseContent[];
    course_videos?: CourseVideo[];
    goals?: string[];
}

// Course item type (used in CourseGrid and CourseCard)
export interface CourseItem {
    id?: number;
    lpId?: string;
    course: Course;
    order_index?: number;
}

// Category group type (used in CourseGrid)
export interface CategoryGroup {
    name: string;
    icon?: string;
    courses: CourseItem[];
}

// Props for CourseGridByCategory component
export interface CourseGridByCategoryProps {
    courses: CourseItem[];
    pdId: string;
    selectedCategory: string;
    onCoursePress?: (courseItem: CourseItem) => void;
    isEnrolled?: boolean;
}

// Props for CourseCard component
export interface CourseCardProps {
    courseItem: CourseItem;
    pdId: string;
    index?: number;
    onPress?: () => void;
    isEnrolled?: boolean;
}