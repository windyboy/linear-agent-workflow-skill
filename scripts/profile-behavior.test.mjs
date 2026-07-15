#!/usr/bin/env node

// scripts/profile-behavior.test.mjs
//
// Profile-aware behavior tests for the linear-workflow skill.
// These tests assert real behavior; NONE swallow failures.

import {
  parseConfig,
  parseSimpleYAML,
  mergeConfig,
  validateConfig,
  getCompletionGate,
} from './profile-parser.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scenarios = [];
function scenario(name, fn) {
  scenarios.push({ name, fn });
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    throw new Error(msg + ': expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a));
  }
}
function assertDeepEqual(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(msg + ': expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a));
  }
}
function assertThrows(fn, pattern, msg) {
  let threw = false;
  let err;
  try {
    fn();
  } catch (e) {
    threw = true;
    err = e;
  }
  if (!threw) throw new Error(msg + ': expected an error but none was thrown');
  if (pattern && !pattern.test(err.message)) {
    throw new Error(msg + ': error message did not match ' + pattern + ' -> ' + err.message);
  }
}

// Helper: write a temp config file and parse it.
function parseFile(content) {
  const dir = mkdtempSync(join(tmpdir(), 'lw-cfg-'));
  const file = join(dir, 'linear-workflow.config.yaml');
  writeFileSync(file, content);
  try {
    return parseConfig(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// 1. Minimal profile has correct defaults
scenario('Minimal profile has correct defaults', () => {
  const config = mergeConfig('minimal', {});
  assertEqual(config.profile, 'minimal', 'profile');
  assertEqual(config.plan_confirmation, 'implicit', 'plan_confirmation');
  assertEqual(config.review_gate, 'pr_ready', 'review_gate');
  assertEqual(config.completion_gate, 'release_confirmed', 'completion_gate');
  assertEqual(config.audit_comments, 'none', 'audit_comments');
});

// 2. Standard profile has correct defaults
scenario('Standard profile has correct defaults', () => {
  const config = mergeConfig('standard', {});
  assertEqual(config.profile, 'standard', 'profile');
  assertEqual(config.plan_confirmation, 'risk_based', 'plan_confirmation');
  assertEqual(config.review_gate, 'pr_ready', 'review_gate');
  assertEqual(config.completion_gate, 'release_confirmed', 'completion_gate');
  assertEqual(config.audit_comments, 'summary', 'audit_comments');
});

// 3. Strict profile has correct defaults
scenario('Strict profile has correct defaults', () => {
  const config = mergeConfig('strict', {});
  assertEqual(config.profile, 'strict', 'profile');
  assertEqual(config.plan_confirmation, 'explicit', 'plan_confirmation');
  assertEqual(config.review_gate, 'user_acceptance', 'review_gate');
  assertEqual(config.completion_gate, 'production_deployment', 'completion_gate');
  assertEqual(config.audit_comments, 'detailed', 'audit_comments');
});

// 4. Override can change completion_gate in minimal
scenario('Override can change completion_gate in minimal', () => {
  const config = mergeConfig('minimal', { completion_gate: 'manual' });
  assertEqual(config.completion_gate, 'manual', 'completion_gate override failed');
});

// 5. Override cannot change team_boundary (Invariant 4)
scenario('Override cannot change team_boundary (Invariant 4)', () => {
  assertThrows(
    () => mergeConfig('minimal', { team_boundary: 'soft' }),
    /cannot override/i,
    'team_boundary override'
  );
});

// 6. Override cannot disable read_before_write (Invariant 1)
scenario('Override cannot disable read_before_write (Invariant 1)', () => {
  assertThrows(
    () => mergeConfig('minimal', { read_before_write: false }),
    /cannot override/i,
    'read_before_write override'
  );
});

// 7. Invalid override value is rejected (fail closed)
scenario('Invalid override value is rejected (fail closed)', () => {
  assertThrows(
    () => mergeConfig('standard', { completion_gate: 'invalid_value' }),
    /invalid value/i,
    'invalid override value'
  );
});

// 8. getCompletionGate returns correct value for each profile
scenario('getCompletionGate returns correct value for each profile', () => {
  assertEqual(getCompletionGate('minimal', {}), 'release_confirmed', 'minimal');
  assertEqual(getCompletionGate('standard', {}), 'release_confirmed', 'standard');
  assertEqual(getCompletionGate('strict', {}), 'production_deployment', 'strict');
  assertEqual(getCompletionGate('minimal', { completion_gate: 'manual' }), 'manual', 'minimal override');
});

// 9. Validation accepts a valid minimal config and rejects an unknown profile
scenario('Validation accepts valid config and rejects unknown profile', () => {
  const ok = validateConfig({ profile: 'minimal' });
  if (!ok.valid) throw new Error('valid minimal config was rejected: ' + ok.errors.join('; '));

  const bad = validateConfig({ profile: 'bogus' });
  if (bad.valid) throw new Error('unknown profile was accepted');
  if (!bad.errors.some((e) => /invalid profile/i.test(e))) {
    throw new Error('unknown profile error not reported: ' + bad.errors.join('; '));
  }
});

// 10. Validation rejects a forbidden combination
scenario('Validation rejects forbidden combination (minimal + production_deployment)', () => {
  const res = validateConfig({
    profile: 'minimal',
    overrides: { completion_gate: 'production_deployment' },
  });
  if (res.valid) throw new Error('forbidden minimal + production_deployment was accepted');
});

// 11. Minimal profile is suitable for solo developer
scenario('Minimal profile suitable for solo developer', () => {
  const config = mergeConfig('minimal', {});
  assertEqual(config.plan_confirmation, 'implicit', 'solo dev should have implicit plan confirmation');
  assertEqual(config.review_gate, 'pr_ready', 'solo dev should have pr_ready review gate');
});

// 12. Strict profile enforces all safety checks
scenario('Strict profile enforces all safety checks', () => {
  const config = mergeConfig('strict', {});
  assertEqual(config.plan_confirmation, 'explicit', 'strict should require explicit plan confirmation');
  assertEqual(config.review_gate, 'user_acceptance', 'strict should require user_acceptance review gate');
  assertEqual(config.completion_gate, 'production_deployment', 'strict should require production deployment');
  assertEqual(config.audit_comments, 'detailed', 'strict should require detailed audit comments');
});

// 13. Nested YAML `overrides:` block parses into config.overrides
scenario('Nested YAML overrides block parses correctly', () => {
  const parsed = parseSimpleYAML([
    'version: 1',
    'profile: minimal',
    'overrides:',
    '  review_gate: user_acceptance',
    '  audit_comments: summary',
  ].join('\n'));
  assertDeepEqual(
    parsed,
    {
      version: '1',
      profile: 'minimal',
      overrides: { review_gate: 'user_acceptance', audit_comments: 'summary' },
    },
    'nested YAML parse'
  );
});

// 13b. parseConfig round-trips a YAML file with nested overrides
scenario('parseConfig reads nested overrides from a YAML file (fail closed on bad input)', () => {
  const config = parseFile([
    'version: 1',
    'profile: minimal',
    'overrides:',
    '  review_gate: user_acceptance',
    '  audit_comments: summary',
  ].join('\n'));
  assertEqual(config.profile, 'minimal', 'profile from YAML');
  assertDeepEqual(
    config.overrides,
    { review_gate: 'user_acceptance', audit_comments: 'summary' },
    'overrides from YAML'
  );

  // An existing but invalid config file must FAIL CLOSED (throw), not silently pass.
  assertThrows(
    () => parseFile('profile: minimal\noverrides:\n  completion_gate: production_deployment\n'),
    /invalid/i,
    'invalid config file should throw'
  );

  // A missing config file is allowed (defaults to standard).
  const missing = parseConfig(join(tmpdir(), 'does-not-exist-' + Date.now() + '.yaml'));
  assertEqual(missing.profile, 'standard', 'missing config defaults to standard');
});

// 14. Invariants cannot be listed in overrides
scenario('Invariants cannot be listed in overrides', () => {
  assertThrows(
    () =>
      mergeConfig('minimal', {
        read_before_write: false,
        write_back_verification: false,
        authorization_required: false,
        team_boundary: 'soft',
        reality_check: false,
      }),
    /cannot override/i,
    'invariant overrides'
  );
});

// 15. Unknown profile fails closed (throws), no silent fallback
scenario('Unknown profile fails closed (no silent standard fallback)', () => {
  assertThrows(
    () => mergeConfig('unknown_profile', {}),
    /invalid profile/i,
    'unknown profile'
  );
});

// 16. completion_gate: merge is rejected everywhere (Reality Check)
scenario('completion_gate: merge is forbidden', () => {
  const res = validateConfig({ profile: 'standard', overrides: { completion_gate: 'merge' } });
  if (res.valid) throw new Error('completion_gate merge was accepted');
});

// 17. production_deployment + implicit plan_confirmation is forbidden
scenario('production_deployment + implicit plan_confirmation is forbidden', () => {
  const res = validateConfig({
    profile: 'standard',
    overrides: { completion_gate: 'production_deployment', plan_confirmation: 'implicit' },
  });
  if (res.valid) throw new Error('production_deployment + implicit was accepted');
});

export function runProfileBehaviorTests() {
  let passed = 0;
  let failed = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    try {
      s.fn();
      passed++;
      console.log(`  ok:   [${i + 1}] ${s.name}`);
    } catch (e) {
      failed++;
      console.error(`  FAIL: [${i + 1}] ${s.name} -> ${e.message}`);
    }
  }
  return { passed, failed, total: scenarios.length };
}

// Allow running directly: `node scripts/profile-behavior.test.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const { passed, failed, total } = runProfileBehaviorTests();
  console.log(`\n${passed}/${total} profile behavior scenario(s) passed, ${failed} failed.`);
  if (failed) process.exit(1);
  console.log('All profile behavior scenarios passed.');
}
