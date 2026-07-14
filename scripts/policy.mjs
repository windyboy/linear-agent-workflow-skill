// scripts/policy.mjs
//
// Canonical, single-source-of-truth policy functions for the linear-workflow
// skill. These encode the rules documented in linear-workflow/SKILL.md and
// linear-workflow/mark-done.md so they can be unit-tested deterministically
// without touching a real Linear workspace.
//
// The identifier regex and state-type vocabulary below MUST stay in sync with
// the prose in SKILL.md / mark-done.md. scripts/validate.mjs enforces that the
// documented regex literal matches IDENTIFIER_PATTERN, preventing the
// "regex divergence" defect called out in W1N-17.

// Canonical identifier extraction/validation pattern. Boundary-safe: a 1-5 char
// uppercase alphanumeric team key, a hyphen, then digits. Mirrors SKILL.md
// ("extracted via boundary-safe regex \b[A-Z0-9]{1,5}-\d+\b") and mark-done.md.
export const IDENTIFIER_PATTERN = String.raw`\b[A-Z0-9]{1,5}-\d+\b`;
const IDENTIFIER_RE = new RegExp(IDENTIFIER_PATTERN, 'g');
// Non-global copy for single-match tests (RegExp.prototype.test is stateful
// with the global flag, so we keep a dedicated instance).
const IDENTIFIER_TEST_RE = new RegExp(IDENTIFIER_PATTERN);

export function extractIdentifiers(text) {
  if (!text) return [];
  const out = [];
  for (const m of text.matchAll(IDENTIFIER_RE)) out.push(m[0]);
  return out;
}

export function isValidIdentifier(id) {
  return typeof id === 'string' && IDENTIFIER_TEST_RE.test(id);
}

// Linear GraphQL WorkflowStateType enum values plus the semantic aliases the
// skill defines intentionally (review is a semantic state, not a Linear type).
export const VALID_STATE_TYPES = new Set([
  'backlog', 'unstarted', 'started', 'completed', 'canceled', 'triage', 'review',
]);

// Lowercase single-word backtick tokens that are not state types but are legit
// in the skill prose, so the literal scanner does not false-positive on them.
export const NON_STATE_WORDS = new Set(['type', 'unknown']);

export function isValidStateType(t) {
  return VALID_STATE_TYPES.has(t);
}

// The Completion Gate is always production deployment and cannot change.
export const COMPLETION_GATE = 'production_deployment';

// Scenario 5 + 6: merge alone never marks Done; a successful production
// deployment (or explicit user release confirmation) satisfies the Done gate.
export function isDoneEligible(evidence = {}) {
  if (evidence.mergeOnly === true) return false;
  if (evidence.merge === true && !evidence.deploymentStatus && !evidence.userConfirmedRelease) {
    return false;
  }
  return (
    evidence.deploymentStatus === 'success' ||
    evidence.userConfirmedRelease === true
  );
}

// Scenario 10: classify an issue as Bug vs Feature/Other. A `triage` label is a
// workflow/process label, not a defect indicator, so it is NOT treated as Bug.
const BUG_LABELS = new Set(['bug', 'defect', 'regression']);
export function classifyIssue({ type, labels = [], title = '', description = '' } = {}) {
  if (type && /\bbug\b/i.test(type)) return 'Bug';
  if ((labels || []).some((l) => BUG_LABELS.has(String(l).toLowerCase()))) return 'Bug';
  if (/\bbug\b/i.test(title || '') || /\bbug\b/i.test(description || '')) return 'Bug';
  return 'Feature/Other';
}

// Scenario 9: team is the required write boundary; a team-scoped issue without
// a project is allowed unless the policy is project-only.
export function scopeAllows({ team, issueTeam, project, projectOnly = false } = {}) {
  if (!team || !issueTeam) return false;
  if (team !== issueTeam) return false; // cross-team never
  if (projectOnly) return project != null;
  return true;
}

// Scenario 3: more than one Review-semantic candidate is ambiguous and requires
// clarification before mapping.
export function isReviewStateAmbiguous(candidates = []) {
  const reviews = candidates.filter(
    (c) => c && (c.type === 'review' || /review/i.test(c.name || ''))
  );
  return reviews.length > 1;
}

// Scenario 1: a read-only inspection intent performs no write. Explicit write
// verbs flip to a write intent; inspection/explanation verbs are read-only.
const WRITE_VERBS = /\b(start|create|update|move|mark|set|assign|close|complete|delete|add|claim)\b/i;
const READ_VERBS = /\b(inspect|look at|analyze|explain|read|show|describe|what|how|why|list|find|search)\b/i;
export function isWriteIntent(text = '') {
  if (WRITE_VERBS.test(text)) return true;
  if (READ_VERBS.test(text)) return false;
  return false; // default to read-only (safe)
}

// Scenario 4: after a tool timeout, the issue must be re-read before retry.
export const REQUIRES_READBACK_AFTER_TIMEOUT = true;

// Scenario 2: starting work without a confirmed plan must not move to started.
export function shouldMoveToStarted({ planConfirmed = false } = {}) {
  return planConfirmed === true;
}

// Scenario 7: partial success reporting when state and comment diverge.
export function summarizePartial(stateOk, commentOk) {
  if (stateOk && commentOk) return 'success';
  if (stateOk && !commentOk) return 'partial: state updated, comment failed';
  if (!stateOk && commentOk) return 'partial: comment added, state failed';
  return 'failed';
}
