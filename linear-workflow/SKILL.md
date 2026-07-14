---
name: linear-workflow
description: Manage the end-to-end delivery lifecycle of Linear issues. Use when users mention Linear, issue identifiers (e.g., ABC-123), unfinished requirements or bugs, creating issues, starting/claiming work, implementation plans, branches, PRs, verification, moving to review, publishing/deploying, or closing issues. Also use for English intents like "start issue", "create issue", "move to review", "mark issues done". Only for Linear issue lifecycle, not for regular code reviews; safely execute queries, started, Review, and post-release completed through the current runtime's Linear integration.
---

# Linear Workflow

This skill is host-agnostic: use the **Linear integration** provided by the current agent runtime (Linear MCP, API, connector, or equivalent tool provider). Do not assume product names, directory structures, server names, function names, or state names. Tool names like `list issues`, `get issue`, `update issue`, `create comment` are illustrative only; actual names depend on the current environment.

## Lifecycle Selection

Follow this end-to-end flow:

```text
Discover requirement/issue → (after confirmation) Create or select Linear Issue → Read full issue
→ Verify code and workspace → Output implementation plan → User confirms to start
→ Update to started + create dedicated branch → Implement and automated testing
→ Commit / Push / PR → CI → Request user final acceptance
→ After user acceptance, move to Review and write back to Linear → Manual Review → Merge
→ Successful production release/deploy → Linear Done
```

`Merge ≠ Done`. Code completion, tests passing, commit, push, PR, CI, approval, merge, or release tags do not constitute successful production release. Only successful production release/deploy can move to Done. Stages cannot be skipped; every Linear write must be verified with a read-back.

## Current Project Scope (Default Boundaries)

All Linear queries, creation, claiming, status changes, comments, and Done operations default to only the **current code project**. Before starting Linear operations, identify the current Linear project and team from the repository's project description, agent instructions, existing issue/PR/branch associations, configuration, or user input; do not guess mappings from directory names alone.

- Scope confirmed: Lists default to showing only that project's issues, with the Project column preserved in output; before creating or writing, verify the target issue belongs to that project/team.
- Scope unclear, mapping conflict, or issue missing project: Only perform read-only analysis that won't cross projects and ask the user; do not create, claim, move to Review, or Done.
- User explicitly specifies other project/team or cross-project issues: Echo the exception scope; cross-project writes still require each issue's project/team to be confirmed before execution.
- When inferring Done from release scope: Only accept candidates confirmed to belong to current project scope; list other candidates as cross-project items, do not auto-update.

## 0. Capability Discovery and Safety Boundaries

Before performing Linear operations for the first time in each session, confirm and record mappings by capability (not tool name):

| Capability | Purpose | When Missing |
| --- | --- | --- |
| Query team/workspace, projects, assignees, labels | Determine scope and display fields | Limit query scope and explain; cannot guess team |
| List/search issues with pagination | Query backlogs and candidates | Only report retrieved pages; cannot claim complete results |
| Get full issue by identifier/ID | Browse, implement, and pre-write verification | Do not start implementation or writing to that issue |
| Create issue | Record confirmed requirements/issues to Linear | Can analyze and draft content; do not claim creation |
| Get workflow states (with ID, name, type, order) | Map states | Do not update states |
| Update issue status | Lifecycle changes | Can continue read-only analysis; do not claim changes |
| Get/add comments and association info | Context and audit comments | When updating states, report separately that comments are pending |

When authentication fails, insufficient permissions, timeout, or incomplete field returns, do not use natural language to substitute for actual writes. After tool timeout, **first re-query** the target issue before deciding whether to retry.

## 1. State Mapping

First read the issue's team, then get that team's workflow states. State roles are `backlog_state`, `unstarted_state`, `started_state`, `review_state`, `completed_state`, `canceled_state`. When updating, use actual state IDs; judge using type and semantics, do not hardcode `Todo`, `In Progress`, `In Review`, or `Done`.

Map target states by this priority: verified explicit state ID → state `type` → precise semantic name (e.g., Review/QA Review/Code Review) → state order and team context → user confirmation.

`started_state` is typically the implementation state with type `started`. `review_state` must be an independent, unambiguous Review/QA/Code Review semantic state; do not guess because names are similar. If there is no independent Review state, do not create a state, do not use completed as a substitute; report the mapping result and let the user decide whether to keep started or use an existing state. When multiple candidates conflict, also stop and wait for confirmation.

## 2. Discovery, Creation, and Querying (Read-Only by Default)

"Which requirements are pending", "what bugs are there", "view Linear backlog" only mean browsing; do not change issues. First determine team, project, assignee, and other user-provided scope; when scope is unclear and cannot be safely defaulted, ask first.

