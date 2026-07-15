#!/usr/bin/env node
// scripts/validate.mjs
//
// Single local validation entry point for the linear-workflow skill.
// Runs static consistency checks and the behavior scenario tests, then exits
// non-zero if any check fails. Designed to be the one documented command
// (`npm run validate`) and to run in CI for pull requests and the default
// branch.
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { IDENTIFIER_PATTERN, VALID_STATE_TYPES, NON_STATE_WORDS } from './policy.mjs';
import { runBehaviorTests } from './behavior.test.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = join(root, 'linear-workflow');
const dist = join(root, 'dist', 'linear-workflow.skill');
const agents = join(root, 'AGENTS.md');

let failures = 0;
const fail = (m) => { console.error('  FAIL: ' + m); failures++; };
const ok = (m) => console.log('  ok:   ' + m);
const group = (name) => console.log('\n== ' + name + ' ==');

// --- 1. Skill frontmatter and name/directory conventions -------------------
group('Skill frontmatter and conventions');
{
  const sk = join(skillDir, 'SKILL.md');
  if (!existsSync(sk)) {
    fail('linear-workflow/SKILL.md missing');
  } else {
    const fm = parseFrontmatter(readFileSync(sk, 'utf8'));
    if (!fm) {
      fail('SKILL.md has no valid YAML frontmatter block');
    } else {
      if (!fm.name) fail('frontmatter missing required "name"');
      else if (fm.name !== 'linear-workflow') fail(`frontmatter name "${fm.name}" != "linear-workflow"`);
      else ok('frontmatter name is "linear-workflow"');
      if (!fm.description) fail('frontmatter missing required "description"');
      else ok('frontmatter has description');
      // Directory convention: the skill directory basename must match the name.
      if (basename(skillDir) !== fm.name) fail(`skill directory "${basename(skillDir)}" != frontmatter name "${fm.name}"`);
      else ok('skill directory matches frontmatter name');
    }
  }
  if (!existsSync(join(skillDir, 'mark-done.md'))) fail('linear-workflow/mark-done.md missing');
  else ok('linear-workflow/mark-done.md present');
  if (!existsSync(join(skillDir, 'templates'))) fail('templates missing');
  else ok('templates present');
  if (!existsSync(join(skillDir, 'templates', 'README.md'))) fail('templates/README.md missing');
  else ok('templates/README.md present');
  if (!existsSync(join(skillDir, 'configuration.md'))) fail('configuration.md missing');
  else ok('configuration.md present');
  if (!existsSync(join(skillDir, 'references', 'invariants.md'))) fail('references/invariants.md missing');
  else ok('references/invariants.md present');
  if (!existsSync(join(skillDir, 'references', 'configuration-schema.md'))) fail('references/configuration-schema.md missing');
  else ok('references/configuration-schema.md present');
}

// --- 2. Relative Markdown links --------------------------------------------
group('Relative Markdown links');
{
  const mdFiles = collect(skillDir).filter((f) => f.endsWith('.md'));
  let checked = 0;
  for (const rel of mdFiles) {
    const text = readFileSync(join(skillDir, rel), 'utf8');
    const links = [...text.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)].map((m) => m[1]);
    for (const link of links) {
      const base = dirname(join(skillDir, rel));
      const target = resolve(base, link);
      if (!existsSync(target)) fail(`broken link ${link} in linear-workflow/${rel}`);
      checked++;
    }
  }
  if (checked === 0) fail('no relative .md links found to verify');
  else ok(`${checked} relative Markdown link(s) resolve`);
}

