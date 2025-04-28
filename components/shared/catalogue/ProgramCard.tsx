import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import * as Animatable from "react-native-animatable";

interface ProgramCardProps {
  title: string;
  description: string;
  price: number;
  courseCount: number;
  quizCount: number;
  concoursName: string;
  schoolName: string;
  isSelected: boolean;
  isDark: boolean;
  onSelect: () => Promise<void>;
  onPress: () => void;
}

const getDefaultImage = (title: string): string => {
  const seed = encodeURIComponent(title);
  return `https://api.dicebear.com/7.x/shapes/png?seed=${seed}&backgroundColor=32A852,4CAF50`;
};

export const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  price,
  courseCount,
  quizCount,
  concoursName,
  schoolName,
  isSelected,
  isDark,
  onSelect,
  onPress,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async () => {
    try {
      setIsLoading(true);
      await onSelect();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Animatable.View
      animation="fadeIn"
      duration={500}
      style={[styles.container, isDark && styles.containerDark]}
    >
      <TouchableOpacity activeOpacity={0.9}>
        <View style={styles.contentRow}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: getDefaultImage(title) }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          <View style={styles.mainContent}>
            <Text
              numberOfLines={2}
              style={[styles.title, isDark && styles.titleDark]}
            >
              {title}
            </Text>

            <View style={styles.schoolContainer}>
              <MaterialCommunityIcons
                name="certificate"
                size={14}
                color={theme.color.primary[500]}
              />
              <Text
                numberOfLines={1}
                style={[styles.schoolText, isDark && styles.schoolTextDark]}
              >
                {concoursName} • {schoolName}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="book-education"
                  size={16}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {courseCount}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="head-question"
                  size={16}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {quizCount}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              isSelected && styles.selectedButton,
              isLoading && styles.loadingButton
            ]}
            onPress={handleSelect}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isSelected ? "#FFF" : theme.color.primary[500]} />
            ) : (
              <MaterialCommunityIcons
                name={isSelected ? "check" : "plus"}
                size={20}
                color={isSelected ? "#FFF" : theme.color.primary[500]}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, isDark && styles.footerDark]}>
          <Pressable onPress={onPress}>
            <Text style={[styles.price]}>Details</Text>
          </Pressable>
          <Text style={styles.price}>{price.toLocaleString("fr-FR")} FCFA</Text>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius:theme.border.radius.small,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  contentRow: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: theme.border.radius.small,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontFamily : theme.typography.fontFamily,
fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  titleDark: {
    color: "#FFFFFF",
  },
  schoolContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  schoolText: {
    fontFamily : theme.typography.fontFamily,
fontSize: 12,
    color: theme.color.gray[600],
    flex: 1,
  },
  schoolTextDark: {
    color: theme.color.gray[400],
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontFamily : theme.typography.fontFamily,
fontSize: 12,
    color: theme.color.gray[600],
  },
  statTextDark: {
    color: theme.color.gray[400],
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: theme.border.radius.small,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.color.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  selectedButton: {
    backgroundColor: theme.color.success,
    borderColor: theme.color.success,
  },
  loadingButton: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    padding: 12,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerDark: {
    borderTopColor: theme.color.dark.border,
  },
  price: {
    fontFamily : theme.typography.fontFamily,
fontSize: 16,
    fontWeight: "700",
    color: theme.color.primary[500],
  },
});