// FileViewerScreen.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { FileViewer } from '@/components/FileViewer';
import { Archive } from '..';

export const FileViewerScreen = () => {
  const { fileId, filePath } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View style={[viewerStyles.container, isDark && viewerStyles.containerDark]}>
      <View style={viewerStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={viewerStyles.backButton}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </TouchableOpacity>
      </View>
      
      <FileViewer
        file={{
          id: fileId as string,
          file_url: filePath as string,
          file_type: typeof filePath === 'string' && filePath.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other'
        } as Archive}
        style={viewerStyles.viewer}
      />
    </View>
  );
};

const viewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  backButton: {
    padding: 8,
  },
  viewer: {
    flex: 1,
  },
});

export default FileViewerScreen;