# Output Contracts

## Idempotency

- Read before every write
- Skip if target state already satisfied
- Re-read after timeout
- Only complete unfinished steps
- No duplicate identical comments
- Agent Brief: skip if latest `---agent-brief---` substantially unchanged
- State and comment ops are independent

## State Change Output

Per change: issue, original/target/actual state, state update, comment update, verification method. Tables for batches. No tokens or raw JSON.

## Error Format

```text
Issue:
Step:
Result:
Error reason:
Retryable:
Suggested action:
```

## Context Conflicts

Report only; never auto-repair. Use error format above:

| Result | Meaning |
|---|---|
| `observed context conflict` | revision/hash mismatch; don't modify context |
| `context consistency uncertain` | cross-file mismatch after recovery |
| `ghost branch` / `baseline drift` | branch missing or tree diverged |
| `paused` | context paused; Linear state unchanged |

Advisory only — no Linear state change without user authorization. Local `completed` context ≠ Done evidence.