// --- 3. Referenced repository paths ----------------------------------------
group('Referenced repository paths');
{
  if (!existsSync(agents)) {
    fail('AGENTS.md missing');
  } else {
    const text = readFileSync(agents, 'utf8');
    if (!/linear-workflow\//.test(text)) fail('AGENTS.md does not reference linear-workflow/');
    else if (!existsSync(skillDir)) fail('referenced linear-workflow/ does not exist');
    else ok('AGENTS.md references existing linear-workflow/');
    if (/`\.forge\/skills\/linear-workflow\//.test(text)) {
      const p = join(root, '.forge', 'skills', 'linear-workflow');
      if (!existsSync(p)) fail('.forge/skills/linear-workflow/ referenced but missing');
      else ok('.forge install path exists');
    }
  }
}

// --- 4. Linear state-type literals -----------------------------------------
group('Linear state-type literals');
{
  const files = ['SKILL.md', 'mark-done.md'].map((f) => join(skillDir, f)).filter(existsSync);
  const tokens = new Set();
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/`[a-z]+`/g)) tokens.add(m[0].slice(1, -1));
  }
  let unknown = 0;
  for (const tok of tokens) {
    if (VALID_STATE_TYPES.has(tok) || NON_STATE_WORDS.has(tok)) continue;
    console.error('  unknown state-type literal: ' + tok);
    unknown++;
  }
  if (unknown) fail(`${unknown} unknown state-type literal(s)`);
  else ok('all backtick lowercase state-type literals are valid');
  // Regression guard: the historical invalid literal must never reappear.
  const allText = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  if (/\btried\b/.test(allText)) fail("invalid state-type literal 'tried' present (use 'triage')");
  else ok("no invalid 'tried' literal");
}

// --- 5. Canonical identifier extraction/validation policy ------------------
group('Canonical identifier policy');
{
  const files = ['SKILL.md', 'mark-done.md'].map((f) => join(skillDir, f)).filter(existsSync);
  let found = 0;
  for (const f of files) {
    if (readFileSync(f, 'utf8').includes(IDENTIFIER_PATTERN)) found++;
    else fail(`canonical identifier regex not found in ${relative(root, f)}`);
  }
  if (found === 0) fail('canonical identifier regex absent from skill docs');
  else ok(`canonical identifier regex present in ${found} doc file(s) (matches policy.mjs)`);
}

// --- 6. Packaged source/dist parity and staleness --------------------------
group('Packaged artifact (dist) parity and staleness');
{
  if (!existsSync(dist)) {
    fail(`dist artifact missing: ${relative(root, dist)} (run "npm run package")`);
  } else if (!commandExists('unzip')) {
    ok('unzip unavailable; skipped dist parity check');
  } else {
    const tmp = mkdtempSync(join(tmpdir(), 'lw-skill-'));
    try {
      execSync(`unzip -o -q "${dist}" -d "${tmp}"`, { stdio: 'ignore' });
      const srcFiles = collect(skillDir).map((r) => 'linear-workflow/' + r);
      const distFiles = collect(join(tmp, 'linear-workflow')).map((r) => 'linear-workflow/' + r);
      const srcSet = new Set(srcFiles);
      const distSet = new Set(distFiles);
      for (const f of srcFiles) if (!distSet.has(f)) fail(`source file missing from dist: ${f}`);
      for (const f of distFiles) if (!srcSet.has(f)) fail(`dist file not in source: ${f}`);
      for (const f of srcFiles) {
        if (!distSet.has(f)) continue;
        if (sha(join(root, f)) === sha(join(tmp, f))) ok(`parity: ${f}`);
        else fail(`stale/mismatched content: ${f} (rebuild with "npm run package")`); // staleness
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}

// --- 7. Behavior scenario tests --------------------------------------------
group('Behavior scenario tests');
{
  const { passed, failed, total } = runBehaviorTests();
  if (failed) fail(`${failed}/${total} behavior scenario(s) failed`);
  else ok(`${passed}/${total} behavior scenario(s) passed`);
}

// --- Summary ----------------------------------------------------------------
console.log('');
if (failures) {
  console.error(`${failures} validation check(s) failed.`);
  process.exit(1);
}
console.log('All skill validation checks passed.');

// --- Helpers ----------------------------------------------------------------
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (mm) fm[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
  }
  return fm;
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

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
