# Support Android 16 KB Page Size

## Issue
Google Play Store requires apps to support 16 KB memory page sizes for compatibility with newer Android devices that use this page size configuration.

## Solution
This project now includes an Expo config plugin that ensures the Android build is compatible with 16 KB page sizes.

## Implementation Details

### Plugin: `plugins/withAndroid16KBPageSize.js`
The plugin modifies the Android `gradle.properties` file to set:
```
android.bundle.enableUncompressedNativeLibs=false
```

This setting ensures that native libraries are properly aligned for 16KB page sizes by keeping them compressed in the APK/AAB, which allows the Android runtime to properly handle page alignment.

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
3. During EAS build, the gradle.properties file will contain the required setting

## References
- [Google Play 16KB page sizes requirement](https://developer.android.com/guide/practices/page-sizes)
- [Expo Config Plugins Documentation](https://docs.expo.dev/guides/config-plugins/)
