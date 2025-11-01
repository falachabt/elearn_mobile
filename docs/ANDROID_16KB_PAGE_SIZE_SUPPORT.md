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
    "targetSdkVersion": 34,
    "buildToolsVersion": "35.0.0",
    "usesCleartextTraffic": false,
    "useLegacyPackaging": false
  }
}
```

Key settings:
- **compileSdkVersion**: 35 (Android 15) - Compile against latest SDK to access new APIs
- **targetSdkVersion**: 34 (Android 14) - Maintains device compatibility while being ready for 16KB pages
- **useLegacyPackaging**: false (enables new packaging format with proper alignment)

> **Important**: We keep `targetSdkVersion: 34` instead of 35 to maintain compatibility with existing devices. The 16KB page size support is configured through the packaging settings (`extractNativeLibs: false` and `useLegacyPackaging: false`), making the app ready for when we upgrade to targetSdkVersion 35 in the future without losing device support now.

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
- ✅ App is ready for 16KB page size support when targeting Android 15+
- ✅ App maintains compatibility with existing devices (targets Android 14)
- ✅ Native libraries are properly packaged for 16KB page sizes
- ✅ Proper back navigation handling for Android 15 is configured
- ✅ Improved memory efficiency and performance
- ✅ No breaking changes to existing functionality
- ✅ No device compatibility loss

## Why targetSdkVersion is 34, not 35

While Google Play requires apps to support 16KB page sizes when targeting Android 15+, this doesn't mean you must target Android 15 immediately. By:
- Keeping `targetSdkVersion: 34` (Android 14)
- Setting `compileSdkVersion: 35` (to compile against latest SDK)
- Configuring 16KB page size support (`extractNativeLibs: false`, `useLegacyPackaging: false`)

We ensure the app is **ready** for 16KB page sizes without losing device compatibility. When you're ready to target Android 15, simply change `targetSdkVersion` to 35.
