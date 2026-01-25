# Support Android 16 KB Page Size

## Issue
Google Play Store requires apps to support 16 KB memory page sizes for compatibility with newer Android devices that use this page size configuration.

## Solution
This project now includes an Expo config plugin that ensures the Android build is compatible with 16 KB page sizes.

## Implementation Details

### Plugin: `plugins/withAndroid16KBPageSize.js`
The plugin modifies the Android `AndroidManifest.xml` file to set:
```xml
<application android:extractNativeLibs="false">
```

This setting ensures that native libraries remain compressed in the APK/AAB and are properly aligned for 16KB page sizes, allowing devices with 16KB memory pages to load them correctly.

### Configuration
The plugin is added to `app.json` in the `plugins` array:
```json
"plugins": [
  "expo-router",
  "expo-apple-authentication",
  "./plugins/withAndroid16KBPageSize.js",
  ...
]
```

## Building with EAS Build
When building with EAS Build, the plugin will automatically be applied during the prebuild phase. No additional configuration is needed.

```bash
# Production build
npm run build:production

# Preview build
npm run build:preview
```

## Testing
To verify the configuration is applied:
1. Run `npx expo config --type public` to see the configuration
2. The plugin should be listed in the plugins array
3. During EAS build, the AndroidManifest.xml will contain the required attribute

## Technical Background
Previously, this was configured via the `android.bundle.enableUncompressedNativeLibs` gradle property, but that property was deprecated and removed in Android Gradle Plugin 8.1+. The manifest-based approach using `android:extractNativeLibs="false"` is now the official method for supporting 16KB page sizes.

## References
- [Google Play 16KB page sizes requirement](https://developer.android.com/guide/practices/page-sizes)
- [Expo Config Plugins Documentation](https://docs.expo.dev/guides/config-plugins/)
