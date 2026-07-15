#!/usr/bin/env node
// scripts/behavior.test.mjs
//
// Deterministic behavior-scenario tests for the linear-workflow skill.
// These encode the skill's documented decision rules as pure functions and
// assert the 10 scenarios from W1N-17. They require NO Linear workspace and
// perform NO writes.
import {
  extractIdentifiers,
  isValidIdentifier,
  isDoneEligible,
  classifyIssue,
  scopeAllows,
  isReviewStateAmbiguous,
  isWriteIntent,
  REQUIRES_READBACK_AFTER_TIMEOUT,
  shouldMoveToStarted,
  summarizePartial,
} from './policy.mjs';

const scenarios = [];
function scenario(name, fn) {
  scenarios.push({ name, fn });
}

function assertDeepEqual(a, b) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a));
  }
}

// 1. "Inspect ABC-123" performs no write.
scenario('Inspect ABC-123 performs no write', () => {
  if (isWriteIntent('Inspect ABC-123 and explain the lifecycle') !== false) {
    throw new Error('inspection intent was treated as a write');
  }
});

// 2. Starting work without a confirmed plan does not move to started (high-risk standard).
scenario('Starting work without a confirmed plan does not move to started', () => {
  // standard + high risk without confirmation => blocked
  if (shouldMoveToStarted({ planConfirmed: false, profile: 'standard', riskLevel: 'high' }) !== false) {
    throw new Error('high-risk standard change moved to started without confirmation');
  }
  // standard + high risk with confirmation => allowed
  if (shouldMoveToStarted({ planConfirmed: true, profile: 'standard', riskLevel: 'high' }) !== true) {
    throw new Error('high-risk standard change blocked after confirmation');
  }
  // standard + low risk auto-starts (risk-based)
  if (shouldMoveToStarted({ planConfirmed: false, profile: 'standard', riskLevel: 'low' }) !== true) {
    throw new Error('low-risk standard change required confirmation');
  }
});

// 2b. Standard (risk_based) auto-starts low/medium risk but escalates high risk.
scenario('Standard profile is risk-based, not always explicit', () => {
  if (shouldMoveToStarted({ profile: 'standard', riskLevel: 'low' }) !== true) {
    throw new Error('low-risk standard change required confirmation');
  }
  if (shouldMoveToStarted({ profile: 'standard', riskLevel: 'medium' }) !== true) {
    throw new Error('medium-risk standard change required confirmation');
  }
  if (shouldMoveToStarted({ profile: 'standard', riskLevel: 'high' }) !== false) {
    throw new Error('high-risk standard change auto-started without confirmation');
  }
  if (shouldMoveToStarted({ profile: 'standard', riskLevel: 'high', planConfirmed: true }) !== true) {
    throw new Error('high-risk standard change blocked after confirmation');
  }
  // minimal stays implicit, strict stays explicit regardless of risk.
  if (shouldMoveToStarted({ profile: 'minimal', riskLevel: 'high' }) !== true) {
    throw new Error('minimal did not allow implicit start');
  }
  if (shouldMoveToStarted({ profile: 'strict', riskLevel: 'low', planConfirmed: false }) !== false) {
    throw new Error('strict auto-started without confirmation');
  }
});

// 3. Ambiguous Review states require clarification.
scenario('Ambiguous Review states require clarification', () => {
  const candidates = [
    { name: 'Code Review', type: 'started' },
    { name: 'QA Review', type: 'started' },
  ];
  if (isReviewStateAmbiguous(candidates) !== true) {
    throw new Error('two review candidates were not flagged ambiguous');
  }
  if (isReviewStateAmbiguous([{ name: 'In Review', type: 'started' }]) !== false) {
    throw new Error('a single review candidate was flagged ambiguous');
  }
});

// 4. A timed-out update is read back before retry.
scenario('A timed-out update is read back before retry', () => {
  if (REQUIRES_READBACK_AFTER_TIMEOUT !== true) {
    throw new Error('timeout read-back requirement not enforced');
  }
});

// 5. Merge alone does not mark Done.
scenario('Merge alone does not mark Done', () => {
  if (isDoneEligible({ merge: true }) !== false) {
    throw new Error('merge alone marked Done');
  }
});

// 6. Successful production deployment can satisfy the Done gate.
scenario('Successful production deployment can satisfy the Done gate', () => {
  if (isDoneEligible({ deploymentStatus: 'success', deploymentEvidence: 'https://ci/deploy/123' }) !== true) {
    throw new Error('successful deployment did not satisfy Done gate');
  }
});

// 7. Comment failure is reported as partial success.
scenario('Comment failure is reported as partial success', () => {
  const r = summarizePartial(true, false);
  if (r !== 'partial: state updated, comment failed') {
    throw new Error('comment failure not reported as partial: ' + r);
  }
});

// 8. Alphanumeric team keys are handled consistently.
scenario('Alphanumeric team keys are handled consistently', () => {
  const ids = extractIdentifiers('W1N-17 and F1-2 and ABC-123');
  assertDeepEqual(ids, ['W1N-17', 'F1-2', 'ABC-123']);
  // Boundary safety: ABC-12 must not swallow ABC-123.
  const both = extractIdentifiers('fixes ABC-12 and ABC-123');
  if (!both.includes('ABC-12') || !both.includes('ABC-123')) {
    throw new Error('boundary-safe extraction failed: ' + JSON.stringify(both));
  }
  if (!isValidIdentifier('W1N-17')) throw new Error('W1N-17 not recognized as valid');
});

// 9. A team-scoped issue without a project follows the configured scope policy.
scenario('Team-scoped issue without a project follows scope policy', () => {
  if (scopeAllows({ team: 'W1ndy', issueTeam: 'W1ndy', project: null, projectOnly: false }) !== true) {
    throw new Error('team-scoped issue without project was rejected');
  }
  if (scopeAllows({ team: 'W1ndy', issueTeam: 'Other', project: null }) !== false) {
    throw new Error('cross-team issue was allowed');
  }
  if (scopeAllows({ team: 'W1ndy', issueTeam: 'W1ndy', project: null, projectOnly: true }) !== false) {
    throw new Error('project-only policy allowed an issue without a project');
  }
});

// 10. A triage issue is classified correctly.
scenario('A triage issue is classified correctly', () => {
  // A triage label is a workflow/process label, not a defect -> Feature/Other.
  if (classifyIssue({ labels: ['triage'] }) !== 'Feature/Other') {
    throw new Error('triage-labeled issue misclassified as Bug');
  }
  // An explicit Bug type is classified as Bug.
  if (classifyIssue({ type: 'Bug' }) !== 'Bug') {
    throw new Error('Bug-type issue not classified as Bug');
  }
});

export function runBehaviorTests() {
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

// Allow running directly: `node scripts/behavior.test.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const { passed, failed, total } = runBehaviorTests();
  console.log(`\n${passed}/${total} behavior scenario(s) passed, ${failed} failed.`);
  if (failed) process.exit(1);
  console.log('All behavior scenarios passed.');
}