1. Paginate through results until complete, explicit result limit, or tool cannot continue; explain coverage/limit.
2. Exclude type `completed`, `canceled`, and `triage`; retain backlog, unstarted, started, and Review.
3. First alert issues already in started/Review; sort remaining by Urgent, High, Medium, Low, No Priority; same priority by update time, creation time, identifier.
4. Classify as Bug vs Feature/Other using issue type, labels, project conventions. When inferred only from title or description, mark as "inferred".
5. Output `ID | Title | Type | Priority | Status | Assignee | Project`; missing fields show `—`, do not fabricate.

"Look at/analyze/explain ABC-123" only reads full details, does not claim or change status. When discovering new requirements/issues, first echo the proposed title, problem/impact, acceptance criteria, team/project/priority/labels; only call creation capability after user explicitly requests or confirms creation, then read back the identifier. When creation fails, provide a draft, do not claim it was created.

## 3. Read, Verify Code, and Implementation Plan

Before starting implementation, fully read: title, description, acceptance criteria, current status, priority, assignee, labels, project, cycle, comments, attachments, parent/child issues, blocking/blocked/related issues, and branch, PR, commit associations (if integration provides). Do not modify code based on title alone.

Read the project's own agent instructions, check codebase structure and version control status, locate relevant modules, identify build/test methods, and record pre-change baseline when possible. If issue content is insufficient, check related issues, history, and code before listing missing information; do not fabricate acceptance criteria.

Output implementation plan, containing at minimum: problem and acceptance criteria, root cause hypothesis/items to verify, affected files or modules, minimal modification approach, testing and rollback considerations, branch suggestions, and PR/release risks. Wait for user confirmation "start processing" or equivalent explicit instruction before entering implementation phase; only browsing or planning does not change issue status or create branches.

## 4. Claim, Branch, and Implementation

After user confirms to start, re-read current issue/state and team states:

1. If already in started/Review, do not write again; explain status. If completed/canceled/triage, do not auto-reopen; requires explicit user request. If assignee is someone else, inform user, do not change assignee without permission.
2. For claimable backlog/unstarted, update to actual `started_state`; only set current user as assignee when user requests and tool supports.
3. Read back to confirm target state ID/type; if verification fails, do not create branch or modify code.
4. Create dedicated branch based on project's existing branch conventions; when no conventions exist, suggest short name containing full issue identifier. Check workspace before creating; never overwrite user's uncommitted changes.
5. Implement minimal necessary changes; do not incidentally refactor, remove valuable comments, or change unrelated public behavior.

## 5. Automated Verification, Commit, Push, and PR

After implementation, run applicable tests, builds, linting, type checking, and project's existing static analysis; distinguish pre-existing failures, unexecuted items, and this change's failures; never claim verification passed without running it.

After automated verification reaches reviewable state:

1. Write back optional progress comments (only when user requests or team convention requires), content must be truthful and must not claim user has accepted.
2. Check changes and workspace, create commit with clear message including full issue identifier; only push when user requests or project rules allow.
3. When creating PR, link to issue, include change summary, verification results, unexecuted items, and risks; PR creation failure does not affect verified local implementation, but must report truthfully.
4. Run or wait for available CI; when CI fails/not run, cannot claim mergeable. CI passing also does not substitute for user acceptance or production release.

## 6. User Acceptance and Moving to Review

After automated verification, commit/PR/CI status have all been truthfully summarized, request final acceptance:

> Please verify whether the issue corresponding to ISSUE-ID has been resolved. After confirmation, I will update it to Review status.

When user says issue still exists or acceptance fails, keep started, record feedback (if user/caller requests, can add "pending further investigation" comment), continue fixing; do not add "resolved" comment or move to Review.

Only when user explicitly states acceptance passed (e.g., "I verified it passed") trigger:

1. Re-read issue, get team states, and parse unambiguous `review_state`.
2. If already in target Review state, skip state write; check if identical audit comment already exists to avoid duplicates.
3. After updating state, read back to confirm actual state; if fails, report, do not claim success.
4. Add and read back resolution summary comment: Resolution summary, Root cause, Implementation, Key files, Validation performed, Validation not performed, Known limitations, Commit/PR reference.
5. If state succeeds but comment fails, explicitly report "state succeeded, comment failed"; if comment succeeds but state fails, also report separately, and do not claim moved to Review.

Manual Review, CI review, and Merge are executed by current project process or corresponding skill. After merge, keep Review (or equivalent non-done state defined by team) until actual production release/deploy succeeds.

## 7. Post-Release Done

When user explicitly confirms release/deploy success, or release/deploy skills provide credible successful deployment results, call [mark-done.md](mark-done.md). Done subprocess can be called independently; caller should provide its input contract; do not rely on implicit context from this file.

## 8. Idempotency and Error Format

Before each write, read first; if target state already satisfied, skip; after timeout, re-read first; only complete unexecuted steps; do not repeat identical comments. Single issue status and comments are independently auditable steps.

Each status change outputs: `Issue, original status, target status, actual status, status update, comment update, verification method`; use tables for batch operations and do not expose tokens, full internal JSON, or irrelevant metadata. Errors output at minimum:

```text
Issue:
Step:
Result:
Error reason:
Retryable:
Suggested action:
```