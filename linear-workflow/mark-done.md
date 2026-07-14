# Mark Done: Release Evidence to `completed`

This subprocess can be called independently by release, deploy, review, or other skills; does not depend on implicit context from the main workflow, and does not treat Done as a default closing action. Use the current environment's Linear integration; do not assume tool names, host, or fixed state names.

## Invocation Contract

Caller provides available information (all optional, except `deployment_status` must be present for automated calls):

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

Output structure (expressed in user-readable table and equivalent fields):

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

Default only processes issues within current code project scope. Caller should pass `project_scope` or provide verifiable current project/team mapping; when missing, conflicting, or unverifiable, do not write. For cross-project candidates in release scope, only report as cross-project items unless user explicitly specifies that project scope and confirms write.

## Confirm Release Prerequisites

Only write `completed` when one of these is met:

1. User explicitly states in current session that corresponding changes have been released, deployed, or deployed successfully;
2. Caller provides `deployment_status=success` and credible deployment evidence;
3. Current environment can read clear production release success records.

Release tags, build packages, commits, pushes, PRs, PR merges, tests, or approvals alone are not sufficient evidence; tags are only valid when there are deployment/release records or other evidence proving they have taken effect in the target environment. When evidence is insufficient, do not write, do not change In Review to Done, and explain what is missing.

## Mode A: Explicit Issue IDs

When user explicitly provides valid identifiers and simultaneously confirms release:

1. Validate identifier is complete boundary format `\b[A-Z]{1,5}-\d+\b` (case-insensitive comparison allowed); report individually when format is wrong or does not exist.
2. Read each issue, record title, original status, team, assignee, priority, and release evidence.
3. Skip already completed issues; do not change canceled/triage; do not change backlog/unstarted and explain lifecycle must be followed first; only started/Review states that can be completed enter the write.
4. Read that team's workflow states, uniquely parse `completed_state`, use its ID to update.
5. Read back, confirm state is completed and preserved fields like assignee, priority are not unintentionally changed.
6. Add and read back release comment; check if identical release evidence/version/commit comment already exists to avoid duplicates.

Comment includes: version, release commit, environment, time, release evidence, invocation source, and `Marked by linear-workflow / mark-done`. Unavailable fields show `—`, do not fabricate.

## Mode B: Auto-Verify from Release Scope

Only used when no explicit issue IDs are provided. Prefer caller-provided `previous_release_ref`, `current_release_ref`, `release_commit`, or `release_version` to determine scope. When missing, can check deployment records, release tags/branches, or release commits; if still unable to reliably determine scope, stop and request scope or issue IDs, **do not** randomly scan recent commits.

Collect commit hashes/messages, branches, PRs, Linear associations, revert/cherry-pick/squash information, and release notes within scope. Merge commits themselves are not completion evidence; check actual commits they introduce; squash merges can use PR title/description as source and note this.

| Evidence Level | Can Auto-Enter Update List |
| --- | --- |
| Strong: Full identifier appears in commit message, branch, PR title, Linear association, or release notes | Yes |
| Weak: Title semantics, modified files, comment content, time, or author similarity | No; only show candidates and wait for user confirmation |

Full boundary matching prevents `ABC-12` matching `ABC-123`. One commit can be associated with multiple issues, same issue can have multiple commits. When detecting `revert:`, `This reverts commit`, or equivalent undo relationships, do not auto-Done original changes; only reconsider when subsequent evidence shows fix was restored and released. When handling revert of revert, cherry-pick, hotfix/release branches, document evidence chain.

For strong evidence, list candidate list; for weak evidence show: `Issue | Match Basis | Evidence Level | Recommendation`, wait for user explicit confirmation before writing. Any auto-inferred issues require confirmation; explicit IDs only need echo list first.

## Batch Execution, Idempotency, and Partial Failures

Treat each issue as independent unit: read → map completed → update → read back → comment → read back. One issue failure does not prevent other confirmed, independent issues from being processed; except for global failures like auth/global integration unavailable.

- Before each write, read first; if already in target state, skip status write.
- After timeout, re-read first to confirm whether successful before deciding whether to retry.
- Status succeeds, comment fails: Report partial success, retain pending comment content; on re-run only supplement comment.
- Comment succeeds, status fails: Report partial success, do not claim Done; on re-run only process status and avoid duplicate comments.
- When issue is canceled, deleted, archived, no permission, or team/state does not exist, record that issue as failed and continue other processable items.

Final report:

| Issue | Title | Original Status | Target Status | Status Result | Comment Result | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |

Distinguish results as updated, already done, skipped, failed, needs confirmation. For each failure, output:

```text
Issue:
Step:
Result:
Error reason:
Retryable:
Suggested action:
```