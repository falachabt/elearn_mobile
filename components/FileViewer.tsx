// components/FileViewer.tsx
import { Archive } from '@/app/(app)/learn/[pdId]/anales';
import { theme } from '@/constants/theme';
import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import Pdf from 'react-native-pdf';
import WebView from 'react-native-webview';

interface FileViewerProps {
  file: Archive;
  style?: object;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState(1);
  const source = file.local_path 
    ? { uri: `file://${file.local_path}`, cache: true }
    : { uri: file.file_url, cache: true };

  const th = useColorScheme();
  const isDark = th === 'dark';

  if (file.file_type === 'pdf') {
  }
  return (
    <View style={[styles.container, isDark && styles.pdfDark]}>
      <Pdf
        source={source}
        style={[styles.pdf, numPages === 1 && styles.singlePagePdf]}
        trustAllCerts={false}
        onLoadComplete={(numberOfPages) => {
          setNumPages(numberOfPages);
          console.log(`Loaded ${numberOfPages} pages`);
        }}
        spacing={1}
        onError={(error) => {
          console.error(`PDF Error: ${error}`);
        }}
        showsVerticalScrollIndicator={true}
        // horizontal={true}
      />
    </View>
  );

  // return (
  //   <WebView 
  //     source={source} 
  //     style={[styles.webview, style]}
  //     onError={(syntheticEvent) => {
  //       const { nativeEvent } = syntheticEvent;
  //       console.warn('WebView error: ', nativeEvent);
  //     }}
  //   />
  // );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 500,
  },
  pdf: {
    // backgroundColor: theme.color.dark.background.primary,
    flex: 1,
    width: Dimensions.get('window').width,
    height:Dimensions.get('window').height,
  },
  singlePagePdf: {
    height: Dimensions.get('window').height,
  },
  pdfDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  webview: {
    flex: 1,
    height: 500,
  },
});