#!/usr/bin/env node
// scripts/package.mjs
//
// Builds dist/linear-workflow.skill from the linear-workflow/ source tree so
// the packaged artifact stays in parity with the repository source. Run this
// after editing the skill, then `npm run validate` to confirm the bundle is
// not stale.
import { existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'linear-workflow');
const out = join(root, 'dist', 'linear-workflow.skill');

if (!existsSync(src)) {
  console.error('source missing: ' + src);
  process.exit(1);
}
if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
if (!commandExists('zip')) {
  console.error('zip is required to package the skill artifact');
  process.exit(1);
}
// Remove the old artifact, then zip the skill directory (keeps the
// linear-workflow/ prefix expected by the parity check).
execSync(`rm -f "${out}"`, { stdio: 'ignore' });
execSync(`zip -r -X -q "${out}" linear-workflow`, { cwd: root, stdio: 'inherit' });
console.log('Packaged ' + out);

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
