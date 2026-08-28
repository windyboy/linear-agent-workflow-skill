---
name: linear-workflow
description: Linear issue lifecycle with configurable profiles. Use for Linear, issue IDs (ABC-123), creating/starting work, plans, PRs, review, release, or closing issues. Profiles: minimal, standard, strict.
---

# Linear Workflow

Unified Linear issue lifecycle. Uses the host's Linear integration (MCP, API, or equivalent).

## Five Invariants (non-negotiable)

1. **Read-Before-Write** — Re-read before any status change
2. **Write-Back Verification** — Read back after every write
3. **Authorization** — No create/modify without user authorization
4. **Team/Project Boundary** — No cross-boundary writes; escalate
5. **Reality Check** — Done only with evidence matching `completion_gate`

Details: [references/invariants.md](references/invariants.md)

## Lifecycle

**Work phases** (how to solve an issue):

```text
发现 → 解决方案 → 任务分解 → 执行 → 检验
discover → solution → tasks → execute → verify
```

Details: [references/work-phases.md](references/work-phases.md)

**Linear states** (issue status):

```text
backlog/unstarted → started → review → completed
```

Linear state types: `backlog` → `unstarted` → `started` → `completed` → `canceled`

Issue ID regex: `\b[A-Z0-9]{1,5}-\d+\b`

## Profiles

| Profile | For | Traits |
|---|---|---|
| **minimal** | 1–2 people | Implicit plan, PR-ready review, no audit |
| **standard** | Small teams | Risk-based plan, PR-ready review, summary audit |
| **strict** | Enterprise | Explicit plan, user-acceptance review, detailed audit |

Config: [configuration.md](configuration.md) · Schema: [references/configuration-schema.md](references/configuration-schema.md)

## Optional: Execution Context

`execution_context.mode`: `disabled` (default) | `auto` | `required`

- **Layer 1 — Workflow Binding**: frozen governance on Linear (always for new issues)
- **Layer 2 — Execution Context**: local `plan.md` / `findings.md` / `progress.md`

Protocol: [references/execution-context.md](references/execution-context.md)

## Agent Brief

At handoff points (start, progress, pause, review, done), post a second-person **Agent Brief** comment so the next Agent session can pick up quickly. Independent of audit comments; no extra config. See [references/agent-brief.md](references/agent-brief.md).

## Quick Start

| Step | User says | Agent does |
|---|---|---|
| Discover | "Create dark mode feature" | Clarify, create issue, return ID |
| Start | "Start ABC-123" | 发现 → 解决方案 → 任务分解 → confirm (per profile) → 执行 → `started` |
| Implement | "Pushed changes" | 检验: PR + CI → review (per `review_gate`) |
| Done | "Mark ABC-123 done" | 检验: release/deploy evidence → `completed` |

```yaml
# linear-workflow.config.yaml (optional; default profile: standard)
version: 1
profile: standard
```

Diagnose: `linear-workflow config diagnose`

## Reference Files

Load only when needed:

| File | When |
|---|---|
| [invariants.md](references/invariants.md) | Invariant details |
| [configuration-schema.md](references/configuration-schema.md) | Config / profiles |
| [capability-discovery.md](references/capability-discovery.md) | First Linear op in session |
| [execution-context.md](references/execution-context.md) | Layer 1 + 2 protocol |
| [workflow-binding.md](references/workflow-binding.md) | Binding read/write/read-back |
| [work-phases.md](references/work-phases.md) | 5-phase resolve flow |
| [issue-discovery.md](references/issue-discovery.md) | Browse / create / query (发现) |
| [start-implementation.md](references/start-implementation.md) | Solution, tasks, execute, verify |
| [move-to-review.md](references/move-to-review.md) | Move to Review |
| [agent-brief.md](references/agent-brief.md) | Agent handoff comments |
| [output-contracts.md](references/output-contracts.md) | Errors, idempotency |
| [project-scope.md](references/project-scope.md) | Scope boundaries |
| [resume-work.md](references/resume-work.md) | Resume interrupted work |
| [mark-done.md](mark-done.md) | Mark Done (standalone) |
| [templates/](templates/) | Issue templates |

## Transitions

| State | Action | Evidence |
|---|---|---|
| `backlog` / `unstarted` | → `started` | User confirms start (per profile) |
| `started` (impl) | → review | PR ready or user verified (per `review_gate`) |
| `started` (review) | → `completed` | Per `completion_gate` |
| `completed` / `canceled` | — | Reopen only on explicit request |

## Escalations

- Ambiguous state → ask user
- Cross-project write → confirm (per `project_check`)
- Missing capability → report; don't simulate
- Timeout → re-read before retry
- Already in target state → skip
- Invariant violation → report which one; stop

## Errors

Report: what happened · why · suggested action. Format: [output-contracts.md](references/output-contracts.md)

---

**Version**: 0.6.0 · **Profiles**: minimal, standard, strict
