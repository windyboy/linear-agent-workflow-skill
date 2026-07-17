# Output Contracts: Idempotency and Error Format

## Idempotency Rules

- Read before every write
- Skip if the target state is already satisfied
- Re-read after timeout
- Only complete uncompleted steps
- Do not repeat adding identical comments
- State and comment operations on a single issue are independently auditable steps

## State Change Output

Each state change outputs: `Issue, original state, target state, actual state, state update, comment update, verification method`; use tables for batches and never expose tokens, full internal JSON, or irrelevant metadata.

## Error Format

```text
Issue:
Step:
Result:
Error reason:
Retryable:
Suggested action:
```

## Execution Context Conflict & Paused Reporting

When an Execution Context conflict or pause occurs, report it in the current output (never auto-repair or auto-merge). Use the error format above with these conventions:

- `observed context conflict` — `context_revision` or observed plan hash mismatch on write; no Context file is modified; require user selection or explicit takeover.
- `context consistency uncertain` — cross-file revision/log mismatch after recovery; pause and report; do not auto-fix.
- `ghost branch` / `baseline drift` — referenced branch missing or working tree diverged from recorded baseline; pause and report.
- `paused` (context state) — recorded with a required `paused_reason`; the issue stays in its current Linear state until the user resolves.

Report format (write-free — the Agent must not modify any Context file in the conflict path):

```text
Issue: <id>
Step: <read-back / write>
Result: observed context conflict   (or) paused: <reason>
Error reason: context_revision/hash mismatch (another writer touched plan.md) | ghost branch | baseline drift | >1 candidate context | >1 binding
Retryable: yes (after user selection or explicit takeover and re-read baseline)
Suggested action: select the authoritative context / resolve duplicate binding / re-read baseline before writing
```

These reports are advisory output only; they do not change Linear state unless the user authorizes a subsequent write (Invariant 3). A local `completed` context state is never reported as release or Done evidence.
