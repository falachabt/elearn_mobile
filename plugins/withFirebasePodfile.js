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

      // 2. Allow non-modular includes in framework modules AND disable the error globally
      const postInstallPatch = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        
        # Ensure we do not treat this warning as an error
        cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
        if cflags.is_a?(Array)
          cflags << '-Wno-error=non-modular-include-in-framework-module'
        else
          cflags = cflags + ' -Wno-error=non-modular-include-in-framework-module'
        end
        config.build_settings['OTHER_CFLAGS'] = cflags
      end
    end
`;
      // We will replace the previous patch
      contents = contents.replace(
        /installer\.pods_project\.targets\.each do \|target\|[\s\S]*?end\n    end/m,
        postInstallPatch.trim()
      );

      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};
