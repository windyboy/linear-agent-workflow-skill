# Mark Done: From Deployment Evidence to `completed`

This sub-workflow can be independently invoked by release, deploy, review, or other Skills; it does not rely on implicit context from the main workflow and does not treat Done as a default closing action. Uses the current environment's Linear integration; does not assume tool names, hosts, or fixed state names.

## Invocation Contract

The caller provides available information (all optional, except `deployment_status` is required for automated invocation):

```text
issue_ids: optional list of explicit identifiers
project_scope: optional current project/team identifier; required when scope cannot be inferred
release_version: optional
release_commit: optional
previous_release_ref: optional
current_release_ref: optional
deployment_environment: optional
deployment_status: required for automated caller; must indicate success
deployment_evidence: optional URL, record, or user statement
source: optional calling skill or user request
```

Output structure (expressed as user-readable tables and equivalent fields):

```text
updated_issues
already_done_issues
failed_issues
weak_matches_requiring_confirmation
unmatched_issues
comments_created
comment_failures
```

## Project Scope Validation

By default, only issues within the current code project scope are processed. The caller should provide `project_scope`, or provide a verifiable current project/team mapping; when missing, conflicting, or unverifiable, do not write. Cross-project candidates in the release scope are only reported as cross-project items unless the user explicitly specifies that project scope and confirms the write.

## Release Confirmation Prerequisites

Write `completed` only when at least one of the following is met:

1. The user explicitly states in the current session that the corresponding change has been released, launched, or deployed successfully;
2. The caller provides `deployment_status=success` with trusted deployment evidence;
3. The current environment can read a clear successful production release record.

Release tags, build artifacts, commits, pushes, PRs, PR merges, tests, or approvals are each individually insufficient evidence; a tag is only valid when deployment/release records or other evidence prove it is effective in the target environment. When evidence is insufficient, do not write, do not change In Review to Done, and explain what is missing.

### Precise Conditions for Unattended Automated Completion

Automatic `completed` writes without human confirmation are only permitted when **all** of the following are satisfied:

1. The caller is a trusted automation (release/deploy/review workflow or equivalent Skill) and explicitly passes `deployment_status=success`;
2. Trusted deployment evidence is provided (`deployment_evidence` or an environment-readable successful deployment record);
3. The target issue's **team** membership has been verified (team is the required write boundary);
4. If the request is project-scoped, project membership has been verified; for pure team scope without a project-only restriction, issues without a project may also be processed;
5. Each issue to be written has entered the candidate list via explicit ID or strong evidence, and has obtained authorization under conditions 1–4 above.

Strong evidence or "entering the candidate list" **never** constitutes authorization for unattended completion; when any of the above conditions is missing, stop and explain what is missing; do not write.

## Mode A: Explicit Issue ID

Entered when the user explicitly provides a valid identifier. **Explicit IDs only identify the target issue, do not constitute write authorization**; the release confirmation from "Release Confirmation Prerequisites" is still required (user explicitly states released/launched/deployed successfully, or trusted caller provides `deployment_status=success` with trusted evidence) before write authorization is granted.

1. Validate the identifier matches the full boundary format `\b[A-Z0-9]{1,5}-\d+\b` (normalize case and format on comparison; prefixes may include letters and numbers, e.g. `w1n-11`); report format errors or non-existent issues individually.
2. Read each issue, recording title, original state, team, assignee, priority, and release evidence; **verify team membership before each write** (team is the required write boundary).
3. Skip already-completed issues; do not change canceled/triage; do not change backlog/unstarted and explain that the lifecycle must be followed first. Only startable states (started/Review etc.) enter the write path.
4. Read the team's workflow states, uniquely resolve `completed_state`, and update using its ID.
5. Read back to confirm state is completed and preserved fields (assignee, priority, etc.) have not been inadvertently changed.
6. Add and read back a release comment; check for an identical release evidence/version/commit comment to avoid duplication.

The comment includes: version, release commit, environment, timestamp, release evidence, calling source, and `Marked by linear-workflow / mark-done`. Unavailable fields show `—`, never fabricate.

## Mode B: Automatic Reconciliation from Release Scope

Used only when no explicit issue ID is provided. Prioritize scope determination from the caller-provided `previous_release_ref`, `current_release_ref`, `release_commit`, or `release_version`. When these are missing, check deployment records, release tags/branches, or release commits; if scope still cannot be reliably determined, stop and request the scope or issue IDs; **never** arbitrarily scan recent commits.

Collect commit hashes/messages, branches, PRs, Linear associations, revert/cherry-pick/squash information, and release notes within the scope. Merge commits alone are not completion evidence; check the actual commits they introduce. Squash merges may use the PR title/description as the source and should be noted.

