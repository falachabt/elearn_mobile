import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

interface PreloadWebViewProps {
    uri: string;
    accessToken: string | undefined;
    isDark: boolean;
}

/**
 * A completely isolated and hidden WebView for preloading content
 */
const PreloadWebView = ({ uri, accessToken, isDark }: PreloadWebViewProps) => {
    const webViewRef = useRef(null);

    // Generate the injected JavaScript for dark mode
    const getInjectedScript = () => `(function() {
    function applyDarkMode() {
      if (${isDark}) {
        const container = document.querySelector('.bn-container');
        if (container) {
          container.classList.add('dark');
          container.setAttribute('data-color-scheme', 'dark');
          document.documentElement.style.setProperty('--bn-colors-editor-text', '#FFFFFF');
          document.documentElement.style.setProperty('--bn-colors-editor-background', '#111827');
          document.documentElement.style.setProperty('--bn-colors-menu-text', '#F3F4F6');
          document.documentElement.style.setProperty('--bn-colors-menu-background', '#1F2937');
          document.documentElement.style.setProperty('--bn-colors-editor-border', '#374151');
        }
      }
    }

    // Apply dark mode on load
    if (document.readyState === 'complete') {
      applyDarkMode();
    } else {
      document.addEventListener('DOMContentLoaded', applyDarkMode);
    }
  })();`;

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{
                    uri,
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "color-scheme": isDark ? "dark" : "light",
                    },
                }}
                originWhitelist={["*"]}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                cacheEnabled={true}
                cacheMode="LOAD_CACHE_ELSE_NETWORK"
                thirdPartyCookiesEnabled={true}
                sharedCookiesEnabled={true}
                onShouldStartLoadWithRequest={() => true}
                startInLoadingState={false} // Important: don't show loading state
                // renderLoading={() => null}
                injectedJavaScript={getInjectedScript()}
                // Simplify script - we just need it to load and cache
                style={styles.webview}
                // Force no interaction with the webview
                pointerEvents="none"
                // Prevent scroll events from propagating to parent
                scrollEnabled={false}
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
        // Position it out of view at the bottom of the screen
        bottom: -10,
        left: 0,
        // Ensure it doesn't affect layout
        zIndex: -1000,
    },
    webview: {
        width: 1,
        height: 1,
        opacity: 0,
        // Disable all user interaction
        pointerEvents: 'none',
    }
});

export default PreloadWebView;