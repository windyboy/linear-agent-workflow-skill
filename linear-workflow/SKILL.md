---
name: linear-workflow
description: Manage the end-to-end delivery lifecycle of Linear issues with configurable workflow profiles. Use when the user mentions Linear, an issue identifier (e.g. ABC-123), unfinished requirements or bugs, creating issues, starting/picking up work, implementation plans, branching, PRs, verification, moving to Review, releasing/deploying, or closing issues. Supports minimal (personal projects), standard (small teams), and strict (enterprise) profiles.
---

# Linear Workflow

Manage Linear issues through a unified lifecycle with configurable safety levels. The Skill uses the **Linear integration** provided by the current Agent runtime (Linear MCP, API, connector, or equivalent).

## Five Non-Negotiable Invariants

These rules apply to **all Profiles** and cannot be overridden:

1. **Read-Before-Write** — Re-read the issue before any status change to prevent lost updates
2. **Write-Back Verification** — Confirm every write succeeded by reading back the new state
3. **Authorization** — Require explicit user authorization before creating or modifying issues
4. **Team/Project Boundary** — Respect team and project scope; escalate cross-boundary writes
5. **Reality Check** — Report completion only with evidence matching the configured `completion_gate`

See [references/invariants.md](references/invariants.md) for detailed definitions and test cases.

## Unified Lifecycle

All Profiles share the same state machine:

```text
discover → plan → started → review → release → completed
```

**State Types** (Linear API): `backlog` → `unstarted` → `started` → `completed` → `canceled`

**Canonical Identifier**: Use boundary-safe regex `\b[A-Z0-9]{1,5}-\d+\b` to extract issue IDs.

## Profiles

Linear Workflow offers three profiles that adjust confirmation frequency, audit detail, and automation level while preserving the unified lifecycle:

| Profile | Use Case | Key Traits |
|---|---|---|
| **minimal** | Personal projects, 1–2 people | Implicit plan confirmation, PR-ready review gate, no audit comments |
| **standard** | Small teams (3–5 people) | Risk-based plan confirmation, PR-ready review gate, summary audit comments |
| **strict** | Enterprise, multi-team, regulated | Explicit plan confirmation, user acceptance review gate, detailed audit comments |

See [references/configuration-schema.md](references/configuration-schema.md) for complete profile definitions and configuration.

## Execution Context & Workflow Binding (optional)

Optionally retain local execution memory and freeze per-issue governance. Controlled by the `execution_context` config (`mode: disabled | auto | required`; default `disabled`). The full protocol — Workflow Binding (Layer 1, frozen governance metadata) and Execution Context (Layer 2, `execution_context_v1` working memory) — is in [references/execution-context.md](references/execution-context.md). When `mode: disabled` (default), no local files are created and behavior is unchanged.

## Quick Start

### 1. Discover or Create an Issue

**User**: "Create a feature to add dark mode"  
**Agent**: Reads user request, asks clarifying questions if needed, creates issue with template, returns issue ID.

### 2. Start Work

**User**: "Start work on ABC-123"  
**Agent**: Reads issue, forms implementation plan, confirms (based on profile), creates branch, updates issue to `started`.

### 3. Implement and Push

**User**: "I've pushed the changes"  
**Agent**: Verifies PR is created and CI passes, moves issue to `review` (based on review_gate).

### 4. Mark Done

**User**: "Mark ABC-123 as done"  
**Agent**: Verifies completion evidence (based on completion_gate), moves issue to `completed`.

### Configuration

Create `linear-workflow.config.yaml` in your project:

```yaml
version: 1
profile: standard
```

To override specific strategy items:

```yaml
version: 1
profile: minimal
overrides:
  review_gate: user_acceptance
  audit_comments: summary
```

Run `linear-workflow config diagnose` to see the effective configuration.

**Optional Execution Context.** By default (`execution_context.mode: disabled`) the skill keeps no local working memory and creates no per-issue Workflow Binding beyond the minimal governance record. Set `execution_context.mode: auto` to let the Agent decide per issue, or `required` to always retain an `execution_context_v1` plan. See [references/execution-context.md](references/execution-context.md) for the full protocol.

## Reference Files

Load only when relevant to the current phase:

| File | When to Load |
|---|---|
| [references/invariants.md](references/invariants.md) | Understanding the five non-negotiable rules |
| [references/configuration-schema.md](references/configuration-schema.md) | Configuring profiles and strategy items |
| [references/capability-discovery.md](references/capability-discovery.md) | First Linear operation in session |
| [references/execution-context.md](references/execution-context.md) | Optional Execution Context (Layer 2) + Workflow Binding (Layer 1) protocol |
| [references/issue-discovery.md](references/issue-discovery.md) | Browsing, creating, or querying issues |
| [references/start-implementation.md](references/start-implementation.md) | Reading issue, planning, branching, implementing |
| [references/move-to-review.md](references/move-to-review.md) | Verification, acceptance, moving to Review |
| [references/output-contracts.md](references/output-contracts.md) | Error handling, idempotency, audit format |
| [references/project-scope.md](references/project-scope.md) | Scope boundary decisions |
| [references/resume-work.md](references/resume-work.md) | Resuming interrupted work |
| [mark-done.md](mark-done.md) | Marking issues Done (independently callable) |
| [templates/](templates/) | Issue creation templates |

## Transition Table

| Current State | Allowed Actions | Evidence Required |
|---|---|---|
| `backlog` / `unstarted` | Start work → `started` | User confirms start (implicit or explicit per profile) |
| `started` (implementation) | Move to review → `started` (review) | User says "verified" or PR ready (per review_gate) |
| `started` (review) | Mark done → `completed` | Completion evidence per configured completion_gate |
| `completed` / `canceled` | None (unless explicit reopen) | — |

## Safety Escalations

- **Ambiguous state mapping** → Ask user which state to use
- **Cross-project writes** → Require explicit user confirmation (per project_check)
- **Missing capabilities** → Report limitation, do not simulate
- **Timeout** → Re-read before retry
- **Already in target state** → Skip, do not re-write
- **Invariant violation** → Report which invariant and why, do not proceed

## Supported Operations

- **Create Issue**: From user request or template
- **Read Issue**: Get current state, metadata, linked issues
- **Start Work**: Create branch, update to `started`
- **Move to Review**: Update to `review` (per review_gate)
- **Mark Done**: Update to `completed` (per completion_gate)
- **Resume Work**: Detect and recover interrupted work (branch, PR, CI state)
- **Release Coordination**: Automatically close related issues (per release_reconciliation)

## Error Handling

All errors are reported with:
1. **What happened**: Clear description of the error
2. **Why it happened**: Root cause or constraint violated
3. **What to do**: Suggested next steps

Example:

```
Error: Cannot mark ABC-123 as done
Reason: completion_gate is "production_deployment" but no deployment evidence found
Action: Provide deployment evidence (logs, health check, etc.) or change completion_gate
```

---

**Version**: 0.5.0  
**Last Updated**: 2026-07-17  
**Profile Support**: minimal, standard, strict
