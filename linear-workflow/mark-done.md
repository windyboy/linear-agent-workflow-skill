# Mark Done

Standalone sub-workflow: mark issue `completed` after verified release/deployment. Callable by release/deploy skills.

ID pattern: `\b[A-Z0-9]{1,5}-\d+\b`

## Requirements (all)

1. Issue identified (explicit ID or strong evidence in branch/PR/commit)
2. Team boundary verified
3. `completion_gate` satisfied:
   - `release_confirmed` — user confirms or trusted `deployment_status=success`
   - `production_deployment` — production evidence (logs, health checks)
4. Authorization obtained
5. Write read back as `completed`

## Invocation

```yaml
issue_ids: [ABC-123]
deployment_status: success    # required for automation
deployment_evidence: "..."
release_version: "1.2.3"
source: "release-workflow"
```

## Output

```yaml
updated_issues: []
already_done_issues: []
failed_issues: []
weak_matches_requiring_confirmation: []
comment_failures: []
```

Post final **Agent Brief** — [references/agent-brief.md](references/agent-brief.md).

## Context Independence

No Execution Context required. Local context `completed` ≠ release evidence. Gate + evidence rules only (Invariant 5).

Advanced (batch, revert, reconciliation): [advanced/release-reconciliation.md](advanced/release-reconciliation.md)

## Examples

- User: "Mark ABC-123 done; deployed" → verify team, confirm, write + read back
- Automation: `deployment_status=success` + logs → verify caller, write + read back
