import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeatureFlag } from 'posthog-react-native';

import { theme } from '@/constants/theme';
import { useCreatePost } from '@/contexts/CreatePostContext';
import type { TaggableContentResult } from '@/services/feed.service';

interface Props {
  tag: TaggableContentResult;
  isDarkMode?: boolean;
  style?: object;
  // 'pill' (icône + texte, défaut) pour un espace dédié ; 'icon' pour
  // s'aligner avec une rangée d'icônes d'action existante (pin/complété...).
  variant?: 'pill' | 'icon';
  // Cible optionnelle pour un tour guide (cf. écrans d'exercice).
  tourRef?: React.RefObject<View | null>;
}

// Bouton "Partager sur le fil" — proposé sur les écrans de contenu
// (cours/leçon/quiz/exercice/document, secondaire comme prépa) pour ouvrir
// le composer de post avec ce contenu déjà tagué. Masqué derrière le même
// flag que le tag picker : inutile de proposer un raccourci vers une
// fonctionnalité que l'utilisateur ne peut pas utiliser.
export const ShareToFeedButton: React.FC<Props> = ({ tag, isDarkMode, style, variant = 'pill', tourRef }) => {
  const { openCreatePost } = useCreatePost();
  const contentTaggingEnabled = useFeatureFlag('feed_content_tagging_enabled') === true;

  if (!contentTaggingEnabled) return null;

  if (variant === 'icon') {
    return (
      <View ref={tourRef} collapsable={false} style={style}>
        <Pressable onPress={() => openCreatePost(tag)} style={styles.iconButton} hitSlop={8}>
          <MaterialCommunityIcons
            name="share-outline"
            size={22}
            color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View ref={tourRef} collapsable={false}>
      <Pressable
        onPress={() => openCreatePost(tag)}
        style={[styles.button, isDarkMode && styles.buttonDark, style]}
      >
        <MaterialCommunityIcons name="share-outline" size={16} color={theme.color.primary[500]} />
        <Text style={[styles.text, isDarkMode && styles.textDark]}>Partager sur le fil</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: `${theme.color.primary[500]}14`,
    borderWidth: 1,
    borderColor: `${theme.color.primary[500]}55`,
  },
  buttonDark: {
    backgroundColor: `${theme.color.primary[500]}26`,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color.primary[500],
  },
  textDark: {},
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default ShareToFeedButton;
