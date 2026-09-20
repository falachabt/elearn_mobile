import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import type { TaggedFeedContentType } from '@/services/feed.service';

interface Props {
  type: TaggedFeedContentType;
  label: string;
  route: string;
  isDarkMode?: boolean;
}

const TYPE_META: Record<TaggedFeedContentType, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  course: { icon: 'book-open-page-variant', color: '#4CAF50' },
  exercise: { icon: 'card-text-outline', color: '#9C27B0' },
  quiz: { icon: 'pencil-box-multiple', color: '#2196F3' },
  document: { icon: 'file-document-outline', color: '#F59E0B' },
  program: { icon: 'school-outline', color: '#EF4444' },
};

export const TaggedContentChip: React.FC<Props> = ({ type, label, route, isDarkMode }) => {
  const meta = TYPE_META[type];

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        router.push(route as Href);
      }}
      style={[
        styles.chip,
        { borderColor: meta.color + '55', backgroundColor: meta.color + (isDarkMode ? '26' : '14') },
      ]}
    >
      <MaterialCommunityIcons name={meta.icon} size={15} color={meta.color} />
      <Text style={[styles.label, { color: meta.color }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.spacer} />
      <MaterialCommunityIcons name="chevron-right" size={16} color={meta.color} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  spacer: {
    width: 2,
  },
});

export default TaggedContentChip;
