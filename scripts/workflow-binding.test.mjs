// scripts/workflow-binding.test.mjs
//
// Tests for the Layer 1 Workflow Binding payload helper (scripts/binding-payload.mjs).
// Covers: payload round-trip, seven-strategy freeze, fingerprint integrity,
// classify 0/1/>1, verify mismatch, and the auto two-field split.

import {
  BINDING_SCHEMA_VERSION,
  CONTEXT_DECISION,
  RESOLVED_STRATEGY_KEYS,
  computeFingerprint,
  validateBinding,
  buildBinding,
  serializeBinding,
  parseBinding,
  classifyBindings,
  verifyBinding,
} from './binding-payload.mjs';

let passed = 0;
let failed = 0;
const failures = [];

function scenario(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok:   [${passed + failed}] ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, err });
    console.log(`  FAIL: [${passed + failed}] ${name}\n        ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function eq(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg || 'value mismatch'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const SEVEN = {
  plan_confirmation: 'risk_based',
  review_gate: 'pr_ready',
  completion_gate: 'release_confirmed',
  audit_comments: 'summary',
  project_check: 'when_configured',
  release_reconciliation: 'on_request',
  output_verbosity: 'standard',
};

function makeBinding(over = {}) {
  return buildBinding({
    issueUuid: 'uuid-abc',
    teamId: 'team-1',
    profile: 'standard',
    resolvedStrategies: { ...SEVEN },
    executionContext: { mode: 'auto' },
    configuredMode: 'auto',
    contextDecision: 'enabled',
    ...over,
  });
}

scenario('binding payload serialize/parse round-trip', () => {
  const b = makeBinding();
  const text = serializeBinding(b);
  const parsed = parseBinding(text);
  eq(parsed.issue_uuid, 'uuid-abc');
  eq(parsed.schema_version, BINDING_SCHEMA_VERSION);
  eq(parsed.payload_fingerprint, b.payload_fingerprint);
});

scenario('binding freezes all seven resolved_strategies', () => {
  const b = makeBinding();
  const v = validateBinding(b);
  assert(v.valid, 'binding should be valid: ' + v.errors.join('; '));
  for (const key of RESOLVED_STRATEGY_KEYS) {
    assert(key in b.resolved_strategies, `missing ${key}`);
  }
  eq(Object.keys(b.resolved_strategies).sort(), RESOLVED_STRATEGY_KEYS.slice().sort());
});

scenario('binding with missing strategy fails closed', () => {
  const rs = { ...SEVEN };
  delete rs.audit_comments;
  const b = buildBinding({ resolvedStrategies: rs, configuredMode: 'auto', contextDecision: 'enabled' });
  const v = validateBinding(b);
  assert(!v.valid, 'binding missing a strategy must be invalid');
  assert(v.errors.some((e) => e.includes('audit_comments')), 'error should name the missing strategy');
});

scenario('fingerprint is deterministic and excludes bound_at', () => {
  const b1 = makeBinding({ boundAt: '2026-01-01T00:00:00Z' });
  const b2 = makeBinding({ boundAt: '2099-12-31T00:00:00Z' });
  eq(b1.payload_fingerprint, b2.payload_fingerprint, 'fingerprint must ignore bound_at');
  // recomputing from frozen payload (without bound_at) matches
  eq(computeFingerprint(b1), b1.payload_fingerprint);
});

scenario('fingerprint detects payload mutation (integrity, not authenticity)', () => {
  const b = makeBinding();
  const mutated = { ...b, resolved_strategies: { ...SEVEN, review_gate: 'user_acceptance' } };
  const v = validateBinding(mutated);
  assert(!v.valid, 'mutated frozen payload must fail fingerprint check');
  assert(v.errors.some((e) => e.includes('payload_fingerprint')), 'error should name fingerprint mismatch');
});

scenario('binding requires a non-null execution_context and fingerprint', () => {
  const b = makeBinding();
  const nullContext = { ...b, execution_context: null };
  assert(!validateBinding(nullContext).valid, 'null execution_context must fail closed');
  const missingFingerprint = { ...b };
  delete missingFingerprint.payload_fingerprint;
  assert(!validateBinding(missingFingerprint).valid, 'missing fingerprint must fail closed');
});

scenario('classifyBindings: 0 / 1 / >1 by issue_uuid', () => {
  eq(classifyBindings([], 'uuid-abc').count, 0);
  const one = makeBinding();
  eq(classifyBindings([one], 'uuid-abc').count, 1);
  const dup = makeBinding();
  eq(classifyBindings([one, dup], 'uuid-abc').count, 2);
  eq(classifyBindings([makeBinding({ issueUuid: 'other' })], 'uuid-abc').count, 0);
});

scenario('verifyBinding reports mismatch on issue_uuid / schema / fingerprint', () => {
  const b = makeBinding();
  assert(verifyBinding(b, b).ok, 'identical binding should verify');
  assert(!verifyBinding(b, { ...b, issue_uuid: 'x' }).ok, 'issue_uuid mismatch must fail');
  assert(!verifyBinding({ ...b, schema_version: 'other' }, b).ok, 'schema mismatch must fail');
  const tampered = { ...b, resolved_strategies: { ...SEVEN, review_gate: 'user_acceptance' } };
  assert(!verifyBinding(tampered, b).ok, 'fingerprint mismatch must fail');
  const recomputed = { ...tampered };
  recomputed.payload_fingerprint = computeFingerprint(recomputed);
  assert(!verifyBinding(recomputed, b).ok, 'recomputed fingerprint for a changed payload must not bypass the frozen binding');
});

scenario('auto binding records configured_mode + context_decision', () => {
  const b = makeBinding({ configuredMode: 'auto', contextDecision: 'enabled' });
  eq(b.configured_mode, 'auto');
  assert(CONTEXT_DECISION.includes(b.context_decision), 'context_decision must be in allowed set');
  const v = validateBinding(b);
  assert(v.valid, 'auto binding must validate: ' + v.errors.join('; '));
});

scenario('context_decision not_needed is valid for auto', () => {
  const b = makeBinding({ configuredMode: 'auto', contextDecision: 'not_needed' });
  const v = validateBinding(b);
  assert(v.valid, 'auto + not_needed must validate: ' + v.errors.join('; '));
});

scenario('disabled mode binding still carries minimal Layer 1 record', () => {
  // Per v4 correction #4: disabled disables Layer 2 only; a newly bound issue
  // still gets the minimal Layer 1 Binding (configured_mode + context_decision).
  const b = makeBinding({ executionContext: { mode: 'disabled' }, configuredMode: 'disabled', contextDecision: 'not_needed' });
  const v = validateBinding(b);
  assert(v.valid, 'disabled-mode minimal binding must validate: ' + v.errors.join('; '));
});

scenario('legacy issue with no binding is represented as count 0 (no invention)', () => {
  const { count, matches } = classifyBindings([], 'uuid-legacy');
  eq(count, 0);
  eq(matches, []);
});

console.log(`\n${passed}/${passed + failed} workflow-binding scenario(s) passed, ${failed} failed.`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f.name}: ${f.err.message}`);
  process.exit(1);
}
console.log('All workflow-binding scenarios passed.');
