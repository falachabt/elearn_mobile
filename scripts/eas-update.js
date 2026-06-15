#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

const CHANNELS = ['development', 'preview', 'production'];

async function main() {
  // CLI args: node eas-update.js [channel]
  const argChannel = process.argv[2];
  if (argChannel && !CHANNELS.includes(argChannel)) {
    console.error(`✗ Unknown channel "${argChannel}". Valid: ${CHANNELS.join(', ')}`);
    process.exit(1);
  }

  // 1. Switch to native
  console.log('\n→ Switching imports to native...');
  run('node scripts/switch-platform.js native');

  // 2. Get 3 latest git tags
  let tags;
  try {
    const raw = run('git tag --sort=-creatordate');
    tags = raw.split('\n').filter(t => /^v?\d+\.\d+/.test(t)).slice(0, 3);
  } catch {
    console.error('✗ Could not read git tags. Make sure you are in a git repo with tags.');
    process.exit(1);
  }

  if (tags.length === 0) {
    console.error('✗ No git tags found.');
    process.exit(1);
  }

  console.log('\n3 latest git tags:');
  tags.forEach((t, i) => console.log(`  ${i === 0 ? '→' : ' '} ${t}`));

  const selectedTag = tags[0];
  console.log(`\n→ Auto-selected: ${selectedTag}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // 4. Write selected tag as version in app.json (strip leading "v")
  const semver = selectedTag.replace(/^v/, '').replace(/-r\d+$/, '');
  const appJsonPath = path.join(ROOT, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const prevVersion = appJson?.expo?.version;
  appJson.expo.version = semver;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  console.log(`\n→ app.json version: ${prevVersion} → ${semver}`);

  // 5. Pick a channel (skip if passed as arg)
  let selectedChannel = argChannel;
  if (!selectedChannel) {
    console.log('\nChannels:');
    CHANNELS.forEach((c, i) => console.log(`  [${i + 1}] ${c}`));

    const chChoice = await prompt(rl, `\nSelect channel [1-${CHANNELS.length}]: `);
    const chIndex = parseInt(chChoice, 10) - 1;
    if (isNaN(chIndex) || chIndex < 0 || chIndex >= CHANNELS.length) {
      console.error('✗ Invalid selection.');
      rl.close();
      process.exit(1);
    }
    selectedChannel = CHANNELS[chIndex];
  } else {
    console.log(`→ Channel: ${selectedChannel}`);
  }

  // 6. Optional custom message (skip prompt if channel was pre-set via arg)
  const defaultMsg = selectedTag;
  let message;
  if (argChannel) {
    message = defaultMsg;
    console.log(`→ Message: ${message}`);
    rl.close();
  } else {
    const msgInput = await prompt(rl, `\nUpdate message [Enter for "${defaultMsg}"]: `);
    message = msgInput.trim() || defaultMsg;
    rl.close();
  }

  // 7. Run eas update (android only — web bundle breaks in native mode, prod is android)
  const cmd = 'eas';
  const args = ['update', '--branch', selectedChannel, '--platform', 'android', '--message', message];

  console.log(`\n→ Running: ${cmd} ${args.join(' ')}\n`);

  const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true });
  child.on('exit', code => process.exit(code ?? 0));
}

main().catch(err => {
  console.error('✗', err.message);
  process.exit(1);
});
