# Move to Review

The trigger for moving to Review is determined by the [Review Gate Policy](review-gate-policy.md). Before executing, read the policy and resolve the effective `review_gate` from the active Profile (repository instructions → team/project instructions → user selection → Profile default). Do not assume a hard-coded default; the Profile default is `pr_ready` for the `minimal` and `standard` profiles and `user_acceptance` for the `strict` profile (see `configuration.md`).

## Policy `user_acceptance`

After automated verification, commit/PR/CI status have all been truthfully summarized, request final acceptance:

> Please verify whether the issue identified by ISSUE-ID has been resolved. Once you confirm, I will move it to the Review state.

When the user says the issue still exists or acceptance fails, stay in started, record feedback (add a "pending further investigation" comment if the user/caller requests), and continue fixing; do not add a "resolved" comment or move to Review.

Only when the user explicitly states acceptance has passed (e.g. "I verified it" or "acceptance passed") does the move to Review trigger.

## Policy `pr_ready`

After the PR is created and CI passes, the issue may move to Review without waiting for user acceptance. When moving to Review:
1. Confirm PR and CI status with the user.
2. Explicitly inform: under this policy, user acceptance occurs during the Review stage (verified during human review).

## Common Steps

Regardless of policy, after the move-to-review trigger fires:
1. Re-read the issue, get team states, and resolve an unambiguous `review_state`.
2. If already in the target Review state, skip the state write; check for an identical audit comment to avoid duplication.
3. After updating state, read back to confirm actual state; if failed, report and do not claim success.
4. Add and read back a resolution summary comment: Resolution summary, Root cause, Implementation, Key files, Validation performed, Validation not performed, Known limitations, Commit/PR reference.
5. State succeeded but comment failed: explicitly report "state succeeded, comment failed"; comment succeeded but state failed: report separately, and do not claim moved to Review.

## Execution Context Reconciliation (optional)

The full protocol lives in [execution-context.md](execution-context.md). This step is independent of `audit_comments`.

- **When an Execution Context exists** (an `execution_context_v1` `plan.md` is present for this issue): before firing the move-to-review trigger, run an execution-alignment check — scope complete or deviations explained, validation performed and recorded, risks identified, and the PR/CI reconciled with the recorded phases. If alignment fails, report the gaps; do not claim review readiness.
- **When no Execution Context exists**: skip this reconciliation entirely and preserve the current behavior above. `execution_context.mode: disabled` produces no Layer 2 files and no reconciliation.

Human Review, CI review, and Merge are performed by the current project process or corresponding Skill. After Merge, stay in Review (or team-defined equivalent non-completed state) until a real release/deployment succeeds.
