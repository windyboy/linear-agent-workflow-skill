---
name: linear-workflow
description: Manage the end-to-end delivery lifecycle of Linear issues. Use when the user mentions Linear, an issue identifier (e.g. ABC-123), unfinished requirements or bugs, creating issues, starting/picking up work, implementation plans, branching, PRs, verification, moving to Review, releasing/deploying, or closing issues. Also use for English intents like "start issue", "create issue", "move to review", "mark issues done". Only for Linear issue lifecycle, not for general code review; executes queries, started, Review, and post-release completed safely via the current runtime's Linear integration.
---

# Linear Workflow

This Skill is host-agnostic: it uses the **Linear integration** provided by the current Agent runtime (Linear MCP, API, connector, or equivalent tool provider). It must not assume product names, directories, servers, function names, or state names. Tool names like `list issues`, `get issue`, `update issue`, `create comment` are illustrative; actual names are determined by the current environment.

## Lifecycle

Adopt the following end-to-end flow:

```text
Discover need/problem → (after confirmation) create or select Linear Issue → read full Issue
→ inspect code and workspace → produce implementation plan → user confirms start
→ update to started + create dedicated branch → implement and run automated tests
→ Commit / Push / PR → CI → request final user acceptance
→ after user acceptance, move to Review and write back to Linear → human Review → Merge
→ successful production release or deployment → Linear Done
```

`Merge ≠ Done`. Code complete, tests passing, commit, push, PR, CI, approval, merge, or release tag none of these equal a successful production release. Only a verified production release or deployment may move an issue to Done. Stages must not be skipped without evidence; every Linear write must be read back to verify.

## Review Gate Policy (Configurable)

The point at which an issue moves to Review is controlled by the **Review Gate** policy. The point at which an issue is marked Done is controlled by the **Completion Gate**, which is **always** `production_deployment` and cannot be changed.

### Supported Policies

| Policy | Review Gate trigger | Typical flow |
| --- | --- | --- |
| `user_acceptance` (default) | User explicitly accepts the change | CI → User acceptance → Review → Human review → Merge |
| `pr_ready` | PR created and CI passes | CI → Review (acceptance during review) → Human review → Merge |

### Policy Source and Priority

1. **Repository-level instructions**: `AGENTS.md`, `CLAUDE.md`, or equivalent Agent instructions declaring `review_gate: user_acceptance` or `review_gate: pr_ready`.
2. **Team/project-level instructions**: Explicitly declared in Linear issue labels, description, or project documentation.
3. **User explicit selection**: The user explicitly chooses a policy in the current session.
4. **Default**: `user_acceptance` (current strict behavior).

When multiple sources conflict, ask the user which one to adopt; never infer on your own.

### Rules Unaffected by Policy

- **Completion Gate unchanged**: Regardless of Review Gate policy, Done may only be written after a trusted production release/deployment succeeds.
- **Stages must not be skipped without evidence**: Each stage requires corresponding evidence (see "Resume Existing Work").
- **State writes must still be read back for verification**.

### Policy Declaration Examples

In `AGENTS.md` or equivalent file:

```markdown
## Workflow Policy
- review_gate: pr_ready
```

Or in a Linear issue description:

```markdown
Workflow: review_gate=pr_ready
```

## Resume Existing Work

When an issue is already in a started state but work was interrupted (session ended, Agent restarted, etc.), resume from the **first stage lacking evidence** rather than starting over.

### Resume Detection

When resuming, check evidence in the following order to locate the first incomplete stage:

| Evidence | Corresponding stage | How to check |
| --- | --- | --- |
| Dedicated branch exists | Branch established | Git branch list contains a branch with the issue ID |
| Local unpushed commits | Implementation phase | Branch has commits ahead of remote |
| PR exists and linked to issue | PR created | Linear/Git integration can read linked PR |
| CI status is passing | CI passed | PR/commit check status |
| User explicitly states acceptance | User acceptance passed | User statement in current session |
| Trusted deployment evidence | Production deployment succeeded | Deploy/release skill or user confirmation |

### Resume Rules

