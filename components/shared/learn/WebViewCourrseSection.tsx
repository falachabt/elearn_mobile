import React, { forwardRef } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';

interface PreloadWebViewProps {
    url: string;
    isDark: boolean;
    onMessage?: (event: { nativeEvent: { data: string } }) => void;
    injectedJavaScript?: string;
    onLoadProgress?: (progress: { nativeEvent: { progress: number } }) => void;
}

const PreloadWebView = forwardRef<WebView, PreloadWebViewProps>(
    ({ url, onMessage, injectedJavaScript, onLoadProgress }, ref) => {
        return (
            <WebView
                ref={ref}
                source={{ uri: url }}
                originWhitelist={["*"]}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                cacheEnabled={true}
                cacheMode="LOAD_CACHE_ELSE_NETWORK"
                thirdPartyCookiesEnabled={true}
                sharedCookiesEnabled={true}
                onShouldStartLoadWithRequest={() => true}
                startInLoadingState={true}
                injectedJavaScript={injectedJavaScript}
                onMessage={onMessage}
                onLoadProgress={onLoadProgress}
                style={styles.webview}
                scrollEnabled={true}
                bounces={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={true}
            />
        );
    }
);

const styles = StyleSheet.create({
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    }
});

export default PreloadWebView;