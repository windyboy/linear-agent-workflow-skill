# Review Gate Policy (Configurable)

The point at which an issue moves to Review is controlled by the **Review Gate** policy. The point at which an issue is marked Done is controlled by the **Completion Gate**. Both gates are determined by the **active Profile** (resolved from `configuration.md` via `mergeConfig`), not hardcoded here. This document describes the policy options and how they are selected; the authoritative defaults live in `configuration.md` and `profile-parser.mjs`.

## Supported Policies

| Policy | Review Gate trigger | Typical flow |
| --- | --- | --- |
| `pr_ready` (default for `minimal` and `standard`) | PR created and CI passes | CI → Review (acceptance during review) → Human review → Merge |
| `user_acceptance` (default for `strict`) | User explicitly accepts the change | CI → User acceptance → Review → Human review → Merge |

The Completion Gate has three possible values:

| Completion Gate | Done trigger | Default for |
| --- | --- | --- |
| `release_confirmed` | User confirms release OR trusted deployment evidence | `minimal`, `standard` |
| `production_deployment` | Trusted production deployment evidence ONLY | `strict` |
| `manual` | Explicit manual confirmation ONLY | (override only) |

## Policy Source and Priority

The effective `review_gate` / `completion_gate` are resolved from the active Profile plus any explicit overrides, in this order:

1. **Explicit override**: `overrides.review_gate` / `overrides.completion_gate` in `linear-workflow.config.yaml` (must satisfy the Profile's allowed combinations — see `configuration.md` Forbidden Combinations).
2. **Active Profile default**: `minimal` / `standard` → `pr_ready` / `release_confirmed`; `strict` → `user_acceptance` / `production_deployment`.
3. **Repository-level instructions**: `AGENTS.md`, `CLAUDE.md`, or equivalent Agent instructions declaring `review_gate` / `completion_gate`.
4. **User explicit selection**: The user explicitly chooses a policy in the current session.

When multiple sources conflict, ask the user which one to adopt; never infer on your own. The resolved values must always be read back from the effective configuration (`linear-workflow config diagnose`), never assumed.

## Rules Unaffected by Policy

- **Completion Gate is profile-driven**: Done may only be written after evidence matching the *resolved* `completion_gate` (e.g. `release_confirmed` or `production_deployment`). It is not a single fixed value across all Profiles.
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
