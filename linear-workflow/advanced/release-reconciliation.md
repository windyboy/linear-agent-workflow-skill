# Advanced: Release Reconciliation

This document covers automatic reconciliation of issues from release scope, revert handling, batch processing, and partial failure recovery. These features are only loaded when explicitly requested or when `release_reconciliation` is enabled in the active Profile.

## Automatic Reconciliation from Release Scope

When no explicit issue IDs are provided, the workflow can infer issues from release scope:

1. **Determine scope** from `previous_release_ref`, `current_release_ref`, `release_commit`, or `release_version`.
2. **Collect commits** within the scope; extract identifiers using boundary-safe regex `\b[A-Z0-9]{1,5}-\d+\b`.
3. **Classify evidence**:
   - **Strong**: Full identifier in commit message, branch, PR title, or Linear association → enters candidate list.
   - **Weak**: Semantic match, file similarity, or author correlation → shown as candidate, requires confirmation.
4. **Obtain authorization** before writing any issue.

## Revert Handling

When processing reverts:

- Detect `revert:` or `This reverts commit` patterns.
- Do **not** auto-complete the original change based on revert alone.
- Only reconsider completion when subsequent evidence shows the fix was restored and deployed.
- Record the revert chain for audit purposes.

## Batch Processing and Partial Failure

Process each issue independently:

- **Read before every write**: Skip if already in target state.
- **Timeout recovery**: After timeout, re-read to confirm whether write succeeded before retrying.
- **Partial success**:
  - State succeeded, comment failed: Report partial success, retain comment content for re-run.
  - Comment succeeded, state failed: Report partial success, do not mark as Done.
- **One failure does not block others**: Continue processing other confirmed issues.

## Final Report Format

| Issue | Title | Original State | Target State | State Result | Comment Result | Evidence | Notes |
|---|---|---|---|---|---|---|---|

For each failure, output:

```
Issue: ABC-123
Step: State update
Result: Failed
Error reason: Issue not found
Retryable: No
Suggested action: Verify issue exists and team membership
```

## Configuration

Enable this feature by setting `release_reconciliation: enabled` in your configuration. See `linear-workflow/configuration.md` for details.
