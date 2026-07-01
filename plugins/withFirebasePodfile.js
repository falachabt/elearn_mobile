const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebasePodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      // Remove the previous patches
      contents = contents.replace(/\$RNFirebaseAsStaticFramework = true\n/g, '');
      contents = contents.replace(
        /installer\.pods_project\.targets\.each do \|target\|[\s\S]*?end\n    end\n/m,
        ''
      );

      // Add :modular_headers => true to the pods causing the Swift error
      const podsToPatch = [
        "pod 'FirebaseAuth', :modular_headers => true",
        "pod 'FirebaseCoreInternal', :modular_headers => true",
        "pod 'FirebaseAuthInterop', :modular_headers => true",
        "pod 'FirebaseAppCheckInterop', :modular_headers => true",
        "pod 'GoogleUtilities', :modular_headers => true",
        "pod 'RecaptchaInterop', :modular_headers => true"
      ];

      const patchString = podsToPatch.join('\n  ');

      if (!contents.includes('FirebaseAuthInterop')) {
        // Insert inside the target block, right before use_react_native!
        contents = contents.replace(
          /use_react_native!\(/g,
          `${patchString}\n  use_react_native!(`
        );
      }
      
      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};
