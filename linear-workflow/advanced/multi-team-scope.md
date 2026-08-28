# Multi-Team Scope

Load when `project_check: required` or explicitly requested.

## Team (hard boundary)

Verify issue team = context team. Cross-team → STOP (Invariant 4). No override.

## Project (soft boundary)

| `project_check` | Behavior |
|---|---|
| `disabled` | Team only; cross-project reported not blocked |
| `when_configured` | Match context project if set |
| `required` | Only explicit project; block cross-project |

## Cross-Project Candidates

On release inference, group output:

```
In-scope: ABC-123, ABC-124
Cross-project (confirm): XYZ-456
Out-of-team (blocked): OTHER-1
```

Confirm before writing cross-project issues.