1. **Continue from the first stage without evidence**: Already-passed stages are not re-executed; stages that failed or have no evidence are executed from the beginning.
2. **No evidence means not complete**: If a stage has no evidence (Linear status, Git records, PR, CI, deployment records, user statements), you must not claim it is complete and must execute from that stage.
3. **Status matching**: If the Linear status is already at the target stage's state, do not re-write; if the status lags behind what the evidence shows, update to match the evidence.
4. **User confirms resume point**: When resuming, report detected evidence and the suggested resume point to the user, then execute after confirmation.

### Resume Scenario Examples

| Scenario | Detection result | Resume action |
| --- | --- | --- |
| Branch and commits exist, no PR | Branch exists, commits present, no PR | Resume from PR creation stage |
| PR exists and CI passes, no acceptance | PR + CI pass, no acceptance record | Resume from user acceptance stage |
| PR merged, not deployed | PR merged, no deployment evidence | Resume from deployment stage, then Done after deployment |
| Deployed but Linear not Done | Deployment evidence exists, Linear not completed | Call mark-done directly |

## Current Project Scope (Default Boundaries)

All Linear queries, creation, assignment, state changes, comments, and Done operations default to the **current code project** only. Before performing any Linear operation, identify the current Linear project and team from the repository's project description, Agent instructions, existing issue/PR/branch associations, configuration, or user input; never guess the mapping from directory names alone.

**Write boundary: team is the required boundary, project is an optional boundary.** Every write must verify the target issue's team membership; cross-team writes are never allowed. Project is an additional constraint only when explicitly required by repository policy; without a project-only restriction, issues with verified team membership may be processed even without a project.

- Scope determined: Lists default to that project's issues, retaining the Project column in output; creation and writes verify the target issue belongs to that team (and, if applicable, project).
- Scope unclear or mapping conflict: Perform only read-only analysis that does not cross team/project boundaries and ask the user; do not create, assign, move to Review, or mark Done.
- Issue lacks a project (but team verified): **Does not block writes**; as long as the team boundary is verified and there is no project-only restriction, the lifecycle proceeds normally. Only blocks when repository policy explicitly requires a project.
- User explicitly specifies other project/team or cross-project issue: Echo the exception scope; cross-project writes still require each issue's team/project to be confirmed before execution.
- Project scope requests: Still exclude issues without a project and cross-project issues; these candidates are only reported, not auto-updated.
- Auto-inferring Done from release scope: Only accept candidates confirmed to belong to the current team/project scope; others are listed as cross-project/cross-team items and not auto-updated.

## 0. Capability Discovery and Safety Boundaries

Before performing the first Linear operation in a session, confirm and record capability mappings by capability rather than tool name:

| Capability | Purpose | Handling when missing |
| --- | --- | --- |
| Query team/workspace, projects, assignees, labels | Determine scope and display fields | Restrict query scope and explain; cannot guess team |
| List/search issues with pagination | Query backlog and candidates | Only report retrieved pages; cannot claim complete results |
| Get full issue by identifier/ID | Read before implementation and writes | Do not start implementation or writes on that issue |
| Create issue | Record confirmed needs/problems in Linear | Can analyze and draft content; must not claim creation |
| Get workflow states (with ID, name, type, order) | Map states | Cannot update state |
| Update issue state | Lifecycle changes | Continue read-only analysis; must not claim mutation |
| Get/add comments and association info | Context and audit comments | When state can be updated, separately report comment not done |

On auth failure, insufficient permissions, timeout, or incomplete fields, do not substitute natural language for actual writes. After a tool timeout, **re-query** the target issue first before deciding whether to retry.

## 1. State Mapping

Read the issue's team first, then get that team's workflow states. State roles are `backlog_state`, `unstarted_state`, `started_state`, `review_state`, `completed_state`, `canceled_state`. Use actual state IDs when updating; judge by type and semantics, never hardcode `Todo`, `In Progress`, `In Review`, or `Done`.

Map the target state by this priority: verified explicit state ID → state `type` → exact semantic meaning of the name (e.g. Review/QA Review/Code Review) → state order and team context → user confirmation.

