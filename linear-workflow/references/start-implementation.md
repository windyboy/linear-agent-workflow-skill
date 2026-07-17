# Start Implementation: Read, Plan, Branch, Implement

## Read Full Issue

Before starting implementation, read completely: title, description, acceptance criteria, current status, priority, assignee, labels, project, cycle, comments, attachments, parent/child issues, blocking/blocked/related issues, and branch/PR/commit associations (if available). Never modify code based on title alone.

Read the project's own Agent instructions, inspect the codebase structure and version control state, locate relevant modules, identify build/test methods, and record the pre-change baseline when possible. If the issue content is insufficient, check related issues, history, and code, then list missing information; do not fabricate acceptance criteria.

## Implementation Plan

Output an implementation plan containing at minimum:
- Problem and acceptance criteria
- Root cause hypothesis / items to verify
- Affected files or modules
- Minimal change approach
- Test and rollback considerations
- Branch suggestions and PR/release risks

Before entering the implementation phase, follow the effective profile's `plan_confirmation` strategy (resolved from `configuration.md` — do **not** apply a single hard-coded rule here):
- `implicit` → start immediately after reading and planning; the user's "start work on ABC-123" is itself the authorization.
- `risk_based` → start immediately for simple changes; escalate (ask the user to confirm) for risky changes (DB migration, API change, multi-module, unknowns).
- `explicit` → wait for explicit user confirmation ("start processing" or equivalent) before changing issue state or creating a branch.

In every case, browsing or planning alone does not change issue state or create branches; the *requirement* for confirmation is determined by the profile, not fixed here.

## Assignment, Branching, and Implementation

After implementation authorization under the effective `plan_confirmation` strategy, re-read the current issue/state and team states:

1. If already in started/Review, do not re-write; state the current status. If completed/canceled/triage, do not auto-reopen; requires explicit user request. If assigned to someone else, inform the user and do not change assignee unilaterally.
2. For startable backlog/unstarted, update to the actual `started_state`; only set current user as assignee when requested by user and supported by tools.
3. Read back to confirm target state ID/type; if verification fails, do not create branches or modify code.
4. Create a dedicated branch based on existing project branch conventions; when no conventions exist, suggest a short name containing the full issue identifier. Check the workspace before creating; never overwrite uncommitted user changes.
5. Implement the minimal necessary changes; do not incidentally refactor, remove valuable comments, or change unrelated public behavior.

## Workflow Binding & Execution Context (optional)

The full protocol lives in [execution-context.md](execution-context.md). This section only routes the start flow; it does not redefine the protocol.

**Layer 1 — Workflow Binding (governance metadata, not workflow authority).** After the implementation plan is formed and the `execution_context` decision is made, but **before** any started-state write, resolve the per-issue Binding via the host capability contract (`read_binding` / `write_binding` / `read_back_binding`, discovered per [capability-discovery.md](capability-discovery.md)):

- New issue, first authorized start, 0 existing Bindings → create the Binding (frozen `resolved_strategies` + `execution_context`) and read it back to confirm.
- Exactly 1 Binding → verify schema, issue UUID, and `payload_fingerprint`; match → reuse; mismatch → do **not** overwrite, report a config/history conflict and stop.
- More than 1 Binding → fail closed, ask the user to resolve.
- A v1 Context that references a Binding, but the Binding is missing → fail closed (this is **not** a legacy issue).
- Pre-v0.5 / legacy-marked issues with 0 Bindings → recover via the legacy flow; do **not** backfill a historical Binding. Migration to v0.5 requires an explicit user trigger, never automatic creation on resume.

The minimal Binding record is written even when `audit_comments: none` (the Binding is Layer 1 governance, not an audit comment).

**Layer 2 — Execution Context (working memory, only if `execution_context.mode` is `auto` and the auto-decision selects it, or `required`).** After the Binding is written and read back:

1. Initialize `plan.md` as `prepared` (context state) — no branch or code change yet.
2. Resolve the started state via `selectStartedState(discoveredTeamStates, stateMapping)` and write it; read back to confirm.
3. Only after the started-state write + read-back succeeds, flip the Context to `active` and proceed to branching/code changes.
4. If the started-state write fails verification, keep the Context `prepared` and do **not** create the branch or modify code.

Read-only requests never create a Binding, a Context file, a branch, or any write (Invariant 1). When `execution_context.mode: disabled`, no Layer 2 files are created; the only documented additional governance write for a newly bound issue is the minimal Layer 1 Binding.

## Verify & Commit

After implementation, run applicable tests, builds, linting, type checking, and existing static analysis; distinguish pre-existing failures, unexecuted items, and failures from this change; never claim verification passed without running it.

After automated verification reaches a reviewable state:
1. Write back optional progress comments (only when requested by user or required by team convention); content must be truthful and must not claim user acceptance.
2. Inspect changes and workspace; commits must contain the full issue identifier (extracted via boundary-safe regex `\b[A-Z0-9]{1,5}-\d+\b`); only push when requested by user or permitted by project rules.
3. When creating a PR, link the issue, attach a change summary, validation results, unexecuted items, and risks; PR creation failure does not invalidate verified local implementation, but must be reported truthfully.
4. Run or wait for available CI; CI failed/not run means you cannot claim mergeable. CI passing does not substitute for user acceptance or production release.
