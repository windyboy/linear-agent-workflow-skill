# Mark Done Workflow

This sub-workflow marks a Linear issue as `completed` after verified release or deployment. It can be independently invoked by release, deploy, or other Skills.

**Identifier Pattern**: Issues are identified via boundary-safe regex `\b[A-Z0-9]{1,5}-\d+\b` (e.g., `ABC-123`, `W1N-17`, `F1-2`).

## Core Requirements

Write `completed` only when **all** of the following are met:

1. **Issue is identified** via explicit ID (e.g., `ABC-123`) or strong evidence (full identifier in commit message, branch, or PR title).
2. **Team boundary verified**: The issue belongs to the current team context; cross-team issues are never written.
3. **Completion gate satisfied**: Depends on active Profile:
   - `release_confirmed`: User explicitly confirms release, or trusted caller provides `deployment_status=success` with evidence.
   - `production_deployment`: Trusted deployment evidence (logs, health checks) confirms code is running in production.
4. **Authorization obtained**: User explicitly confirms, or trusted automation caller provides `deployment_status=success`.
5. **Write verified**: After writing, immediately read back to confirm state is `completed`.

## Invocation Contract

Caller provides (all optional except `deployment_status` for automated invocation):

```yaml
issue_ids: [ABC-123, DEF-456]              # Explicit identifiers
deployment_status: success                 # Required for automated caller
deployment_evidence: "URL or statement"    # Deployment proof
release_version: "1.2.3"                   # Optional
release_commit: "abc1234"                  # Optional
source: "release-workflow"                 # Calling source
```

## Output

Returns structured result:

```yaml
updated_issues: [ABC-123]
already_done_issues: []
failed_issues: []
weak_matches_requiring_confirmation: []
comment_failures: []
```

## Execution Context Independence

Mark Done is **independently callable** and never requires an Execution Context. A local `completed` context state (the `execution_context_v1` `plan.md` reaching `completed`) is working memory only and is **not** evidence of release or production deployment. Completion is decided solely by the configured `completion_gate` and the evidence rules above (Invariant 5). When `execution_context.mode: disabled` (the default), no Execution Context exists and the behavior is unchanged.

## Advanced Features

For complex scenarios (automatic reconciliation from release scope, revert handling, batch processing, partial failure recovery), see `linear-workflow/advanced/release-reconciliation.md`.

## Example

**User-initiated**: "Mark ABC-123 as done; we deployed to production."
- Read issue ABC-123, verify team, obtain user confirmation → write `completed` + comment.

**Automated**: Release workflow calls with `deployment_status=success` and deployment logs.
- Validate caller is trusted, verify team, write `completed` + comment, read back.
