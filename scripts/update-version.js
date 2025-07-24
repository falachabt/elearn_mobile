const fs = require('fs');
const path = require('path');

// Function to update the version in app.json
function updateAppVersion(newVersion) {
  try {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    
    // Read the current app.json
    const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(appJsonContent);
    
    // Update the version
    const oldVersion = appJson.expo.version;
    appJson.expo.version = newVersion;
    
    // Write the updated app.json back
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    
    console.log(`✅ Successfully updated app version from ${oldVersion} to ${newVersion}`);
    console.log(`📄 Updated file: ${appJsonPath}`);
    
    return { oldVersion, newVersion };
  } catch (error) {
    console.error('❌ Error updating app version:', error.message);
    process.exit(1);
  }
}

// Function to validate version format (basic semver check)
function validateVersion(version) {
  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}

// Main function
function main() {
  // Check if version argument is provided
  if (process.argv.length < 3) {
    console.error('❌ Error: Version argument is required');
    console.log('Usage: node update-version.js <version>');
    console.log('Example: node update-version.js 1.0.5');
    process.exit(1);
  }
  
  const newVersion = process.argv[2];
  
  // Validate version format
  if (!validateVersion(newVersion)) {
    console.error('❌ Error: Invalid version format. Expected format: X.Y.Z (e.g., 1.0.5)');
    process.exit(1);
  }
  
  console.log(`🔄 Updating app version to ${newVersion}...`);
  updateAppVersion(newVersion);
}

// Run the script
main();