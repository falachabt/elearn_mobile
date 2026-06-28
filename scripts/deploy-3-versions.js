const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = process.cwd();
const appJsonPath = path.join(ROOT, 'app.json');

console.log('1. Switching platform to native...');
execSync('node scripts/switch-platform.js native', { stdio: 'inherit' });

const versions = ['2.0.0', '1.1.7', '1.1.6'];
const originalAppJson = fs.readFileSync(appJsonPath, 'utf8');
const parsedAppJson = JSON.parse(originalAppJson);

try {
  for (const version of versions) {
    console.log('\n======================================');
    console.log('2. Updating app.json to version: ' + version);
    parsedAppJson.expo.version = version;
    fs.writeFileSync(appJsonPath, JSON.stringify(parsedAppJson, null, 2) + '\n');
    
    console.log('3. Running eas update for version ' + version + '...');
    execSync('eas update --branch production --platform android --message \"Fix LaTeX rendering for logic quizzes\" --auto', { stdio: 'inherit' });
  }
} finally {
  console.log('\n======================================');
  console.log('Restoring original app.json version...');
  fs.writeFileSync(appJsonPath, originalAppJson);
  console.log('Done.');
}
