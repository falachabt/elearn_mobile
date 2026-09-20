// app/(app)/search.tsx
// "Search anything" — recherche sémantique plein écran sur tout le contenu
// de l'app (cours/exercice/quiz/document/classe-formation), personnalisée
// par le pays et les programmes suivis de l'utilisateur. Deux modes :
// "results" (liste brute) et "explain" (l'IA rédige un court texte qui
// s'appuie sur les résultats trouvés).
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useRouter, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Events, trackEvent } from '@/utils/analytics';
import { searchAnythingWithStatus, type SearchMode, type SearchResult } from '@/services/search.service';
import type { TaggedFeedContentType } from '@/services/feed.service';

const TABS: { key: TaggedFeedContentType | 'all'; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [
  { key: 'all', label: 'Tout', icon: 'view-grid-outline', color: theme.color.primary[500] },
  { key: 'course', label: 'Cours', icon: 'book-open-page-variant', color: '#4CAF50' },
  { key: 'exercise', label: 'Exercices', icon: 'card-text-outline', color: '#9C27B0' },
  { key: 'quiz', label: 'Quiz', icon: 'pencil-box-multiple', color: '#2196F3' },
  { key: 'document', label: 'Documents', icon: 'file-document-outline', color: '#F59E0B' },
  { key: 'program', label: 'Classes', icon: 'school-outline', color: '#EF4444' },
];

const TYPE_META: Record<TaggedFeedContentType, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  course: { icon: 'book-open-page-variant', color: '#4CAF50' },
  exercise: { icon: 'card-text-outline', color: '#9C27B0' },
  quiz: { icon: 'pencil-box-multiple', color: '#2196F3' },
  document: { icon: 'file-document-outline', color: '#F59E0B' },
  program: { icon: 'school-outline', color: '#EF4444' },
};

const DEBOUNCE_MS = 400;

export default function SearchAnythingScreen() {
  const insets = useSafeAreaInsets();
  const expoRouter = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [tab, setTab] = useState<TaggedFeedContentType | 'all'>('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('explain');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setExplanation(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      trackEvent(Events.SEARCH_ANYTHING_QUERY, { source: 'page', mode, query_length: trimmed.length, tab });
      const { results: data, explanation: exp, error } = await searchAnythingWithStatus(
        trimmed,
        tab === 'all' ? undefined : tab,
        20,
        mode
      );
      setResults(data);
      setExplanation(exp);
      setHasError(error);
      setIsLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, mode]);

  const toggleMode = () => {
    const nextMode: SearchMode = mode === 'results' ? 'explain' : 'results';
    setMode(nextMode);
    trackEvent(Events.SEARCH_ANYTHING_MODE_SWITCH, { source: 'page', mode: nextMode });
  };

  const handleResultPress = (item: SearchResult) => {
    trackEvent(Events.SEARCH_ANYTHING_RESULT_TAP, { source: 'page', content_type: item.type });
    router.push(item.route as Href);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable onPress={() => expoRouter.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
        </Pressable>
        <ThemedText style={[styles.title, isDark && styles.titleDark]}>Rechercher</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchRow}>
        <Pressable
          onPress={toggleMode}
          style={[
            styles.modeButton,
            isDark && styles.modeButtonDark,
            mode === 'explain' && styles.modeButtonActive,
          ]}
        >
          <MaterialCommunityIcons
            name={mode === 'explain' ? 'creation' : 'format-list-bulleted'}
            size={18}
            color={mode === 'explain' ? '#FFFFFF' : theme.color.primary[500]}
          />
        </Pressable>
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <MaterialCommunityIcons name="magnify" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Nombres premiers, suites numériques, tampon sanguin..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.tab,
                active && { backgroundColor: t.color + '1A', borderColor: t.color },
                isDark && !active && styles.tabDark,
              ]}
            >
              <MaterialCommunityIcons name={t.icon} size={15} color={active ? t.color : '#9CA3AF'} />
              <ThemedText style={[styles.tabText, { color: active ? t.color : '#9CA3AF' }]}>{t.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginVertical: 28 }} color={theme.color.primary[500]} />
      ) : query.trim().length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="text-search" size={40} color={isDark ? '#374151' : '#D1D5DB'} />
          <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            Décrivez ce que vous cherchez — même sans les mots exacts, la recherche comprend le sens.
          </ThemedText>
        </View>
      ) : hasError ? (
        <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark, { marginTop: 28 }]}>
          Recherche indisponible, réessaie.
        </ThemedText>
      ) : results.length === 0 ? (
        <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark, { marginTop: 28 }]}>
          Aucun résultat pour "{query.trim()}".
        </ThemedText>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            mode === 'explain' && explanation ? (
              <View style={[styles.explanationBox, isDark && styles.explanationBoxDark]}>
                <MaterialCommunityIcons name="creation" size={16} color={theme.color.primary[500]} />
                <ThemedText style={[styles.explanationText, isDark && styles.explanationTextDark]}>
                  {explanation}
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type];
            return (
              <Pressable
                style={[styles.item, isDark && styles.itemDark]}
                onPress={() => handleResultPress(item)}
              >
                <View style={[styles.itemIcon, { backgroundColor: meta.color + (isDark ? '26' : '14') }]}>
                  <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.itemText, isDark && styles.itemTextDark]} numberOfLines={2}>
                    {item.label}
                  </ThemedText>
                  {item.subtitle && (
                    <ThemedText style={[styles.itemSubtitle, isDark && styles.itemSubtitleDark]} numberOfLines={1}>
                      {item.subtitle}
                    </ThemedText>
                  )}
                </View>
                {item.is_enrolled && (
                  <View style={styles.enrolledBadge}>
                    <MaterialCommunityIcons name="check-circle" size={13} color="#10B981" />
                  </View>
                )}
                <MaterialCommunityIcons name="chevron-right" size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerDark: {},
  title: { fontFamily: theme.typography.fontFamily, fontSize: 17, fontWeight: '700', color: '#111827' },
  titleDark: { color: '#F9FAFB' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
  },
  modeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButtonDark: {
    borderColor: '#374151',
    backgroundColor: theme.color.dark.background.secondary,
  },
  modeButtonActive: {
    backgroundColor: theme.color.primary[500],
    borderColor: theme.color.primary[500],
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
  },
  searchBoxDark: {
    borderColor: '#374151',
    backgroundColor: theme.color.dark.background.secondary,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  searchInputDark: { color: '#F9FAFB' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingHorizontal: 16 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabDark: { borderColor: '#374151' },
  tabText: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  explanationBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: theme.color.primary[500] + '14',
  },
  explanationBoxDark: {
    backgroundColor: theme.color.primary[500] + '26',
  },
  explanationText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#111827',
  },
  explanationTextDark: { color: '#F3F4F6' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  itemDark: { backgroundColor: theme.color.dark.background.secondary },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: { fontFamily: theme.typography.fontFamily, fontSize: 15, color: '#111827' },
  itemTextDark: { color: '#F3F4F6' },
  itemSubtitle: { fontFamily: theme.typography.fontFamily, fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemSubtitleDark: { color: '#9CA3AF' },
  enrolledBadge: { paddingHorizontal: 2 },
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: '#6B7280', fontFamily: theme.typography.fontFamily, fontSize: 14 },
  emptyTextDark: { color: '#9CA3AF' },
});
