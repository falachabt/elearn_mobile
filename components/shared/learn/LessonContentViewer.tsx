import { Platform, View, Dimensions, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface LessonContentViewerProps {
  sectionId: string | string[];
  isDark: boolean;
  webViewUrls: { course_url?: string } | null;
  session: { access_token?: string } | null;
  webViewRef: React.RefObject<WebView | null>;
  isWebViewLoaded: boolean;
  darkModeScript: string;
  isListening: boolean;
  onLoadProgress: (progress: number) => void;
  onWebViewLoaded: () => void;
  onContentLoaded: () => void;
  onScrolledToEnd: () => void;
}

export const LessonContentViewer = ({
  sectionId,
  isDark,
  webViewUrls,
  session,
  webViewRef,
  isWebViewLoaded,
  darkModeScript,
  isListening,
  onLoadProgress,
  onWebViewLoaded,
  onContentLoaded,
  onScrolledToEnd,
}: LessonContentViewerProps) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webViewContainer}>
        <iframe
          src={`${webViewUrls?.course_url}/${sectionId}${isDark ? '?theme=dark' : '?theme=light'}&device=web`}
          style={{
            width: Dimensions.get("window").width >= 640 ? '100%' : '117%',
            left: Dimensions.get("window").width >= 640 ? 0 : "-8%",
            position: Dimensions.get("window").width >= 640 ? 'relative' : 'absolute',
            height: '100%',
            border: 'none',
            backgroundColor: isDark ? "#111827" : '#FFFFFF',
          }}
          onLoad={() => {
            onWebViewLoaded();
            onLoadProgress(1);
          }}
        />
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{
        uri: `${webViewUrls?.course_url}/${sectionId}?theme=${isDark ? "dark" : "light"}`,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "color-scheme": isDark ? "dark" : "light",
        },
      }}
      style={[
        styles.webView,
        isDark && styles.webViewDark,
        !isWebViewLoaded && styles.hiddenWebView
      ]}
      originWhitelist={["*"]}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      cacheEnabled={true}
      cacheMode="LOAD_CACHE_ELSE_NETWORK"
      onShouldStartLoadWithRequest={() => true}
      startInLoadingState={true}
      onLoadProgress={({ nativeEvent }) => {
        onLoadProgress(nativeEvent.progress);
      }}
      onLoadEnd={() => {
        onWebViewLoaded();
      }}
      renderLoading={() => <View />}
      injectedJavaScript={darkModeScript}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === "contentLoaded") {
            onContentLoaded();
          }
          if (isListening && data.type === "scrolledToEnd") {
            onScrolledToEnd();
          }
        } catch {
          // Ignore malformed messages
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  webView: {
    flex: 1,
    left: "-10%",
    width: "120%",
    backgroundColor: "#FFFFFF",
  },
  webViewDark: {
    backgroundColor: "#111827",
  },
  hiddenWebView: {
    opacity: 0,
  },
});
