// components/ArchiveCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { FileViewer } from './FileViewer';
import { theme } from '@/constants/theme';
import { Archive } from '@/app/(app)/learn/[pdId]/anales';

interface ArchiveCardProps {
  item: Archive;
  isDark: boolean;
  onPin: (id: string) => void;
  onDownload: (file: Archive) => void;
  onView: (file: Archive) => void;
  downloadState: { 
    downloading: boolean; 
    progress: number; 
    localPath?: string; 
  };
}

export const ArchiveCard: React.FC<ArchiveCardProps> = ({
  item,
  onPin,
  onDownload,
  onView,
  downloadState = { downloading: false, progress: 0, localPath: '' },
}) => {
  const { downloading, progress, localPath } = downloadState;
  const th = useColorScheme();
  const isDark = th === 'dark';

  return (
    <Animatable.View
      animation="fadeIn"
      duration={500}
      style={[styles.card, isDark && styles.cardDark]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={24}
              color={theme.color.primary[500]}
            />
          </View>
          <Text 
            numberOfLines={1} 
            style={[styles.cardTitle, isDark && styles.textDark]}
          >
            {item.name}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => !downloading && onDownload(item)}
            style={styles.actionButton}
          >
            {downloading ? (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{Math.round(progress || 0)}%</Text>
              </View>
            ) : (
              <MaterialCommunityIcons
                name={localPath ? "check-circle-outline" : "download-outline"}
                size={24}
                color={localPath ? theme.color.success : theme.color.primary[500]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onPin(item.id)} style={styles.actionButton}>
            <MaterialCommunityIcons
              name={item.is_pinned ? "pin" : "pin-outline"}
              size={24}
              color={item.is_pinned ? theme.color.primary[500] : theme.color.gray[400]}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onView(item)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              name="eye-outline"
              size={24}
              color={theme.color.primary[500]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* <FileViewer file={item} /> */}
      
      <View style={styles.footer}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons
            name="folder-outline"
            size={14}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
          <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
            {item.courses_categories?.name}
          </Text>
        </View>
        
        <View style={styles.metaItem}>
          <MaterialCommunityIcons
            name="calendar-outline"
            size={14}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
          <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
            {new Date(item.session).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.color.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.color.gray[600],
  },
  metaTextDark: {
    color: theme.color.gray[400],
  },
  textDark: {
    color: '#FFFFFF',
  },
  actionButton: {
    padding: 8,
    borderRadius: theme.border.radius.large,
    backgroundColor: 'transparent',
  },
  progressContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.color.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.color.primary[500],
  }
});