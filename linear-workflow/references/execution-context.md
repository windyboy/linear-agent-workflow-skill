# Execution Context & Workflow Binding (v0.5)

Normative protocol for optional Layer 2 (local) and Layer 1 (Linear). Node helpers in `scripts/` validate only — no Linear I/O.

**Out of scope:** hooks, session stores, auto `.gitignore` edits, multi-agent locking, local state as release evidence.

## Two Layers

| Layer | What | Where | Authority |
|---|---|---|---|
| **1 — Binding** | Frozen governance (profile + 7 strategies + context mode) | Linear comment | Governance only |
| **2 — Context** | `plan.md`, `findings.md`, `progress.md` | Local `root` (default `.agent-work`) | Working memory only |

Five invariants unchanged. No sixth invariant.

## Layer 1: Workflow Binding

Capabilities (via Linear provider): `read_binding` · `write_binding` · `read_back_binding`. Procedure: [workflow-binding.md](workflow-binding.md).

### Payload

```
schema_version: execution_binding_v1
issue_uuid / issue_identifier / team_id
profile: minimal | standard | strict
resolved_strategies: { all 7 items }
execution_context: { mode, root, format }
configured_mode / context_decision (auto only)
bound_at / payload_fingerprint
```

Envelope: `---linear-workflow-binding---` … `---end-linear-workflow-binding---`

Fingerprint: `SHA-256(canonicalJSON(payload without bound_at and payload_fingerprint))` — integrity only, not authenticity.

### Resolution

| Case | Action |
|---|---|
| 0 bindings, new issue | Create before started write; read back |
| 0 bindings, legacy | Legacy flow; no backfill |
| Context refs missing binding | Fail closed |
| 1 binding | Verify fingerprint; reuse or stop on mismatch |
| >1 bindings | Fail closed |
| Payload mismatch | Don't overwrite; report |

`auto` mode: record `context_decision: enabled|not_needed` once after plan; don't re-evaluate on resume.

## Layer 2: Context Format

### `plan.md` frontmatter

```markdown
---
format: execution_context_v1
issue: { uuid, display_id }
context_status: prepared | active | paused | abandoned | completed
context_revision: <int>
plan_hash: <sha256>
---
```

Phase statuses: `not_started` · `in_progress` · `completed` · `excepted` (≠ context_status).

### State machine

```
prepared → active ⇄ paused → completed/abandoned (terminal)
```

## Conflict Handling

Detect via `context_revision` + plan hash (not mtime). Mismatch → don't modify files; report `observed context conflict`; require user selection. Cross-file updates not atomic — re-read before write, bump revision after.

## Auto-Decision (`mode: auto`)

`enabled` if any: multi-session, ≥3 phases, migration/rollback, user requests tracking, unreconstructable interrupt. Simple one-file fix → `not_needed`.

## Gitignore

| Mode | Unignored root |
|---|---|
| `required` | Fail closed before started write |
| `auto` | Explain risk; require user direction |
| `disabled` | N/A (no files) |

Skill never edits `.gitignore`.

## Resume

Match contexts by issue UUID. Stale display ID → report, don't rename. Multiple candidates → user selects. Ghost branch / drift → pause. Recovery: five questions in [resume-work.md](resume-work.md); external evidence wins.

## Safety

- `findings.md` cannot carry governance fields (injection immunity)
- Redact secrets and personal paths before surfacing in comments
- Templates get no context fields; `mark-done.md` works with zero context