| Evidence level | May enter candidate list (does not imply write authorization) |
| --- | --- |
| Strong: full identifier appears in commit message, branch, PR title, Linear association, or release notes | May be added to candidate list |
| Weak: title semantics, modified files, comment content, time, or author similarity | No; only show candidates and wait for user confirmation |

> Strong evidence only adds an issue to the **candidate list** and never implies write authorization. Whether to write is determined by the "Authorization" stage (see the four-stage process and confirmation rules below).

Full boundary matching prevents `ABC-12` matching `ABC-123`. A single commit may link to multiple issues, and a single issue may have multiple commits. When detecting `revert:`, `This reverts commit`, or equivalent revert relationships, do not auto-Done the original change; only reconsider when subsequent evidence indicates the fix was restored and is deployed. When processing revert-of-revert, cherry-pick, hotfix/release branches, record the evidence chain.

Divide candidates into four distinct stages:

1. **Discovery**: scan the release scope to find potential issues.
2. **Proposed list**: strong evidence may enter the candidate list; weak evidence only shows candidates. The candidate list is a suggestion, not a to-do.
3. **Authorization**: writing `completed` requires explicit user confirmation, or a trusted caller (release/deploy/review automation) providing `deployment_status=success` with trusted evidence.
4. **Mutation**: actual state writes and comments are only executed after stage 3 authorization.

List candidates for strong evidence; for weak evidence display: `Issue | Match basis | Evidence level | Recommendation`. **Entering the candidate list does not equal write authorization**: any auto-inferred issue requires confirmation before writing; explicit IDs only need to echo the list first, but also require release confirmation (see Release Confirmation Prerequisites) before write authorization.

### Confirmation Rules Comparison (Explicit ID vs Inferred ID)

| Source | Enters candidate list | Write authorization confirmation required |
| --- | --- | --- |
| Explicit ID (user-provided) | Yes (directly located) | Still requires release confirmation: user says released, or trusted caller `deployment_status=success` + evidence |
| Strong inference (full identifier in commit/branch/PR/association/release notes) | Yes | Requires explicit user or trusted caller authorization; must not auto-write |
| Weak inference (semantic/file/comment/time/author similarity) | Only shows candidates | Requires explicit user confirmation; must not auto-write |

Regardless of source, team membership must be verified before writing; cross-team/cross-project candidates are never written unless the user explicitly confirms scope for each issue.

## Examples

The following scenarios illustrate the boundaries between candidate list, authorization, and writing:

- **Explicit ID (authorized write)**: User says "W1N-20 has been released", provides `W1N-20`. Validates full boundary format, reads issue, verifies team membership, user confirmed released → authorized to write `completed`.
- **Strong inference (candidate, requires authorization)**: Release scope commit contains `Fix W1N-21 ...`, `W1N-21` fully appears in commit message. Enters candidate list; but **does not auto-write**; requires user or trusted caller confirmation before writing.
- **Weak inference (candidate only, requires confirmation)**: A commit modifies files related to `W1N-22` description, but no identifier. Only shown as candidate with match basis explained; must not write unless user explicitly confirms.
- **Issue without a project (team verified, processable)**: `W1N-23` belongs to team W1ndy but has no Linear project. Team boundary verified and no project-only restriction → may be processed per the above rules; not blocked by missing project.
- **Cross-project candidate (exclude/require per-issue confirmation)**: Release scope infers `OTHER-5` belongs to a different team/project. Excluded by default, only reported as cross-project item; unless user explicitly specifies that project scope and confirms per-issue, do not write.
- **Cross-team candidate (always excluded)**: Inferred issue belongs to a different team. Regardless of evidence strength, never write; team is the required boundary.

## Batch Execution, Idempotency, and Partial Failure

Treat each issue as an independent unit: read → map completed → update → read back → comment → read back. One issue's failure does not prevent processing of other confirmed, independent issues; global faults like auth/integration unavailable are the exception.

- Read before every write; skip state write when already in the target state.
- After update timeout, re-read first to confirm whether it succeeded before deciding whether to retry.
- State succeeded, comment failed: report partial success, retain pending comment content; on re-run, only补the comment.
- Comment succeeded, state failed: report partial success, do not call it Done; on re-run, only handle the state and avoid duplicate comments.
- When an issue is cancelled, deleted, archived, has no permissions, or team/state does not exist, record that issue as failed and continue with other processable items.

Final report:

| Issue | Title | Original state | Target state | State result | Comment result | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |

Categorize results as updated, already done, skipped, failed, needs confirmation. For each failure, output:

```text
Issue:
Step:
Result:
Error reason:
Retryable:
Suggested action:
```
