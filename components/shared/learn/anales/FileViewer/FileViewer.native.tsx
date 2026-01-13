import React, { useState, useEffect } from 'react';
import {View, useColorScheme, StyleSheet, Dimensions} from 'react-native';
import Pdf from 'react-native-pdf';
import * as ScreenCapture from 'expo-screen-capture';

import {theme} from "@/constants/theme";

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
                console.error('Error preventing screen capture:', error);
            }
        };

        preventScreenshots();

        // Re-enable screenshots when component unmounts
        return () => {
            const allowScreenshots = async () => {
                try {
                    await ScreenCapture.allowScreenCaptureAsync();
                } catch (error) {
                    console.error('Error allowing screen capture:', error);
                }
            };

            allowScreenshots();
        };
    }, []);

    return (
        <View style={[styles.container, isDark && styles.pdfDark]}>
            <Pdf
                source={source}
                style={[styles.pdf, numPages === 1 && styles.singlePagePdf]}
                trustAllCerts={false}
                onLoadComplete={(numberOfPages) => {
                    setNumPages(numberOfPages);
                }}
                spacing={1}
                onError={(error) => {
                    console.error(`PDF Error: ${error}`);
                }}
                showsVerticalScrollIndicator={true}
            />
        </View>
    );
};
