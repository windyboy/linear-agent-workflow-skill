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
