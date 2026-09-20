// components/shared/FloatingSearchBar.tsx
// Barre de recherche flottante globale, juste au-dessus de la tab bar, sur
// toutes les pages. Repliée = petite pastille icône (style Dynamic Island).
// Tap = s'étire en largeur pour devenir une barre de recherche ; les
// résultats (search-anything, sémantique) s'affichent dans un panneau qui
// s'ouvre vers le haut, au-dessus de la pastille. Suit le clavier (remplace
// l'offset "au-dessus de la tab bar" par l'offset clavier, ne les cumule pas
// — sinon un espace vide inutile reste entre le clavier et la barre).
// Deux modes : "results" (liste brute triée par similarité) et "explain"
// (l'IA rédige un court texte qui s'appuie sur les résultats trouvés).
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { Events, trackEvent } from '@/utils/analytics';
import { searchAnythingWithStatus, type SearchMode, type SearchResult } from '@/services/search.service';
import type { TaggedFeedContentType } from '@/services/feed.service';

const TYPE_META: Record<TaggedFeedContentType, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  course: { icon: 'book-open-page-variant', color: '#4CAF50' },
  exercise: { icon: 'card-text-outline', color: '#9C27B0' },
  quiz: { icon: 'pencil-box-multiple', color: '#2196F3' },
  document: { icon: 'file-document-outline', color: '#F59E0B' },
  program: { icon: 'school-outline', color: '#EF4444' },
};

const COLLAPSED_SIZE = 52;
const BAR_HEIGHT = 52;
const DEBOUNCE_MS = 400;
const LOADING_PANEL_HEIGHT = 64;
const MESSAGE_PANEL_HEIGHT = 64;
const EXPLANATION_LINE_HEIGHT = 110;
const MAX_RESULTS_HEIGHT = 360;

type PanelState = 'idle' | 'loading' | 'results' | 'empty' | 'error';

// Exposé pour le futur tour produit : permet de piloter la barre depuis
// l'extérieur (remplir la requête, changer de mode) pendant une démo guidée.
export type FloatingSearchBarHandle = {
  demoOpen: () => void;
  demoSetQuery: (text: string) => void;
  demoSetMode: (mode: SearchMode) => void;
  demoClose: () => void;
  // Ref réelle sur la pastille/barre visible — sert de spotlight target pour
  // le tour produit (un TourStep sans targetRef plante la lib de tour).
  barNodeRef: React.RefObject<View | null>;
};

