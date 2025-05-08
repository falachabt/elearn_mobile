import React, { useState } from 'react';
import {View, useColorScheme, StyleSheet, Dimensions} from 'react-native';
import Pdf from 'react-native-pdf';
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
    const [numPages, setNumPages] = useState(1);
    const source = file.local_path
        ? { uri: `file://${file.local_path}`, cache: true }
        : { uri: file.file_url, cache: true };

    const th = useColorScheme();
    const isDark = th === 'dark';

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
            />
        </View>
    );
};