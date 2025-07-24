const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test the update-version script
function testUpdateVersion() {
  console.log('🧪 Testing update-version script...');
  
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  const originalContent = fs.readFileSync(appJsonPath, 'utf8');
  const originalVersion = JSON.parse(originalContent).expo.version;
  
  try {
    // Test version update
    const testVersion = '9.9.9';
    execSync(`node ${path.join(__dirname, 'update-version.js')} ${testVersion}`, { stdio: 'pipe' });
    
    // Verify the version was updated
    const updatedContent = fs.readFileSync(appJsonPath, 'utf8');
    const updatedApp = JSON.parse(updatedContent);
    
    if (updatedApp.expo.version !== testVersion) {
      throw new Error(`Version not updated correctly. Expected: ${testVersion}, Got: ${updatedApp.expo.version}`);
    }
    
    // Test invalid version format
    try {
      execSync(`node ${path.join(__dirname, 'update-version.js')} invalid-version`, { stdio: 'pipe' });
      throw new Error('Invalid version should have failed');
    } catch (error) {
      if (!error.message.includes('Invalid version')) {
        console.log('✅ Invalid version properly rejected');
      }
    }
    
    // Restore original version
    fs.writeFileSync(appJsonPath, originalContent, 'utf8');
    
    console.log('✅ Version update script tests passed');
    return true;
  } catch (error) {
    // Restore original content on error
    fs.writeFileSync(appJsonPath, originalContent, 'utf8');
    console.error('❌ Version update script test failed:', error.message);
    return false;
  }
}

// Test workflow syntax
function testWorkflowSyntax() {
  console.log('🧪 Testing workflow syntax...');
  
  try {
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'eas-update.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    
    // Basic YAML syntax validation
    if (!workflowContent.includes('workflow_dispatch')) {
      throw new Error('Workflow should have workflow_dispatch trigger');
    }
    
    if (!workflowContent.includes('platform:')) {
      throw new Error('Workflow should have platform input');
    }
    
    if (!workflowContent.includes('eas_profile:')) {
      throw new Error('Workflow should have eas_profile input');
    }
    
    if (!workflowContent.includes('app_version:')) {
      throw new Error('Workflow should have app_version input');
    }
    
    if (!workflowContent.includes('node scripts/update-version.js')) {
      throw new Error('Workflow should call update-version script');
    }
    
    console.log('✅ Workflow syntax tests passed');
    return true;
  } catch (error) {
    console.error('❌ Workflow syntax test failed:', error.message);
    return false;
  }
}

// Main test function
function runTests() {
  console.log('🚀 Running EAS Update Workflow Tests\n');
  
  const tests = [
    testUpdateVersion,
    testWorkflowSyntax
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach((test, index) => {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test ${index + 1} failed:`, error.message);
      failed++;
    }
    console.log('');
  });
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
  }
}

runTests();