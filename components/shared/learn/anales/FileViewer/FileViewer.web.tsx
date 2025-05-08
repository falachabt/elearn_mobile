import React from 'react';
import {View, useColorScheme, StyleSheet, Dimensions} from 'react-native';
import {Archive} from "@/app/(app)/learn/[pdId]/anales";
import {theme} from "@/constants/theme";

export interface FileViewerProps {
    file: Archive;
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
    const th = useColorScheme();
    const isDark = th === 'dark';

    return (
        <View style={[styles.container, isDark && styles.pdfDark]}>
            <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.file_url)}&embedded=true`}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                }}
                title="PDF Viewer"
            />
        </View>
    );
};