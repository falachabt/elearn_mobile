import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { theme } from '@/constants/theme';

// Define types
interface QuizCategoryFilterProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    isDark: boolean;
}

// Map category names to icon names
export const QUIZ_CATEGORY_ICONS = {
    'Anglais': 'book-alphabet',
    'Mathématiques': 'function',
    'Biologie': 'dna',
    'Chimie': 'flask',
    'Physique': 'atom',
    'Informatique': 'code-tags',
    'Histoire': 'book-open-page-variant',
    'Géographie': 'earth',
    'Littérature': 'book-open-variant',
    'Sciences Sociales': 'account-group',
    'Arts': 'palette',
    'Langues': 'translate',
    'QCM': 'format-list-checks',
    'Exercices': 'pencil-box-outline',
    'Examens': 'file-document-outline',
    'Culture Générale': 'lightbulb-outline',
    'Economie': 'chart-line',
    'Droit': 'scale-balance',
    'Médecine': 'medical-bag',
    'Sport': 'run',
    // Default icon for other categories
    'default': 'help-box'
};

// Map category names to colors
export const QUIZ_CATEGORY_COLORS = {
    'Anglais': '#1D4ED8',
    'Mathématiques': '#3B82F6',
    'Biologie': '#10B981',
    'Chimie': '#8B5CF6',
    'Physique': '#EC4899',
    'Informatique': '#6366F1',
    'Histoire': '#F59E0B',
    'Géographie': '#14B8A6',
    'Littérature': '#8B5CF6',
    'Sciences Sociales': '#6366F1',
    'Arts': '#EC4899',
    'Langues': '#FF7800',
    'QCM': '#10B981',
    'Exercices': '#F97316',
    'Examens': '#EF4444',
    'Culture Générale': '#06B6D4',
    'Economie': '#64748B',
    'Droit': '#9333EA',
    'Médecine': '#0EA5E9',
    'Sport': '#22C55E',
    // Default color for other categories
    'default': theme.color.primary[500]
};

const QuizCategoryFilter: React.FC<QuizCategoryFilterProps> = ({
                                                                   categories,
                                                                   selectedCategory,
                                                                   onSelectCategory,
                                                                   isDark
                                                               }) => {
    const { trigger } = useHaptics();

    // Handle category selection
    const handleCategorySelect = (category: string) => {
        trigger(HapticType.LIGHT);
        onSelectCategory(category);
    };

    // Get icon for a category
   const getCategoryIcon = (category: string): string => {
       return (category in QUIZ_CATEGORY_ICONS)
           ? QUIZ_CATEGORY_ICONS[category as keyof typeof QUIZ_CATEGORY_ICONS]
           : QUIZ_CATEGORY_ICONS.default;
   };

    // Get color for a category
 const getCategoryColor = (category: string): string => {
     return (category in QUIZ_CATEGORY_COLORS)
         ? QUIZ_CATEGORY_COLORS[category as keyof typeof QUIZ_CATEGORY_COLORS]
         : QUIZ_CATEGORY_COLORS.default;
 };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
        >
            {/* "All" category chip */}
            <Pressable
                style={[
                    styles.categoryChip,
                    isDark && styles.categoryChipDark,
                    selectedCategory === "all" && styles.selectedCategory,
                    selectedCategory === "all" && { backgroundColor: theme.color.primary[500] }
                ]}
                onPress={() => handleCategorySelect("all")}
            >
                <MaterialCommunityIcons
                    name="view-grid"
                    size={18}
                    color={selectedCategory === "all" ? "#FFFFFF" : (isDark ? "#D1D5DB" : "#4B5563")}
                    style={styles.categoryIcon}
                />
                <ThemedText
                    style={[
                        styles.categoryText,
                        isDark && styles.categoryTextDark,
                        selectedCategory === "all" && styles.selectedCategoryText,
                    ]}
                >
                    Tout
                </ThemedText>
            </Pressable>

            {/* Category chips */}
            {categories.map((category) => {
                const categoryColor = getCategoryColor(category);
                return (
                    <Pressable
                        key={category}
                        style={[
                            styles.categoryChip,
                            isDark && styles.categoryChipDark,
                            selectedCategory === category && styles.selectedCategory,
                            selectedCategory === category && { backgroundColor: categoryColor }
                        ]}
                        onPress={() => handleCategorySelect(category)}
                    >
                        <MaterialCommunityIcons
                            name={getCategoryIcon(category) as any}
                            size={18}
                            color={
                                selectedCategory === category
                                    ? "#FFFFFF"
                                    : isDark
                                        ? categoryColor
                                        : categoryColor
                            }
                            style={styles.categoryIcon}
                        />
                        <ThemedText
                            style={[
                                styles.categoryText,
                                isDark && styles.categoryTextDark,
                                selectedCategory === category && styles.selectedCategoryText,
                                !(selectedCategory === category) && { color: categoryColor }
                            ]}
                        >
                            {category}
                        </ThemedText>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    categoryContainer: {
        paddingHorizontal: 16,
        gap: 8,
        height: 56,
        alignItems: 'center',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        height: 40,
    },
    categoryChipDark: {
        backgroundColor: '#374151',
    },
    categoryIcon: {
        marginRight: 6,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    categoryTextDark: {
        color: '#D1D5DB',
    },
    selectedCategory: {
        backgroundColor: theme.color.primary[500],
    },
    selectedCategoryText: {
        color: '#FFFFFF',
    },
});

export default QuizCategoryFilter;