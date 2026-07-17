#!/usr/bin/env node
// scripts/phase0.test.mjs
//
// Phase 0 (W1N-28 §5) — Review Gate / Completion Gate consistency.
//
// Two kinds of checks:
//   1. Pure-function checks for the state-selection helpers added to policy.mjs
//      (selectStartedState / selectReviewState / mayMoveToReview). These use
//      fixture team states, mirroring how the runtime resolves concrete Linear
//      state names from discovered workflow states (v4 correction #3: the Review
//      Gate policy decides WHEN, the team workflow decides WHICH state).
//   2. A documentation-consistency check proving the resolved policy is the
//      single source of truth: review-gate-policy.md no longer claims
//      `user_acceptance` is the global default or that the Completion Gate is
//      always `production_deployment`, and no child reference declares a
//      competing gate default.
//
// Requires NO Linear workspace and performs NO writes.
import fs from 'fs';
import path from 'path';
import { selectStartedState, selectReviewState, mayMoveToReview } from './policy.mjs';

const scenarios = [];
function scenario(name, fn) {
  scenarios.push({ name, fn });
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- selectStartedState ---
scenario('selectStartedState resolves the single started state', () => {
  const states = [
    { name: 'Todo', type: 'unstarted' },
    { name: 'In Progress', type: 'started' },
    { name: 'Done', type: 'completed' },
  ];
  assert(selectStartedState(states) === 'In Progress', 'should resolve In Progress');
});

scenario('selectStartedState honors an explicit stateMapping', () => {
  const states = [{ name: 'Backlog', type: 'backlog' }];
  assert(selectStartedState(states, { started: 'Working' }) === 'Working', 'mapping should win');
});

scenario('selectStartedState returns null when ambiguous', () => {
  const states = [
    { name: 'Dev', type: 'started' },
    { name: 'QA', type: 'started' },
  ];
  assert(selectStartedState(states) === null, 'ambiguous started states -> null');
});

scenario('selectStartedState returns null when absent', () => {
  assert(selectStartedState([{ name: 'Backlog', type: 'backlog' }]) === null, 'no started state -> null');
});

// --- selectReviewState ---
scenario('selectReviewState resolves the single review state', () => {
  const states = [
    { name: 'In Progress', type: 'started' },
    { name: 'In Review', type: 'review' },
  ];
  assert(selectReviewState(states) === 'In Review', 'should resolve In Review');
});

scenario('selectReviewState matches by name when type is missing', () => {
  const states = [{ name: 'Code Review' }];
  assert(selectReviewState(states) === 'Code Review', 'name-based review match');
});

scenario('selectReviewState returns null when ambiguous', () => {
  const states = [
    { name: 'Peer Review', type: 'review' },
    { name: 'Final Review', type: 'review' },
  ];
  assert(selectReviewState(states) === null, 'ambiguous review states -> null');
});

// --- mayMoveToReview (Review Gate policy decides WHEN) ---
scenario('mayMoveToReview: pr_ready requires PR created AND CI passed', () => {
  assert(mayMoveToReview({ prCreated: true, ciPassed: true }, 'pr_ready') === true, 'pr_ready satisfied');
  assert(mayMoveToReview({ prCreated: true, ciPassed: false }, 'pr_ready') === false, 'ci missing');
  assert(mayMoveToReview({ prCreated: false, ciPassed: true }, 'pr_ready') === false, 'pr missing');
});

scenario('mayMoveToReview: user_acceptance requires explicit user acceptance', () => {
  assert(mayMoveToReview({ userAccepted: true }, 'user_acceptance') === true, 'user_acceptance satisfied');
  assert(mayMoveToReview({ prCreated: true, ciPassed: true }, 'user_acceptance') === false, 'pr_ready evidence does not satisfy user_acceptance');
});

scenario('mayMoveToReview fails closed on unknown policy', () => {
  assert(mayMoveToReview({ prCreated: true, ciPassed: true }, 'bogus') === false, 'unknown policy -> false');
});

// --- Documentation consistency: resolved policy is the single source of truth ---
function readRel(p) {
  return fs.readFileSync(path.join(process.cwd(), p), 'utf8');
}

scenario('review-gate-policy.md no longer claims user_acceptance is the global default', () => {
  const doc = readRel('linear-workflow/references/review-gate-policy.md');
  assert(!/user_acceptance`\s*\(default\)/i.test(doc), 'doc must not claim `user_acceptance` (default)');
  assert(/pr_ready`\s*\(default for `minimal` and `standard`\)/i.test(doc), 'doc must state pr_ready is the minimal/standard default');
  assert(/user_acceptance`\s*\(default for `strict`\)/i.test(doc), 'doc must state user_acceptance is the strict default');
});

scenario('review-gate-policy.md no longer claims the Completion Gate is always production_deployment', () => {
  const doc = readRel('linear-workflow/references/review-gate-policy.md');
  assert(!/always`?\s*production_deployment/i.test(doc), 'doc must not claim the Completion Gate is always production_deployment');
  assert(/completion gate is profile-driven/i.test(doc), 'doc must state the Completion Gate is profile-driven');
});

scenario('no child reference declares a competing gate default', () => {
  const refs = [
    'linear-workflow/SKILL.md',
    'linear-workflow/mark-done.md',
    'linear-workflow/references/move-to-review.md',
    'linear-workflow/references/start-implementation.md',
    'linear-workflow/references/resume-work.md',
  ];
  const forbidden = [/user_acceptance`\s*\(default\)/i, /always`?\s*production_deployment/i];
  for (const ref of refs) {
    const doc = readRel(ref);
    for (const re of forbidden) {
      assert(!re.test(doc), `${ref} must not declare a competing gate default (${re})`);
    }
  }
});

export function runPhase0Tests() {
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

// Allow running directly: `node scripts/phase0.test.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const { passed, failed, total } = runPhase0Tests();
  console.log(`\n${passed}/${total} Phase 0 scenario(s) passed, ${failed} failed.`);
  if (failed) process.exit(1);
  console.log('All Phase 0 scenarios passed.');
}
