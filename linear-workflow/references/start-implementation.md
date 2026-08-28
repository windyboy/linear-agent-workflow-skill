# Start Implementation

## Read Issue

Read fully: title, description, acceptance criteria, status, labels, project, comments, links, branch/PR associations. Read latest Agent Brief (`---agent-brief---`) first if present — [agent-brief.md](agent-brief.md). Inspect codebase and VCS; record baseline. Missing info → list gaps; don't fabricate criteria.

## Plan

Minimum: problem, acceptance criteria, root cause / verify items, affected files, minimal approach, test/rollback, branch/PR risks.

`plan_confirmation` (from effective profile):
- `implicit` — "start ABC-123" is authorization
- `risk_based` — auto-start simple; confirm risky (DB, API, multi-module)
- `explicit` — wait for explicit confirm before state/branch changes

Planning alone never changes state or creates branches.

## Branch & Implement

After authorization, re-read issue and team states:

1. Already started/review → don't re-write. Completed/canceled → no auto-reopen. Other assignee → inform user.
2. Backlog/unstarted → update to `started_state`; assign only if requested.
3. Read back state; fail → no branch/code.
4. Branch per project conventions (include issue ID); don't overwrite uncommitted work.
5. Minimal changes only; no drive-by refactors.

Post **Agent Brief** after started-state write succeeds.

## Workflow Binding & Context (optional)

Full protocol: [execution-context.md](execution-context.md). Binding procedure: [workflow-binding.md](workflow-binding.md).

**Layer 1 — Binding** (before started-state write):
- 0 bindings, new issue → create + read back
- 1 binding → verify fingerprint; match → reuse; mismatch → stop
- >1 bindings → fail closed
- Context references missing binding → fail closed (not legacy)
- Legacy, 0 bindings → legacy flow; no backfill

**Layer 2 — Context** (if `auto`+enabled or `required`):
1. Init `plan.md` as `prepared`
2. Write started state; read back
3. On success → `active`, then branch/code
4. On failure → stay `prepared`; no branch

Read-only requests → no binding, context, branch, or write. `mode: disabled` → no Layer 2 files.

## Verify & Commit

Run tests/build/lint; distinguish pre-existing vs new failures. Never claim pass without running.

Reviewable state:
1. Progress comments only when requested; no false acceptance claims
2. Commits include full issue ID (`\b[A-Z0-9]{1,5}-\d+\b`); push per user/rules
3. PR: link issue, summary, validation, gaps, risks
4. CI failed/unrun → not mergeable. CI pass ≠ user acceptance or release.
