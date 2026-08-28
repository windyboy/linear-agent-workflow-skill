# Minimal Profile

**For:** solo / rapid iteration.

```yaml
version: 1
profile: minimal
```

## Flow: ABC-123 Add dark mode

| Step | Behavior |
|---|---|
| Create | User requests → issue created |
| Start | Plan (no escalation) → `started` → branch |
| Push | PR + CI → review (no audit comment) |
| Done | User confirms release → `completed` |

**Traits:** implicit plan, PR-ready review, no audit, no project check.

**Limits:** no compliance trail, no auto release coordination.
