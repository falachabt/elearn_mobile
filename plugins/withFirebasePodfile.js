const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebasePodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      // 1. Tell React Native Firebase that we are building static frameworks
      const rnfbStaticPatch = `$RNFirebaseAsStaticFramework = true\n`;
      if (!contents.includes('$RNFirebaseAsStaticFramework')) {
        contents = rnfbStaticPatch + contents;
      }

      // 2. Allow non-modular includes in framework modules for RNFB to fix React-Core conflict
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
        contents = contents.replace(
          /react_native_post_install\((.*?)\)/,
          `react_native_post_install($1)\n${postInstallPatch}`
        );
      }

      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};
