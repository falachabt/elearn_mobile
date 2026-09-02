// components/shared/feed/RichText.tsx
// Rendu de texte "réseau social" : liens cliquables + #hashtags mis en évidence.
import React, { useMemo } from 'react';
import { Text, Linking, Alert, StyleProp, TextStyle } from 'react-native';

import { theme } from '@/constants/theme';

interface RichTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/;
const HASHTAG_REGEX = /(#[\p{L}0-9_]+)/u;
// Combinaison des deux, avec groupe capturant pour garder les correspondances dans le split()
const COMBINED_REGEX = /(https?:\/\/[^\s]+|#[\p{L}0-9_]+)/gu;

export const RichText: React.FC<RichTextProps> = ({ content, style, children }) => {
  const parsedContent = useMemo(() => {
    if (!content) return null;

    const parts = content.split(COMBINED_REGEX);

    return parts.map((part, i) => {
      if (URL_REGEX.test(part)) {
        return (
          <Text
            key={i}
            style={[style, { color: theme.color.primary[500], textDecorationLine: 'underline' }]}
            onPress={(e) => {
              e.stopPropagation();
              Linking.openURL(part).catch(() =>
                Alert.alert('Erreur', "Impossible d'ouvrir le lien.")
              );
            }}
          >
            {part}
          </Text>
        );
      }

      if (HASHTAG_REGEX.test(part)) {
        return (
          <Text key={i} style={[style, { color: theme.color.primary[500], fontWeight: '700' }]}>
            {part}
          </Text>
        );
      }

      return (
        <Text key={i} style={style}>
          {part}
        </Text>
      );
    });
  }, [content, style]);

  return (
    <Text style={style}>
      {parsedContent}
      {children}
    </Text>
  );
};
