import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import NewsItem from './NewsItem';

import type { News } from '@/types/news.type';
import { theme } from '@/constants/theme';

interface NewsListProps {
  news: News[];
  userId: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onNewsPress?: (news: News) => void;
  ListHeaderComponent?: React.ReactElement;
  ListFooterComponent?: React.ReactElement;
}

const NewsList: React.FC<NewsListProps> = ({
  news,
  userId,
  isLoading = false,
  onRefresh,
  onNewsPress,
  ListHeaderComponent,
  ListFooterComponent,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (isLoading && news.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Chargement des actualités...
        </Text>
      </View>
    );
  }

  if (!isLoading && news.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="newspaper-variant-outline"
          size={64}
          color={isDark ? '#6B7280' : '#D1D5DB'}
        />
        <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
          Aucune actualité
        </Text>
        <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
          Revenez plus tard pour découvrir les dernières nouvelles
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={news}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <NewsItem news={item} userId={userId} onPress={onNewsPress} />
      )}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={[theme.color.primary[500]]}
            tintColor={theme.color.primary[500]}
          />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      windowSize={10}
      initialNumToRender={3}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: theme.typography.fontFamily,
  },
  loadingTextDark: {
    color: '#CCCCCC',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: theme.typography.fontFamily,
  },
  emptyTitleDark: {
    color: '#FFFFFF',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
  },
  emptyTextDark: {
    color: '#CCCCCC',
  },
});

export default NewsList;
