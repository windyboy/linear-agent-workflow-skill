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

Wait for user confirmation ("start processing" or equivalent explicit instruction) before entering the implementation phase; browsing or planning alone does not change issue state or create branches.

## Assignment, Branching, and Implementation

After user confirmation, re-read the current issue/state and team states:

1. If already in started/Review, do not re-write; state the current status. If completed/canceled/triage, do not auto-reopen; requires explicit user request. If assigned to someone else, inform the user and do not change assignee unilaterally.
2. For startable backlog/unstarted, update to the actual `started_state`; only set current user as assignee when requested by user and supported by tools.
3. Read back to confirm target state ID/type; if verification fails, do not create branches or modify code.
4. Create a dedicated branch based on existing project branch conventions; when no conventions exist, suggest a short name containing the full issue identifier. Check the workspace before creating; never overwrite uncommitted user changes.
5. Implement the minimal necessary changes; do not incidentally refactor, remove valuable comments, or change unrelated public behavior.

## Verify & Commit

After implementation, run applicable tests, builds, linting, type checking, and existing static analysis; distinguish pre-existing failures, unexecuted items, and failures from this change; never claim verification passed without running it.

After automated verification reaches a reviewable state:
1. Write back optional progress comments (only when requested by user or required by team convention); content must be truthful and must not claim user acceptance.
2. Inspect changes and workspace; commits must contain the full issue identifier (extracted via boundary-safe regex `\b[A-Z0-9]{1,5}-\d+\b`); only push when requested by user or permitted by project rules.
3. When creating a PR, link the issue, attach a change summary, validation results, unexecuted items, and risks; PR creation failure does not invalidate verified local implementation, but must be reported truthfully.
4. Run or wait for available CI; CI failed/not run means you cannot claim mergeable. CI passing does not substitute for user acceptance or production release.
