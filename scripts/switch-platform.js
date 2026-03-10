const fs = require('fs');
const path = require('path');

// Function to process a file and update imports
function processFile(filePath, platform) {
  try {
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Define the import patterns and their replacements
    const patterns = [
      {
        // Pattern for web import
        regex: /import\s+\{\s*FileViewer\s*\}\s+from\s+["']@\/components\/shared\/learn\/anales\/FileViewer\/FileViewer\.(web|native)["'];/g,
        replacement: `import {FileViewer} from "@/components/shared/learn/anales/FileViewer/FileViewer.${platform}";`
      },
      {
        // Pattern for native import with alias
        regex: /import\s+\{\s*FileViewer\s+as\s+FileViewerNative\s*\}\s+from\s+["']@\/components\/shared\/learn\/anales\/FileViewer\/FileViewer\.(web|native)["'];/g,
        replacement: `import {FileViewer as FileViewerNative} from "@/components/shared/learn/anales/FileViewer/FileViewer.${platform}";`
      }
    ];
    
    // Apply each pattern
    patterns.forEach(pattern => {
      content = content.replace(pattern.regex, pattern.replacement);
    });
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${filePath} for ${platform} platform`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Main function
function switchPlatform(platform) {
  if (platform !== 'web' && platform !== 'native') {
    console.error('Invalid platform. Use "web" or "native".');
    process.exit(1);
  }
  
  console.log(`Switching imports to ${platform} platform...`);
  
  // List of files to process
  const filesToProcess = [
    path.join(__dirname, '..', 'app', '(app)', 'learn', '[pdId]', 'anales', '[filePath]', '[fileId].tsx'),
    path.join(__dirname, '..', 'app', '(app)', 'manuel', 'anciens-sujets', '[competitionId]', '[filePath]', '[fileId].tsx'),
    path.join(__dirname, '..', 'app', '(app)', 'secondary', 'program', '[programId]', 'documents', '[documentId].tsx')
  ];
  
  // Process each file
  filesToProcess.forEach(file => {
    if (fs.existsSync(file)) {
      processFile(file, platform);
    } else {
      console.warn(`File not found: ${file}`);
    }
  });
  
  console.log(`Successfully switched imports to ${platform} platform.`);
}

// Check if platform argument is provided
if (process.argv.length < 3) {
  const platform = "web";
  switchPlatform(platform);
  process.exit(1);
}

// Run the script with the provided platform
switchPlatform(process.argv[2]);

// Execute remaining arguments as a command if provided
if (process.argv.length > 3) {
  const { spawn } = require('child_process');
  const command = process.argv[3];
  const args = process.argv.slice(4);
  
  console.log(`\nExecuting: ${command} ${args.join(' ')}\n`);
  
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('exit', (code) => {
    process.exit(code);
  });
}