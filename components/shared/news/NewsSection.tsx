import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    useColorScheme
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import NewsCard, { NewsCardProps } from './NewsCard';

import { theme } from '@/constants/theme';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_MARGIN = 12;
const NEWS_CARD_WIDTH = width * 0.8;

interface EmptyNewsStateProps {
    isDarkMode?: boolean;
}

const EmptyNewsState = ({ isDarkMode }: EmptyNewsStateProps) => {
    return (
        <View style={[styles.emptyContainer, isDarkMode && styles.emptyContainerDark]}>
            <MaterialCommunityIcons 
                name="newspaper-variant-outline" 
                size={48} 
                color={isDarkMode ? theme.color.dark.text.secondary : theme.color.light.text.secondary} 
            />
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                Aucune actualité disponible pour le moment
            </Text>
        </View>
    );
};

interface NewsSectionProps {
    newsItems: NewsCardProps[];
    isDarkMode?: boolean;
}

const NewsSection = ({ newsItems, isDarkMode: propIsDarkMode }: NewsSectionProps) => {
    const colorScheme = useColorScheme();
    const isDarkMode = propIsDarkMode !== undefined ? propIsDarkMode : colorScheme === 'dark';

    // Apply date filter to news items
    const filteredNewsItems = !newsItems ? [] : newsItems.filter(item => {
        const now = new Date();
        // If startDate is defined and current date is before startDate, don't show
        if (item.startDate && now < item.startDate) return false;
        // If endDate is defined and current date is after endDate, don't show
        if (item.endDate && now > item.endDate) return false;
        // Otherwise, show the item
        return true;
    });

    // Show empty state if no news items pass the date filter
    if (filteredNewsItems.length === 0) {
        return <EmptyNewsState isDarkMode={isDarkMode} />;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                snapToInterval={NEWS_CARD_WIDTH + CARD_MARGIN}
                decelerationRate="fast"
            >
                {filteredNewsItems.map((item) => (
                    <View 
                        key={item.id} 
                        style={[
                            styles.cardWrapper,
                            { width: NEWS_CARD_WIDTH }
                        ]}
                    >
                        <NewsCard {...item} />
                    </View>
                ))}
            </ScrollView>
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    scrollContent: {
        paddingRight: HORIZONTAL_PADDING - CARD_MARGIN,
    },
    cardWrapper: {
        marginRight: CARD_MARGIN,
    },
    emptyContainer: {
        width: width - (HORIZONTAL_PADDING * 2),
        height: 160,
        backgroundColor: '#F3F4F6',
        borderRadius: theme.border.radius.small,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        marginBottom: 24,
    },
    emptyContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    emptyText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: theme.color.light.text.secondary,
        textAlign: 'center',
        marginTop: 12,
    },
    emptyTextDark: {
        color: theme.color.dark.text.secondary,
    },
});

export default React.memo(NewsSection);
