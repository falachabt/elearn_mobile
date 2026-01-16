
import React from 'react';
import {View, useColorScheme, StyleSheet, Dimensions, Platform} from 'react-native';

import {theme} from "@/constants/theme";

// Interface minimale commune aux fichiers (anales + secondary_documents)
export interface FileViewerFile {
    file_url?: string;      // Pour Archive
    download_url?: string;  // Pour SecondaryDocument
}

export interface FileViewerProps {
    file: FileViewerFile;
    fileName?: string;  // Optionnel, utilisé pour le titre de l'iframe
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

export const FileViewer: React.FC<FileViewerProps> = ({ file, fileName }) => {
    const th = useColorScheme();
    const isDark = th === 'dark';
    // Récupérer l'URL : download_url (SecondaryDocument) ou file_url (Archive)
    const fileUrl = file.download_url || file.file_url;

    return (
        <View style={[styles.container, isDark && styles.pdfDark]}>
            {
                Platform.OS === 'web' && fileUrl && (
                    <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                            style={{
                                width : '100%',
                                height : '100%',
                                border : 'none'
                            }}
                            title={fileName || 'Document'}
                            />
                )
            }
        </View>
    );
};