const FloatingSearchBar = forwardRef<FloatingSearchBarHandle>((_props, ref) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { trigger } = useHaptics();

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('explain');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [panelState, setPanelState] = useState<PanelState>('idle');

  const inputRef = useRef<TextInput>(null);
  const barNodeRef = useRef<View>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widthAnim = useRef(new Animated.Value(COLLAPSED_SIZE)).current;
  const resultsHeightAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const baseBottomOffsetRef = useRef(78 + insets.bottom);
  baseBottomOffsetRef.current = 78 + insets.bottom;

  const screenWidth = Dimensions.get('window').width;
  const expandedWidth = screenWidth - 32;

  useEffect(() => {
    bottomAnim.setValue(baseBottomOffsetRef.current);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // Ni iOS ni Android ne redimensionnent l'écran ici (confirmé : un essai
      // avec une petite marge fixe sur Android a caché la barre ENTIÈREMENT
      // derrière le clavier — donc pas d'adjustResize actif, la hauteur
      // reportée par l'event est bien la vraie distance à parcourir sur les
      // deux plateformes). bottom = hauteur du clavier + marge généreuse,
      // insets.bottom en plus pour absorber les cas où l'event sous-estime
      // légèrement (barre de nav Android, notch...) — mieux vaut un petit
      // espace visible qu'un input caché.
      Animated.timing(bottomAnim, {
        toValue: e.endCoordinates.height + insets.bottom + 24,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(bottomAnim, {
        toValue: baseBottomOffsetRef.current,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animateResultsHeight = (toValue: number) => {
    Animated.timing(resultsHeightAnim, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const openBar = () => {
    trigger(HapticType.LIGHT);
    trackEvent(Events.SEARCH_ANYTHING_OPEN, { source: 'floating' });
    setExpanded(true);
    Animated.timing(widthAnim, {
      toValue: expandedWidth,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => inputRef.current?.focus());
  };

  const closeBar = () => {
    inputRef.current?.blur();
    Animated.timing(widthAnim, {
      toValue: COLLAPSED_SIZE,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setExpanded(false);
      setQuery('');
      setResults([]);
      setExplanation(null);
      setPanelState('idle');
    });
    animateResultsHeight(0);
  };

  const runSearch = (trimmed: string, activeMode: SearchMode) => {
    if (!trimmed) {
      setResults([]);
      setExplanation(null);
      setPanelState('idle');
      animateResultsHeight(0);
      return;
    }

    // Feedback immédiat dès la frappe : le panneau s'ouvre en état "recherche
    // en cours" sans attendre la fin du debounce, sinon rien ne bouge à
    // l'écran pendant ~400ms+réseau et on ne sait pas si ça a été pris en
    // compte.
    setPanelState('loading');
    animateResultsHeight(LOADING_PANEL_HEIGHT);

    debounceRef.current = setTimeout(async () => {
      trackEvent(Events.SEARCH_ANYTHING_QUERY, {
        source: 'floating',
        mode: activeMode,
        query_length: trimmed.length,
      });
      const { results: data, explanation: exp, error } = await searchAnythingWithStatus(
        trimmed,
        undefined,
        20,
        activeMode
      );
      setResults(data);
      setExplanation(exp);

      if (error) {
        setPanelState('error');
        animateResultsHeight(MESSAGE_PANEL_HEIGHT);
      } else if (data.length === 0) {
        setPanelState('empty');
        animateResultsHeight(MESSAGE_PANEL_HEIGHT);
      } else {
        setPanelState('results');
        const extra = activeMode === 'explain' && exp ? EXPLANATION_LINE_HEIGHT : 0;
        animateResultsHeight(Math.min(MAX_RESULTS_HEIGHT, data.length * 62 + 8 + extra));
      }
    }, DEBOUNCE_MS);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query.trim(), mode);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggleMode = () => {
    trigger(HapticType.LIGHT);
    const nextMode: SearchMode = mode === 'results' ? 'explain' : 'results';
    setMode(nextMode);
    trackEvent(Events.SEARCH_ANYTHING_MODE_SWITCH, { source: 'floating', mode: nextMode });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query.trim(), nextMode);
  };

  const handleResultPress = (item: SearchResult) => {
    trigger(HapticType.LIGHT);
    trackEvent(Events.SEARCH_ANYTHING_RESULT_TAP, { source: 'floating', content_type: item.type });
    closeBar();
    router.push(item.route as Href);
  };

  useImperativeHandle(ref, () => ({
    demoOpen: () => openBar(),
    demoSetQuery: (text: string) => setQuery(text),
    demoSetMode: (nextMode: SearchMode) => {
      setMode(nextMode);
      runSearch(query.trim(), nextMode);
    },
    demoClose: () => closeBar(),
    barNodeRef,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }));

  return (
    <>
      {expanded && (
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={closeBar}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={35}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            // expo-blur ne fait pas de vrai flou sur Android (juste un fallback
            // translucide trop discret) — un dim explicite garantit l'effet
            // "on ne voit que la recherche" demandé, cross-platform.
            <View style={[StyleSheet.absoluteFill, isDark ? styles.dimDark : styles.dimLight]} />
          )}
        </Pressable>
      )}
      <Animated.View style={[styles.wrapper, { bottom: bottomAnim }]} pointerEvents="box-none">
      {expanded && panelState !== 'idle' && (
        <Animated.View
          style={[
            styles.resultsPanel,
            isDark && styles.resultsPanelDark,
            { width: expandedWidth, height: resultsHeightAnim },
          ]}
        >
          {panelState === 'loading' ? (
            <View style={styles.centeredMessage}>
              <ActivityIndicator color={theme.color.primary[500]} />
              <ThemedText style={[styles.messageText, isDark && styles.messageTextDark]}>
                Recherche en cours...
              </ThemedText>
            </View>
          ) : panelState === 'error' ? (
            <View style={styles.centeredMessage}>
              <MaterialCommunityIcons name="wifi-alert" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <ThemedText style={[styles.messageText, isDark && styles.messageTextDark]}>
                Recherche indisponible, réessaie.
              </ThemedText>
            </View>
          ) : panelState === 'empty' ? (
            <View style={styles.centeredMessage}>
              <ThemedText style={[styles.messageText, isDark && styles.messageTextDark]}>
                Aucun résultat pour "{query.trim()}".
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                mode === 'explain' && explanation ? (
                  <View style={[styles.explanationBox, isDark && styles.explanationBoxDark]}>
                    <MaterialCommunityIcons name="creation" size={14} color={theme.color.primary[500]} />
                    <ThemedText style={[styles.explanationText, isDark && styles.explanationTextDark]}>
                      {explanation}
                    </ThemedText>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const meta = TYPE_META[item.type];
                return (
                  <Pressable style={styles.resultItem} onPress={() => handleResultPress(item)}>
                    <View style={[styles.resultIcon, { backgroundColor: meta.color + (isDark ? '26' : '14') }]}>
                      <MaterialCommunityIcons name={meta.icon} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.resultLabel, isDark && styles.resultLabelDark]} numberOfLines={1}>
                        {item.label}
                      </ThemedText>
                      {item.subtitle && (
                        <ThemedText style={[styles.resultSubtitle, isDark && styles.resultSubtitleDark]} numberOfLines={1}>
                          {item.subtitle}
                        </ThemedText>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </Animated.View>
      )}

      <Animated.View
        ref={barNodeRef}
        collapsable={false}
        style={[
          styles.bar,
          isDark && styles.barDark,
          { width: widthAnim, height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2 },
        ]}
      >
        {expanded ? (
          <>
            <Pressable onPress={toggleMode} hitSlop={10} style={styles.modeButton}>
              <MaterialCommunityIcons
                name={mode === 'explain' ? 'creation' : 'format-list-bulleted'}
                size={16}
                color="#FFFFFF"
              />
            </Pressable>
            {panelState === 'loading' ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.barIcon} />
            ) : (
              <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" style={styles.barIcon} />
            )}
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Rechercher n'importe quoi..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <Pressable onPress={closeBar} hitSlop={10} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.collapsedTouchable} onPress={openBar}>
            <MaterialCommunityIcons name="creation" size={24} color="#FFFFFF" />
          </Pressable>
        )}
      </Animated.View>
      </Animated.View>
    </>
  );
});

FloatingSearchBar.displayName = 'FloatingSearchBar';

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 1400,
  },
  dimDark: {
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
  },
  dimLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1500,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.primary[500],
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },
  barDark: {
    backgroundColor: theme.color.primary[600],
  },
  collapsedTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  resultsPanel: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  resultsPanelDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  explanationBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: theme.color.primary[500] + '14',
  },
  explanationBoxDark: {
    backgroundColor: theme.color.primary[500] + '26',
  },
  explanationText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#111827',
  },
  explanationTextDark: { color: '#F3F4F6' },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resultIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultLabel: { fontFamily: theme.typography.fontFamily, fontSize: 14, color: '#111827' },
  resultLabelDark: { color: '#F3F4F6' },
  resultSubtitle: { fontFamily: theme.typography.fontFamily, fontSize: 11, color: '#6B7280', marginTop: 1 },
  resultSubtitleDark: { color: '#9CA3AF' },
  centeredMessage: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  messageText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: '#6B7280',
  },
  messageTextDark: { color: '#9CA3AF' },
});

export default FloatingSearchBar;
