# Review Gate Policy (Configurable)

The point at which an issue moves to Review is controlled by the **Review Gate** policy. The point at which an issue is marked Done is controlled by the **Completion Gate**, which is **always** `production_deployment` and cannot be changed.

## Supported Policies

| Policy | Review Gate trigger | Typical flow |
| --- | --- | --- |
| `user_acceptance` (default) | User explicitly accepts the change | CI → User acceptance → Review → Human review → Merge |
| `pr_ready` | PR created and CI passes | CI → Review (acceptance during review) → Human review → Merge |

## Policy Source and Priority

1. **Repository-level instructions**: `AGENTS.md`, `CLAUDE.md`, or equivalent Agent instructions declaring `review_gate: user_acceptance` or `review_gate: pr_ready`.
2. **Team/project-level instructions**: Explicitly declared in Linear issue labels, description, or project documentation.
3. **User explicit selection**: The user explicitly chooses a policy in the current session.
4. **Default**: `user_acceptance` (current strict behavior).

When multiple sources conflict, ask the user which one to adopt; never infer on your own.

## Rules Unaffected by Policy

- **Completion Gate unchanged**: Regardless of Review Gate policy, Done may only be written after a trusted production release/deployment succeeds.
- **Stages must not be skipped without evidence**: Each stage requires corresponding evidence (see [resume-work.md](resume-work.md)).
- **State writes must still be read back for verification**.

## Policy Declaration Examples

In `AGENTS.md` or equivalent file:

```markdown
## Workflow Policy
- review_gate: pr_ready
```

Or in a Linear issue description:

```markdown
Workflow: review_gate=pr_ready
```
