import React from 'react';
import {View, Text, StyleSheet, ScrollView, Pressable, Image} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/useColorScheme';
import {HapticType, useHaptics} from '@/hooks/useHaptics';
import {theme} from '@/constants/theme';

// TypeScript interfaces
interface Category {
    id?: number;
    name: string;
    icon?: string;
}

interface CategoryFilterProps {
    id : string,
    categories: Category[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
}

// Map of category names to icon names (fallbacks when no icon URL is provided)
export const CATEGORY_ICONS: Record<string, string> = {
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
};

// Map of category names to colors
export const CATEGORY_COLORS: Record<string, string> = {
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
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({ id,categories,selectedCategory,onSelectCategory,}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const {trigger} = useHaptics();

    const handleCategoryPress = (category: string) => {
        trigger(HapticType.LIGHT);
        onSelectCategory(category);
    };

    // Get icon for category (URL or fallback icon)
    const getCategoryIcon = (category: Category): React.ReactNode => {
        // If category has an icon URL, use it
        // if (category.icon) {
        //     return (
        //         <Image
        //             source={{ uri: category.icon }}
        //             style={styles.categoryIcon}
        //             resizeMode="contain"
        //         />
        //     );
        // }

        // Otherwise use a fallback icon from MaterialCommunityIcons
        const iconName = CATEGORY_ICONS[category.name] || 'book-education';
        const color = selectedCategory === category.name
            ? '#FFFFFF'
            : isDark ? '#D1D5DB' : '#4B5563';

        return (
            <MaterialCommunityIcons
                // @ts-ignore
                name={iconName}
                size={20}
                color={color}
            />
        );
    };

    // Get background color for selected category
    const getCategoryColor = (categoryName: string): string => {
        return CATEGORY_COLORS[categoryName] || theme.color.primary[500];
    };

    return (
        <ScrollView
            horizontal
            style={{flexGrow: 0, height: 50, }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {/* "All" category chip */}
            <Pressable
                style={[
                    styles.categoryChip,
                    isDark && styles.categoryChipDark,
                    selectedCategory === 'all' && styles.selectedCategoryChip,
                    selectedCategory === 'all' && {backgroundColor: theme.color.primary[500]}
                ]}
                onPress={() => handleCategoryPress('all')}
            >
                <MaterialCommunityIcons
                    name="view-grid"
                    size={20}
                    color={selectedCategory === 'all' ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563')}
                />
                <Text style={[
                    styles.categoryText,
                    isDark && styles.categoryTextDark,
                    selectedCategory === 'all' && styles.selectedCategoryText
                ]}>
                    Tout
                </Text>
            </Pressable>

            {/* Category chips */}
            {categories.map((category, index) => (
                <Pressable
                    key={`${category.id}-${category.name}-${index}-${id}`}
                    style={[
                        styles.categoryChip,
                        isDark && styles.categoryChipDark,
                        selectedCategory === category.name && styles.selectedCategoryChip,
                        selectedCategory === category.name && {
                            backgroundColor: getCategoryColor(category.name)
                        }
                    ]}
                    onPress={() => handleCategoryPress(category.name)}
                >
                    <View style={styles.chipContent}>
                        {getCategoryIcon(category)}
                        <Text style={[
                            styles.categoryText,
                            isDark && styles.categoryTextDark,
                            selectedCategory === category.name && styles.selectedCategoryText
                        ]}>
                            {category.name}
                        </Text>
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 16,
        // paddingVertical: 8,
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.border.radius.small,
        marginRight: 8,
        height: 40,
    },
    categoryChipDark: {
        backgroundColor: '#374151',
    },
    selectedCategoryChip: {
        backgroundColor: theme.color.primary[500],
    },
    chipContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        width: 20,
        height: 20,
        marginRight: 6,
    },
    categoryText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
        marginLeft: 6,
    },
    categoryTextDark: {
        color: '#D1D5DB',
    },
    selectedCategoryText: {
        color: '#FFFFFF',
    },
});

export default CategoryFilter;