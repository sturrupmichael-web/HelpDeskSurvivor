// Copies the files the live site serves into one folder (default _site/), for the
// Deploy workflow (.github/workflows/deploy.yml). Run `npm run build` first.
// Anything not listed here (src/, dev.html, notes, SQL) stays out of the public site.

import { cpSync, mkdirSync, rmSync } from 'node:fs';

export const SITE_FILES = [
  'index.html', 'sw.js', 'manifest.webmanifest', 'privacy.html', 'terms.html',
  'CNAME', '.nojekyll', 'icons', 'sprites/out',
];

const out = process.argv[2] ?? '_site';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of SITE_FILES) cpSync(f, `${out}/${f}`, { recursive: true });
console.log(`${out}/: ${SITE_FILES.length} entries`);
