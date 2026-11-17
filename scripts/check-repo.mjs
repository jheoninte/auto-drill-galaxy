import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'docs/GAME_DESIGN_SPEC.md',
  'docs/PROGRESSION_SCHEMA.json',
  'docs/LIVEOPS_NOTES.md',
  'tools/balance_sheet.csv',
  'web-prototype/index.html',
  'web-prototype/styles.css',
  'web-prototype/platform/services.js',
  'web-prototype/platform/native.js',
  'capacitor.config.json',
  'vite.config.js',
  'docs/IOS_RELEASE_PLAN.md',
  'docs/MAC_HANDOFF.md'
];

const missing = [];
for (const file of required) {
  try {
    await access(path.join(rootDir, file));
  } catch {
    missing.push(file);
  }
}

if (missing.length) {
  console.error('Missing required files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log('Repository check passed.');
