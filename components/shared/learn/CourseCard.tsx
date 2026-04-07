import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image as CachedImage } from "expo-image";

import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { theme } from "@/constants/theme";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { CourseItem, isPrepaCourseItem } from "@/types/course.type";
import { getCategoryTheme } from "@/constants/categoryThemes";
import { useCategories } from "@/hooks/global/useCategories";
import { MaterialIconName } from "@/constants/iconNames";

interface CourseCardProps {
  courseItem: CourseItem;
  pdId: string;
  type?: "secondary" | "prepa";
  index?: number;
  onPress?: () => void;
  isEnrolled?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  courseItem,
  pdId,
  type = "prepa", // Type de programme (prepa ou secondary) - utilisé pour déterminer le type de cours
  index = 1,
  onPress,
  isEnrolled = false,
}) => {
  const router = useRouter();
  const { trigger } = useHaptics();
  const { course } = courseItem;
  const courseId = course?.id;
  const isPrepa = isPrepaCourseItem(courseItem);
  const { categories } = useCategories();

  // Gérer différemment la catégorie selon le type
  const categoryName = useMemo(() => {
    if (!course?.category) return "Général";

    if (typeof course.category === "string") {
      // Pour secondary, category est un string (ID)
      const category = categories?.find((cat) => cat.id === course.category);
      if (category) {
        return category.name;
      }
      return "Général";
    }

    // Pour prepa, category est un objet Category
    return course.category.name || "Général";
  }, [course?.category]);

  const courseName = course?.name || "Cours sans titre";

  // courses_content et course_videos n'existent que pour les cours prepa
  const courseContentsCount =
    isPrepa && course && "courses_content" in course
      ? course.courses_content?.length || 0
      : 0;
  const videoCount =
    isPrepa && course && "course_videos" in course
      ? course.course_videos?.length || 0
      : 0;

  // Get course progress
  const { progress } = useCourseProgress(courseId || 0);

  // Get theme based on category - utilise la fonction pour générer un thème cohérent
  const courseTheme = getCategoryTheme(categoryName);

  // Utiliser le type pour déterminer la route de navigation
  const courseRoute =
    type === "secondary"
      ? `/secondary/program/${pdId}/courses/${courseId}`
      : `/(app)/learn/${pdId}/courses/${courseId}`;

  // Extract unit/course number and clean title - memoized to avoid recalculation
  const { unitNumber, courseNumber, cleanTitle } = useMemo(() => {
    // Try to extract "Unit X" pattern
    const unitRegex = /\b(unit|unité)\s+(\d+)\b/i;
    const unitMatch = courseName.match(unitRegex);

    // Try to extract "COURS X" pattern
    const courseRegex = /\b(cours)\s+(\d+)\b/i;
    const courseMatch = courseName.match(courseRegex);

    let cleanTitle = courseName;

    if (unitMatch) {
      cleanTitle = cleanTitle.replace(unitRegex, "").trim();
    }

    if (courseMatch) {
      cleanTitle = cleanTitle.replace(courseRegex, "").trim();
    }

    // Further clean the title if it contains a colon
    if (cleanTitle.includes(":")) {
      cleanTitle = cleanTitle.split(":")[1].trim();
    }

    return {
      unitNumber: unitMatch ? unitMatch[2] : null,
      courseNumber: courseMatch ? courseMatch[2] : null,
      cleanTitle,
    };
  }, [courseName]);

  const handlePress = useCallback(() => {
    trigger(HapticType.LIGHT);
    if (onPress) {
      onPress();
      return;
    }

    // @ts-expect-error - Dynamic route based on program type
    router.push(courseRoute);
  }, [trigger, onPress, router, courseRoute]);

  // Format course identifier (either unit or chapter number)
  const getCourseIdentifier = useCallback(() => {
    if (unitNumber) {
      return `Unit ${unitNumber}`;
    } else if (courseNumber) {
      return `COURS ${courseNumber}`;
    } else {
      return `#${index}`;
    }
  }, [unitNumber, courseNumber, index]);

  // Get category icon
  const getCategoryIcon = useCallback(() => {
    if (
      course?.category &&
      typeof course.category === "object" &&
      "icon" in course.category &&
      course.category.icon
    ) {
      return (
        <CachedImage
          source={{ uri: course.category.icon }}
          style={styles.categoryIconImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={courseTheme.icon as MaterialIconName}
        size={24}
        color="#FFFFFF"
      />
    );
  }, [course?.category, courseTheme.icon]);

  const getStatusIcon = useCallback(() => {
    if (progress?.is_completed) {
      return (
        <View style={styles.completedBadge}>
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="#FFFFFF"
          />
        </View>
      );
    }
    return null;
  }, [progress?.is_completed]);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: courseTheme.cardBg }]}
      onPress={handlePress}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardHeader}>
          <Text style={styles.categoryTag}>@{categoryName}</Text>
          <Text style={styles.indexNumber}>{getCourseIdentifier()}</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {cleanTitle}
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>{getCategoryIcon()}</View>
        </View>

        {/* Completion Badge */}
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.statsContainer}>
          {getStatusIcon()}

          {!isEnrolled && (
            <View style={styles.previewBadge}>
              <MaterialCommunityIcons
                name="eye-outline"
                size={12}
                color="#FFFFFF"
              />
              <Text style={styles.previewText}>Aperçu</Text>
            </View>
          )}

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.statText}>{courseContentsCount} leçons</Text>
          </View>

          {videoCount > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="play-circle-outline"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.statText}>{videoCount} vidéos</Text>
              </View>
            </>
          )}
        </View>

        {/* Progress Bar - Only show for enrolled users */}
        {isEnrolled && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      progress?.progress_percentage !== undefined
                        ? `${progress.progress_percentage}%`
                        : "0%",
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 220,
    height: 170, // Slightly taller to accommodate progress bar
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    marginBottom: 8,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.8)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  previewText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },
  cardTop: {
    flex: 1,
    padding: 12,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  categoryTag: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  indexNumber: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "bold",
    // marginRight: 30,
    color: "rgba(255, 255, 255, 0.9)",
  },
  titleContainer: {
    flexShrink: 1,
    marginRight: 36,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  iconContainer: {
    position: "absolute",
    right: 10,
    bottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryIconImage: {
    width: 24,
    height: 24,
  },
  cardBottom: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 8,
  },
  statText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginLeft: 4,
  },
  completedBadge: {
    // position: 'absolute',
    // top: 8,
    // right: 8,
    backgroundColor: "rgba(16, 185, 129, 0.8)",
    borderRadius: 12,
    width: 20,
    height: 20,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#65B741",
    borderRadius: 2,
  },
});

export default React.memo(CourseCard);
