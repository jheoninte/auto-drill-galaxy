import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const files = ['docs/MONETIZATION_REVIEW.md','docs/PLAYER_FLOW_REVIEW.md','docs/LOCALIZATION_REVIEW.md','docs/LAUNCH_CONTENT_REVIEW.md','docs/RELEASE_SCOPE_V1.md','docs/VISUAL_ASSET_PLAN.md','docs/LOCALIZATION_PLAN.md','docs/MONTHLY_BALANCE_REVIEW.md',
  'web-prototype/game/data/campaign.json','web-prototype/game/data/launch-content.json',
  'web-prototype/index.html','web-prototype/app.js','web-prototype/styles.css',
  'web-prototype/i18n/index.js','web-prototype/i18n/locale.js','web-prototype/i18n/result.js',
  'web-prototype/i18n/locales/ko.json','web-prototype/i18n/locales/en.json','web-prototype/i18n/locales/ja.json'];
// Deliberate allowlist: never walk the workspace, credentials, local browser data or .git.
for (const dir of ['game','ui','platform']) {
  for (const name of (await readdir(new URL(`web-prototype/${dir}/`,root))).sort()) {
    if (name.endsWith('.js')) files.push(`web-prototype/${dir}/${name}`);
  }
}
const parts = ['Auto Drill Galaxy release context. Current code and approved scope; planned features are not implemented unless stated.\n'];
for (const path of files) parts.push(`\n===== ${path} =====\n${await readFile(new URL(path,root),'utf8')}`);
await mkdir(new URL('tools/handoffs/',root),{recursive:true});
await writeFile(new URL('tools/handoffs/gemini-release-context.txt',root),parts.join('\n'),'utf8');
console.log(`Prepared ${files.length} approved source/document files in tools/handoffs/gemini-release-context.txt. No prompt sent.`);
