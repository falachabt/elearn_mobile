# Android 16KB Page Size Support

## Overview

This document explains the configuration changes made to support Android 15's requirement for 16KB memory page sizes, as mandated by Google Play for apps targeting Android 15 or later.

## Background

Starting with Android 15 (API level 35), Google Play requires all apps to support devices with 16KB memory page sizes. This is important for:
- Compatibility with newer Android devices
- Improved performance and memory efficiency
- Compliance with Google Play requirements

## Implementation

### 1. Updated Build Configuration (`app.json`)

Added the `expo-build-properties` plugin with Android-specific configurations:

```json
{
  "android": {
    "enableProguardInReleaseBuilds": true,
    "enableShrinkResourcesInReleaseBuilds": true,
    "compileSdkVersion": 35,
    "targetSdkVersion": 35,
    "buildToolsVersion": "35.0.0",
    "usesCleartextTraffic": false,
    "useLegacyPackaging": false
  }
}
```

Key settings:
- **compileSdkVersion**: 35 (Android 15)
- **targetSdkVersion**: 35 (Android 15)
- **useLegacyPackaging**: false (enables new packaging format with proper alignment)

### 2. Custom Config Plugin (`plugins/withAndroid16KBPageSize.js`)

Created a custom Expo config plugin that modifies the AndroidManifest.xml to:

1. **Set `android:extractNativeLibs="false"`**: This ensures native libraries (.so files) are loaded directly from the APK with proper alignment for 16KB page sizes, rather than being extracted to the file system.

2. **Set `android:enableOnBackInvokedCallback="true"`**: Enables the predictive back gesture system introduced in Android 15.

### 3. Dependencies

Added `expo-build-properties` package to enable native build configuration through Expo:

```bash
npx expo install expo-build-properties
```

## How It Works

### Native Library Packaging

When `useLegacyPackaging=false` and `extractNativeLibs="false"`:

1. Native libraries (.so files) remain inside the APK
2. Libraries are aligned to page boundaries (16KB on newer devices)
3. Libraries are memory-mapped directly from the APK
4. This approach supports both 4KB and 16KB page sizes

### Build Process

During the build process:

1. Expo prebuild generates the native Android project
2. The custom plugin modifies AndroidManifest.xml
3. Gradle applies the build properties from `expo-build-properties`
4. The APK is created with properly aligned native libraries

## Testing

To test the configuration:

1. **Generate Android project**:
   ```bash
   npx expo prebuild --platform android
   ```

2. **Verify configuration**:
   - Check `android/gradle.properties` for SDK versions and packaging settings
   - Check `android/app/src/main/AndroidManifest.xml` for the application attributes

3. **Build the app**:
   ```bash
   eas build --platform android --profile production
   ```

## References

- [Android 16KB Page Size Support](https://developer.android.com/guide/practices/page-sizes)
- [Google Play Requirements](https://support.google.com/googleplay/android-developer/answer/14906454)
- [Expo Build Properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)

## Impact

After these changes:
- ✅ App complies with Google Play requirements for Android 15+
- ✅ App supports devices with 16KB memory page sizes
- ✅ Proper back navigation handling for Android 15
- ✅ Improved memory efficiency and performance
- ✅ No breaking changes to existing functionality
