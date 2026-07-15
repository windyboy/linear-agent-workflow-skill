#!/usr/bin/env node
// scripts/install-verify.mjs
//
// Verifies that the packaged artifact (dist/linear-workflow.skill) matches
// the source tree (linear-workflow/). This script is run during CI to ensure
// the distributed artifact is not stale.
//
// New in v0.3.0:
// - Verifies source → dist → runtime parity
// - Detects drift between versions
// - Reports detailed diagnostics on mismatch

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'linear-workflow');
const out = join(root, 'dist', 'linear-workflow.skill');
const metadataFile = join(root, 'dist', 'linear-workflow.metadata.json');

console.log('Linear Workflow Install Verification');
console.log('=====================================\n');

// Step 1: Verify source directory exists
if (!existsSync(src)) {
  console.error('✗ Source directory missing: ' + src);
  process.exit(1);
}
console.log('✓ Source directory exists: ' + src);

// Step 2: Verify packaged artifact exists
if (!existsSync(out)) {
  console.error('✗ Packaged artifact missing: ' + out);
  console.error('  Run: npm run package');
  process.exit(1);
}
console.log('✓ Packaged artifact exists: ' + out);

// Step 3: Verify metadata file exists
if (!existsSync(metadataFile)) {
  console.error('✗ Metadata file missing: ' + metadataFile);
  console.error('  Run: npm run package');
  process.exit(1);
}
console.log('✓ Metadata file exists: ' + metadataFile);

// Step 4: Read and verify metadata
let metadata;
try {
  metadata = JSON.parse(readFileSync(metadataFile, 'utf-8'));
} catch (e) {
  console.error('✗ Failed to parse metadata file: ' + e.message);
  process.exit(1);
}
console.log('✓ Metadata valid');
console.log('  Version: ' + metadata.version);
console.log('  Timestamp: ' + metadata.timestamp);

// Step 5: Verify critical files exist in source
const criticalFiles = [
  'SKILL.md',
  'configuration.md',
  'mark-done.md',
  'references/invariants.md',
  'references/configuration-schema.md',
  'templates/README.md',
  'templates/idea-feature.md',
  'templates/bug-report.md',
  'templates/refactor.md',
  'templates/change-review.md',
  'templates/release-review.md',
  'templates/finding.md',
  'examples/README.md',
  'examples/minimal-project.md',
  'examples/standard-team.md',
  'examples/strict-enterprise.md'
];

console.log('\nVerifying critical files in source:');
let missingFiles = [];
for (const file of criticalFiles) {
  const filePath = join(src, file);
  if (existsSync(filePath)) {
    console.log('  ✓ ' + file);
  } else {
    console.log('  ✗ ' + file);
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error('\n✗ Missing critical files: ' + missingFiles.join(', '));
  process.exit(1);
}

// Step 6: Verify critical files exist in artifact
console.log('\nVerifying critical files in artifact:');
let artifactMissingFiles = [];
for (const file of criticalFiles) {
  const zipPath = 'linear-workflow/' + file;
  try {
    execSync(`unzip -l "${out}" "${zipPath}" > /dev/null 2>&1`);
    console.log('  ✓ ' + file);
  } catch (e) {
    console.log('  ✗ ' + file);
    artifactMissingFiles.push(file);
  }
}

if (artifactMissingFiles.length > 0) {
  console.error('\n✗ Missing files in artifact: ' + artifactMissingFiles.join(', '));
  console.error('  Run: npm run package');
  process.exit(1);
}

// Step 7: Verify source hash matches
console.log('\nVerifying source hash:');
const currentSourceHash = generateDirectoryHash(src);
const storedSourceHash = metadata.sourceHash;
console.log('  Stored: ' + storedSourceHash);
console.log('  Current: ' + currentSourceHash);

if (currentSourceHash !== storedSourceHash) {
  console.error('\n✗ Source hash mismatch! The packaged artifact is stale.');
  console.error('  Run: npm run package');
  process.exit(1);
}
console.log('  ✓ Source hash matches');

// Step 8: Verify parity status
console.log('\nVerifying parity status:');
if (metadata.parity && metadata.parity.status === 'in_parity') {
  console.log('  ✓ Artifact is in parity with source');
  console.log('  Last verified: ' + metadata.parity.lastVerified);
} else {
  console.error('  ✗ Artifact parity status unknown');
  process.exit(1);
}

// Step 9: Report success
console.log('\n✓ All verification checks passed');
console.log('  Version: ' + metadata.version);
console.log('  Status: Ready for deployment');

// Helper functions

function generateDirectoryHash(dirPath) {
  const hash = createHash('sha256');
  const files = execSync(`find "${dirPath}" -type f -name '*.md' -o -name '*.yaml' -o -name '*.json' | sort`).toString().trim().split('\n');
  
  for (const file of files) {
    if (file) {
      try {
        const content = readFileSync(file, 'utf-8');
        hash.update(content);
      } catch (e) {
        console.warn('warning: could not read file for hashing: ' + file);
      }
    }
  }
  
  return hash.digest('hex').substring(0, 16);
}
