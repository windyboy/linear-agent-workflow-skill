---
name: linear-workflow
description: Manage the end-to-end delivery lifecycle of Linear issues. Use when the user mentions Linear, an issue identifier (e.g. ABC-123), unfinished requirements or bugs, creating issues, starting/picking up work, implementation plans, branching, PRs, verification, moving to Review, releasing/deploying, or closing issues. Only for Linear issue lifecycle; executes queries, started, Review, and post-release completed safely via the current runtime's Linear integration.
---

# Linear Workflow

Host-agnostic: uses the **Linear integration** provided by the current Agent runtime (Linear MCP, API, connector, or equivalent tool provider). Tool names are illustrative; actual names are determined by the current environment.

## Non-Negotiable Rules

1. **Read before write** — re-read issue before any status change
2. **Verify after write** — confirm status with read-back
3. **Merge ≠ Done** — only production release = Done
4. **Project scope** — current project only unless user explicitly says otherwise
5. **No skipping without evidence** — every stage requires corresponding evidence

## Lifecycle

```text
Need → Confirm → Create/Select Issue → Read → Inspect Code → Plan → Confirm Start
→ Update to Started + Branch → Implement → Run Tests → Commit → Push → PR
→ CI → Request Acceptance → Move to Review → Human Review → Merge → Deploy → Done
```

## State Machine

**State types** (Linear API): `backlog` → `unstarted` → `started` → `completed` → `canceled`

Special types: `duplicate` (auto-managed), `triage` (optional inbox). Multiple states can share a type.

**Canonical identifier extraction**: use boundary-safe regex `\b[A-Z0-9]{1,5}-\d+\b` (extracted via boundary-safe regex to avoid partial matches like `ABC-12` matching `ABC-123`).

**State discovery**: Get issue → identify team → get team's workflow states → map by **type** not name.

## Transition Table

| Current State | Allowed Actions | Evidence Required |
|---------------|-----------------|-------------------|
| `backlog` / `unstarted` | Start work → `started` | User confirms start |
| `started` (implementation) | Move to review → `started` (review) | User says "verified" |
| `started` (review) | Mark done → `completed` | Production release confirmed |
| `completed` / `canceled` | None (unless explicit reopen) | — |

## Safety Escalations

- **Ambiguous state mapping** → ask user which state to use
- **Cross-project writes** → require explicit user confirmation
- **Missing capabilities** → report limitation, do not simulate
- **Timeout** → re-read before retry
- **Already in target state** → skip, do not re-write

## Reference Files

Load only when relevant to the current phase:

| File | When to Load |
|------|--------------|
| [references/capability-discovery.md](references/capability-discovery.md) | First Linear operation in session |
| [references/issue-discovery.md](references/issue-discovery.md) | Browsing, creating, or querying issues |
| [references/start-implementation.md](references/start-implementation.md) | Reading issue, planning, branching, implementing |
| [references/move-to-review.md](references/move-to-review.md) | Verification, acceptance, moving to Review |
| [references/output-contracts.md](references/output-contracts.md) | Error handling, idempotency, audit format |
| [references/project-scope.md](references/project-scope.md) | Scope boundary decisions |
| [references/resume-work.md](references/resume-work.md) | Resuming interrupted work |
| [references/review-gate-policy.md](references/review-gate-policy.md) | Configuring Review trigger |
| [references/template-system.md](references/template-system.md) | Creating issues from templates |
| [mark-done.md](mark-done.md) | Marking issues Done (independently callable) |
