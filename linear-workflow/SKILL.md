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

**Work phases:** `discover → solution → tasks → execute → verify` — [work-phases.md](references/work-phases.md)

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

When `disabled`, no Layer 2 files are created; newly bound issues still receive the minimal Layer 1 Workflow Binding.

Protocol: [references/execution-context.md](references/execution-context.md)

## Optional: Collaboration Lite

For a personal/small-project Issue that needs a few bounded local workstreams, use opt-in collaboration-lite. It keeps Linear authority and lifecycle semantics unchanged; without a task packet, stay on the single-Agent flow. Reference: [references/collaboration.md](references/collaboration.md) · packet: [templates/task-packet.md](templates/task-packet.md).

## Agent Brief

At handoff points (start, progress, pause, review, done), post a second-person **Agent Brief** comment so the next Agent session can pick up quickly. Independent of audit comments; no extra config. See [references/agent-brief.md](references/agent-brief.md).

## Quick Start

| Step | User says | Agent does |
|---|---|---|
| Discover | "Create dark mode feature" | Clarify, create issue, return ID |
| Start | "Start ABC-123" | Discover → solution → tasks → confirm → execute → `started` |
| Implement | "Pushed changes" | Verify: PR + CI → review (per `review_gate`) |
| Done | "Mark ABC-123 done" | Verify: release/deploy evidence → `completed` |

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
| [collaboration.md](references/collaboration.md) | Optional small-project workstreams |
| [workflow-binding.md](references/workflow-binding.md) | Binding read/write/read-back |
| [work-phases.md](references/work-phases.md) | 5-phase resolve flow |
| [issue-discovery.md](references/issue-discovery.md) | Discover: browse / create / query |
| [start-implementation.md](references/start-implementation.md) | Solution, tasks, execute, verify |
| [move-to-review.md](references/move-to-review.md) | Move to Review |
| [agent-brief.md](references/agent-brief.md) | Agent handoff comments |
| [output-contracts.md](references/output-contracts.md) | Errors, idempotency |
| [project-scope.md](references/project-scope.md) | Scope boundaries |
| [resume-work.md](references/resume-work.md) | Resume interrupted work |
| [mark-done.md](mark-done.md) | Mark Done (standalone) |
| [templates/](templates/) | Issue and local coordination templates |

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
