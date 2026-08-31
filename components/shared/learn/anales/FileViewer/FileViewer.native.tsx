import React, { useState, useEffect } from 'react';
import {View, useColorScheme, StyleSheet, Dimensions, Platform, Text} from 'react-native';
// Conditional import for native platforms only
const [PdfComponent, setPdfComponent] = useState<any>(null);

useEffect(() => {
  if (Platform.OS !== 'web') {
    import('react-native-pdf')
      .then((mod) => setPdfComponent(() => mod.default))
      .catch((error) => logger.error('Failed to load PDF component', error));
  }
}, []);
import * as ScreenCapture from 'expo-screen-capture';

import {theme} from "@/constants/theme";
import { logger } from '@/utils/logger';

// Interface minimale commune aux fichiers (anales + secondary_documents)
export interface FileViewerFile {
    file_url?: string;      // Pour Archive
    download_url?: string;  // Pour SecondaryDocument
    local_path?: string;    // Pour téléchargements locaux
}

export interface FileViewerProps {
    file: FileViewerFile;
    style?: object;
}



// Shared styles
export const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: 500,
    },
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
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

export const FileViewer: React.FC<FileViewerProps> = ({ file }) => {
    const [numPages, setNumPages] = useState(1);
    // Récupérer l'URL : local_path > download_url (SecondaryDocument) > file_url (Archive)
    const fileUrl = file.local_path
        ? `file://${file.local_path}`
        : file.download_url || file.file_url;

    const source = { uri: fileUrl, cache: true };

    const th = useColorScheme();
    const isDark = th === 'dark';

    // Prevent screenshots
    useEffect(() => {
        const preventScreenshots = async () => {
            try {
                // Prevent screenshots
                await ScreenCapture.preventScreenCaptureAsync();
            } catch (error) {
                logger.error('Error preventing screen capture:', error);
            }
        };

        preventScreenshots();

        // Re-enable screenshots when component unmounts
        return () => {
            const allowScreenshots = async () => {
                try {
                    await ScreenCapture.allowScreenCaptureAsync();
                } catch (error) {
                    logger.error('Error allowing screen capture:', error);
                }
            };

            allowScreenshots();
        };
    }, []);

    // If PDF component is unavailable (e.g., on web), show a placeholder
    if (!PdfComponent) {
        return (
            <View style={[styles.container, isDark && styles.pdfDark]}>
                <Text style={{ color: isDark ? '#FFFFFF' : '#000000', textAlign: 'center', marginTop: 20 }}>
                    PDF preview is not supported on this platform.
                </Text>
            </View>
        );
    }
    return (
        <View style={[styles.container, isDark && styles.pdfDark]}>
            <PdfComponent
                source={source}
                style={[styles.pdf, numPages === 1 && styles.singlePagePdf]}
                trustAllCerts={false}
                onLoadComplete={(numberOfPages: number) => {
                    setNumPages(numberOfPages);
                }}
                spacing={1}
                onError={(error: any) => {
                    logger.error(`PDF Error: ${error}`);
                }}
                showsVerticalScrollIndicator={true}
            />
        </View>
    );
};
