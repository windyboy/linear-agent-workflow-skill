#!/usr/bin/env node
// Validates the linear-workflow template system:
//   1. Every template link referenced in README.md / linear-workflow/SKILL.md resolves.
//   2. Source/dist parity: dist/linear-workflow.skill bundles exactly linear-workflow/
//      (same file set and identical content).
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'linear-workflow');
const dist = join(root, 'dist', 'linear-workflow.skill');

let failures = 0;
const fail = (m) => { console.error('FAIL: ' + m); failures++; };
const ok = (m) => console.log('ok:   ' + m);

// 1. Template link resolution -------------------------------------------------
const linkRe = /(?:linear-workflow\/)?references\/templates\/[A-Za-z0-9._-]+\.md/g;
for (const rel of ['README.md', join('linear-workflow', 'SKILL.md')]) {
  const src = join(root, rel);
  if (!existsSync(src)) { fail(`source missing: ${rel}`); continue; }
  const text = readFileSync(src, 'utf8');
  const links = text.match(linkRe) || [];
  if (!links.length) { fail(`no template links found in ${rel}`); continue; }
  for (const l of links) {
    const norm = l.replace(/^linear-workflow\//, '');
    const target = join(root, 'linear-workflow', norm);
    if (existsSync(target)) ok(`link resolves: ${l} (${rel})`);
    else fail(`link does not resolve: ${l} (referenced in ${rel})`);
  }
}

// 2. Source/dist parity --------------------------------------------------------
if (!existsSync(dist)) {
  fail(`dist missing: ${dist}`);
} else {
  const tmp = mkdtempSync(join(tmpdir(), 'lw-skill-'));
  try {
    execSync(`unzip -o -q "${dist}" -d "${tmp}"`, { stdio: 'ignore' });
    const srcFiles = collect(pkg).map((r) => 'linear-workflow/' + r);
    const distFiles = collect(join(tmp, 'linear-workflow')).map((r) => 'linear-workflow/' + r);
    const srcSet = new Set(srcFiles);
    const distSet = new Set(distFiles);
    for (const f of srcFiles) if (!distSet.has(f)) fail(`source file missing from dist: ${f}`);
    for (const f of distFiles) if (!srcSet.has(f)) fail(`dist file not in source: ${f}`);
    for (const f of srcFiles) {
      if (!distSet.has(f)) continue;
      if (sha(join(root, f)) === sha(join(tmp, f))) ok(`parity: ${f}`);
      else fail(`content mismatch: ${f}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function collect(dir, base = '') {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const rel = base ? base + '/' + e : e;
    if (statSync(full).isDirectory()) out.push(...collect(full, rel));
    else out.push(rel);
  }
  return out;
}
function sha(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll template / source-dist parity checks passed.');