`started_state` is typically the implementation state with type `started`. `review_state` must be an unambiguous Review/QA/Code Review semantic state; do not guess based on name similarity. If no independent Review state exists, do not create a state, do not use completed as a substitute; report the mapping result and let the user decide whether to stay in started or use which existing state. Multiple conflicting candidates also require stopping and waiting for confirmation.

## 2. Discovery, Creation, and Query (Read-Only by Default)

"What requirements are left", "what bugs are there", "show me the Linear backlog" these mean browsing only, not changing issues. First determine scope from team, project, assignee etc. that the user provides; ask when scope is unclear and cannot be safely defaulted.

1. Paginate to completion, a clear result cap, or when the tool cannot continue; explain coverage/cap.
2. Exclude types `completed`, `canceled`, and `tried`; keep backlog, unstarted, started, and Review.
3. First alert issues already in started/Review; sort the rest by Urgent, High, Medium, Low, no priority, with same priority by updatedAt, createdAt, identifier.
4. Classify as Bug vs Feature/Other using issue type, labels, project conventions. Mark "inferred" when only inferred from title or description.
5. Output `ID | Title | Type | Priority | Status | Assignee | Project`; missing fields show `—`, never fabricate.

"Look at/analyze/explain ABC-123" reads full details only, does not assign or change state. When discovering new needs/problems, echo the proposed title, problem/impact, acceptance criteria, team/project/priority/labels; only call the creation capability when the user explicitly requests or confirms creation, and read back the identifier. On creation failure, provide a draft but must not claim it was created.

## 3. Read, Inspect Code, and Implementation Plan

Before starting implementation, read completely: title, description, acceptance criteria, current status, priority, assignee, labels, project, cycle, comments, attachments, parent/child issues, blocking/blocked/related issues, and branch/PR/commit associations (if the integration can provide them). Never modify code based on title alone.

Read the project's own Agent instructions, inspect the codebase structure and version control state, locate relevant modules, identify build/test methods, and record the pre-change baseline when possible. If the issue content is insufficient, check related issues, history, and code, then list missing information; do not fabricate acceptance criteria.

Output an implementation plan containing at minimum: problem and acceptance criteria, root cause hypothesis/items to verify, affected files or modules, minimal change approach, test and rollback considerations, branch suggestions and PR/release risks. Wait for user confirmation ("start processing" or equivalent explicit instruction) before entering the implementation phase; browsing or planning alone does not change issue state or create branches.

## 4. Assignment, Branching, and Implementation

After user confirmation, re-read the current issue/state and team states:

1. If already in started/Review, do not re-write; state the current status. If completed/canceled/tried, do not auto-reopen; requires explicit user request. If assigned to someone else, inform the user and do not change assignee unilaterally.
2. For startable backlog/unstarted, update to the actual `started_state`; only set current user as assignee when requested by user and supported by tools.
3. Read back to confirm target state ID/type; if verification fails, do not create branches or modify code.
4. Create a dedicated branch based on existing project branch conventions; when no conventions exist, suggest a short name containing the full issue identifier. Check the workspace before creating; never overwrite uncommitted user changes.
5. Implement the minimal necessary changes; do not incidentally refactor, remove valuable comments, or change unrelated public behavior.

## 5. Automated Verification, Commit, Push, and PR

After implementation, run applicable tests, builds, linting, type checking, and existing static analysis; distinguish pre-existing failures, unexecuted items, and failures from this change; never claim verification passed without running it.

After automated verification reaches a reviewable state:

1. Write back optional progress comments (only when requested by user or required by team convention); content must be truthful and must not claim user acceptance.
2. Inspect changes and workspace; commits must contain the full issue identifier (extracted via boundary-safe regex `\b[A-Z0-9]{1,5}-\d+\b` to avoid `ABC-12` matching `ABC-123`); only push when requested by user or permitted by project rules.
3. When creating a PR, link the issue, attach a change summary, validation results, unexecuted items, and risks; PR creation failure does not invalidate verified local implementation, but must be reported truthfully.
4. Run or wait for available CI; CI failed/not run means you cannot claim mergeable. CI passing does not substitute for user acceptance or production release.

