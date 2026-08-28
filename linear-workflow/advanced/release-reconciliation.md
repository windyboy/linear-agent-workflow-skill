# Release Reconciliation

Auto-close issues from release scope. Load when `release_reconciliation: enabled` or explicitly requested.

## Inference

From `previous_release_ref` / `current_release_ref` / `release_commit` / `release_version`:

1. Collect commits in scope
2. Extract IDs via `\b[A-Z0-9]{1,5}-\d+\b`
3. **Strong** (commit/branch/PR/Linear link) → candidate
4. **Weak** (semantic match) → needs confirmation
5. Authorize before any write

## Reverts

Detect `revert:` patterns. Don't auto-complete on revert alone. Reconsider only when fix restored and deployed.

## Batch

Per issue: read before write; skip if already done; timeout → re-read before retry. Partial failure: report state/comment separately. One failure doesn't block others.

## Report

| Issue | Title | States | Results | Evidence | Notes |

Failures use [output-contracts.md](../references/output-contracts.md) format.
