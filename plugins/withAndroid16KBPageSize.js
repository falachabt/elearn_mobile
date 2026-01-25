const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo config plugin to add 16 KB page size support for Android
 * 
 * This is required by Google Play Store to ensure compatibility with
 * devices that use 16 KB memory page sizes.
 * 
 * Reference: https://developer.android.com/guide/practices/page-sizes
 */
const withAndroid16KBPageSize = (config) => {
  return withGradleProperties(config, (config) => {
    const gradleProperties = config.modResults;

    // Add or update the android.bundle.enableUncompressedNativeLibs property
    // This ensures native libraries are properly aligned for 16KB page sizes
    const enableUncompressedNativeLibsIndex = gradleProperties.findIndex(
      (prop) => prop.key === 'android.bundle.enableUncompressedNativeLibs'
    );

    if (enableUncompressedNativeLibsIndex >= 0) {
      gradleProperties[enableUncompressedNativeLibsIndex].value = 'false';
    } else {
      gradleProperties.push({
        type: 'property',
        key: 'android.bundle.enableUncompressedNativeLibs',
        value: 'false',
      });
    }

    return config;
  });
};

module.exports = withAndroid16KBPageSize;