## 6. User Acceptance and Moving to Review

The trigger for moving to Review is determined by the Review Gate policy (see "Review Gate Policy"). Before executing, read the policy (repository instructions → team/project instructions → user selection → default `user_acceptance`).

### Policy `user_acceptance` (default)

After automated verification, commit/PR/CI status have all been truthfully summarized, request final acceptance:

> Please verify whether the issue identified by ISSUE-ID has been resolved. Once you confirm, I will move it to the Review state.

When the user says the issue still exists or acceptance fails, stay in started, record feedback (add a "pending further investigation" comment if the user/caller requests), and continue fixing; do not add a "resolved" comment or move to Review.

Only when the user explicitly states acceptance has passed (e.g. "I verified it" or "acceptance passed") does the move to Review trigger.

### Policy `pr_ready`

After the PR is created and CI passes, the issue may move to Review without waiting for user acceptance. When moving to Review:

1. Confirm PR and CI status with the user.
2. Explicitly inform: under this policy, user acceptance occurs during the Review stage (verified during human review).

### Common Steps for Moving to Review

Regardless of policy, after the move-to-review trigger fires:

1. Re-read the issue, get team states, and resolve an unambiguous `review_state`.
2. If already in the target Review state, skip the state write; check for an identical audit comment to avoid duplication.
3. After updating state, read back to confirm actual state; if failed, report and do not claim success.
4. Add and read back a resolution summary comment: Resolution summary, Root cause, Implementation, Key files, Validation performed, Validation not performed, Known limitations, Commit/PR reference.
5. State succeeded but comment failed: explicitly report "state succeeded, comment failed"; comment succeeded but state failed: report separately, and do not claim moved to Review.

Human Review, CI review, and Merge are performed by the current project process or corresponding Skill. After Merge, stay in Review (or team-defined equivalent non-completed state) until a real release/deployment succeeds.

## 7. Post-Release Done

When the user explicitly confirms that a release/deploy has succeeded, or when a release/deploy or equivalent Skill provides a trusted successful deployment result, invoke [mark-done.md](mark-done.md). The Done sub-workflow can be invoked independently; callers should provide its input contract as fully as possible and must not rely on implicit context from this file.

## 8. Idempotency and Error Format

Read before every write; skip if the target state is already satisfied; re-read after timeout; only补do uncompleted steps; do not repeat adding identical comments. State and comment operations on a single issue are independently auditable steps.

Each state change outputs: `Issue, original state, target state, actual state, state update, comment update, verification method`; use tables for batches and never expose tokens, full internal JSON, or irrelevant metadata. Errors output at minimum:

```text
Issue:
Step:
Result:
Error reason:
Retryable:
Suggested action:
```

## 9. Template System: Issue Creation and Review

When drafting or creating a Linear issue, select **one** template from `references/templates/` using the routing table below. Templates only collect information that changes planning, implementation, security, or verification; optional fields are left blank or marked `unknown`, never fabricated.

| Request | Template |
| --- | --- |
| New idea or user-visible capability | Idea / Feature |
| Existing behavior is incorrect | Bug Report |
| Internal structure should be improved without changing expected behavior | Refactor |
| Reviewing a change, PR, or workflow design | Change Review |
| Verifying a package artifact or release | Release Review |

- Template files: `idea-feature.md`, `bug-report.md`, `refactor.md`, `change-review.md`, `release-review.md`; shared `finding.md` is only used inside Change Review findings, not a sixth top-level template.
- Change Review distinguishes depth via `Review depth: Quick | Full`; does not split into two templates.
- Refactor must record the invariant: must not produce unintended public API, behavior, lifecycle, state, or output format changes.
- **Using a template does not bypass the user confirmation required before issue creation**: after selecting and filling the template, you must still follow the confirmation rules in section 2 to obtain explicit user confirmation before creating the issue.
- Composite-type requests: select one primary template, track the rest via related issues; do not produce a single large mixed issue.
- Template overview and selection in `references/templates/README.md`.
