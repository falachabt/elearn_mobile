const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to enable 16KB page size support for Android 15+
 * This adds the extractNativeLibs="false" attribute to the application tag
 * and enables proper back navigation handling for Android 15
 */
const withAndroid16KBPageSize = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Set extractNativeLibs to false for 16KB page size support
    // This ensures native libraries are loaded directly from the APK with proper alignment
    application.$['android:extractNativeLibs'] = 'false';

    // Enable predictive back gesture for Android 15+ compatibility
    application.$['android:enableOnBackInvokedCallback'] = 'true';

    return config;
  });
};

module.exports = withAndroid16KBPageSize;
