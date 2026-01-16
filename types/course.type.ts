// Type definitions for course-related components

import { SecondaryProgramCourse } from "./secondary.type";
import { Database } from "./supabase";

// Category type
export type Category = Database["public"]["Tables"]["courses_categories"]["Row"];

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
export interface PrepaCourseItem {
    id?: number;
    lpId?: string;
    course: Course;
    order_index?: number;
}

export type CourseItem = PrepaCourseItem | SecondaryProgramCourse

// Category group type (used in CourseGrid)
export interface CategoryGroup {
    name: string;
    icon?: string | null;
    courses: CourseItem[];
}

// Type guard functions
export function isPrepaCourseItem(courseItem: CourseItem): courseItem is PrepaCourseItem {
    return 'lpId' in courseItem || typeof (courseItem as PrepaCourseItem).id === 'number';
}

export function isSecondaryCourseItem(courseItem: CourseItem): courseItem is SecondaryProgramCourse {
    return typeof (courseItem as SecondaryProgramCourse).id === 'string';
}


