const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebasePodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      // Remove the previous modular headers patch if it's there
      contents = contents.replace(/pod 'FirebaseAuthInterop', :modular_headers => true\n\s+/g, '');
      contents = contents.replace(/pod 'FirebaseAppCheckInterop', :modular_headers => true\n\s+/g, '');
      contents = contents.replace(/pod 'GoogleUtilities', :modular_headers => true\n\s+/g, '');
      contents = contents.replace(/pod 'RecaptchaInterop', :modular_headers => true\n\s+/g, '');

      // Add post-install hook to allow non-modular includes in RNFBApp and other targets
      const postInstallPatch = `
    installer.pods_project.targets.each do |target|
      if target.name.start_with?("RNFB")
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
`;

      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        // Insert inside the post_install hook
        // Look for the end of the post_install block, or just insert it at the end of react_native_post_install
        contents = contents.replace(
          /react_native_post_install\((.*?)\)/,
          `react_native_post_install($1)\n${postInstallPatch}`
        );
        fs.writeFileSync(podfile, contents);
      }
      
      return config;
    },
  ]);
};
