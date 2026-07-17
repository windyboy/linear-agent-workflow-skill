# Configuration Guide

This guide explains how to configure Linear Workflow for your project using Profiles and strategy items.

## Configuration File

Create a `linear-workflow.config.yaml` file in your project root:

```yaml
version: 1
profile: standard
```

The configuration file is optional. If not provided, the default profile is `standard`.

## Profiles

### minimal

**Best for**: Personal projects, rapid prototyping, 1–2 person teams.

```yaml
version: 1
profile: minimal
```

**Behavior**:
- Plan confirmation is implicit (user says "start work" = authorization to start)
- Move to Review when PR is ready and CI passes
- Mark Done when user confirms release
- No audit comments
- No project scope checking
- No automatic release coordination

**When to use**:
- You're the only developer
- You want minimal confirmation overhead
- You trust your own judgment on when to move between states

### standard

**Best for**: Small teams (3–5 people), general projects.

```yaml
version: 1
profile: standard
```

**Behavior**:
- Plan confirmation is risk-based (automatic for simple changes, escalate for risky ones)
- Move to Review when PR is ready and CI passes
- Mark Done when user confirms release
- Add summary audit comments (what changed, key files, verification status)
- Check project scope if configured
- Coordinate release scope on request

**When to use**:
- You have a small team
- You want a balance between speed and accountability
- You need basic audit trail for decisions

### strict

**Best for**: Enterprise, multi-team, regulated projects.

```yaml
version: 1
profile: strict
```

**Behavior**:
- Plan confirmation is explicit (always require user confirmation before starting)
- Move to Review only after user acceptance
- Mark Done only when production deployment is confirmed
- Add detailed audit comments (decision rationale, evidence, timeline)
- Always check project scope
- Automatically coordinate release scope

**When to use**:
- You have multiple teams working on the same codebase
- You need comprehensive audit trail for compliance
- You want automatic coordination across releases

## Overriding Strategy Items

You can override specific strategy items while keeping the profile as a base:

```yaml
version: 1
profile: minimal

overrides:
  review_gate: user_acceptance
  audit_comments: summary
```

This configuration uses the `minimal` profile but:
- Requires user acceptance before moving to Review (instead of PR-ready)
- Adds summary audit comments (instead of none)

### Valid Overrides

You can override any of these strategy items:

- `plan_confirmation`: implicit / risk_based / explicit
- `review_gate`: pr_ready / user_acceptance
- `completion_gate`: release_confirmed / production_deployment / manual
- `audit_comments`: none / summary / detailed
- `project_check`: disabled / when_configured / required
- `release_reconciliation`: disabled / on_request / enabled
- `output_verbosity`: minimal / standard / detailed

### Forbidden Combinations

Some combinations are not allowed because they violate the five non-negotiable Invariants:

- `minimal` + `completion_gate: production_deployment` — Use `standard` or `strict` instead
- `completion_gate: merge` — Violates Reality Check; use `release_confirmed` or `production_deployment`
- `completion_gate: production_deployment` + `plan_confirmation: implicit` — Too risky; use `explicit` or `risk_based`

If you try to create a forbidden combination, the configuration will be rejected with a clear error message.

## Strategy Items

### plan_confirmation

**Controls**: Whether the Agent requires explicit confirmation of the implementation plan before starting work.

| Value | Behavior |
|---|---|
| `implicit` | User says "start work on ABC-123" → Agent starts immediately after reading and planning |
| `risk_based` | Agent starts immediately for simple changes; escalates for risky changes (DB migration, API change, etc.) |
| `explicit` | Agent always requires user confirmation before starting |

**Example**: With `plan_confirmation: risk_based`, the Agent might say:

```
This change involves a database migration. Do you want to proceed?
- Yes, start work
- No, cancel
- Show me the migration plan first
```

### review_gate

**Controls**: When the Agent moves an issue to Review state.

| Value | Behavior |
|---|---|
| `pr_ready` | Move to Review when PR is created and CI passes |
| `user_acceptance` | Move to Review only after user explicitly confirms implementation is complete |

**Example**: With `review_gate: user_acceptance`, the Agent waits for:

```
User: "I've tested the changes locally, they work"
Agent: "Moving ABC-123 to Review"
```

### completion_gate

**Controls**: What evidence is required to mark an issue as Done.

| Value | Behavior |
|---|---|
| `release_confirmed` | Mark Done when user confirms release or provides release evidence |
| `production_deployment` | Mark Done only when code is verified running in production |
| `manual` | Mark Done only when user explicitly says so |

**Example**: With `completion_gate: production_deployment`, the Agent requires:

```
User: "The changes are now live in production"
Agent: "Verified. Marking ABC-123 as Done"
```

### audit_comments

**Controls**: The detail level of audit comments added to issues during state transitions.

| Value | Behavior |
|---|---|
| `none` | No audit comments |
| `summary` | Brief comment: what changed, key files, verification status |
| `detailed` | Complete audit trail: decision rationale, evidence, timeline, root cause |

**Example**: With `audit_comments: detailed`, the Agent adds:

```
Moved to Review
- Implementation complete: 3 files changed, 120 lines added
- Key changes: Added dark mode toggle, updated CSS variables
- Verification: Tested on Chrome, Firefox, Safari
- Evidence: PR #42, CI passed
- Decision: User confirmed implementation is complete
```

### project_check

**Controls**: Whether the Agent verifies project scope before writing.

| Value | Behavior |
|---|---|
| `disabled` | Skip project check; only verify team |
| `when_configured` | If project is configured in the workflow, verify it; otherwise skip |
| `required` | Always verify project scope; escalate if ambiguous |

**Example**: With `project_check: required`, the Agent verifies:

```
Issue ABC-123 is in team "Engineering", project "Backend"
Current context: team "Engineering", project "Backend"
✓ Scope matches, proceeding
```

### release_reconciliation

**Controls**: Whether the Agent automatically coordinates issue closure across a release.

| Value | Behavior |
|---|---|
| `disabled` | Agent only closes the explicitly requested issue |
| `on_request` | Agent closes related issues only when user explicitly requests it |
| `enabled` | Agent automatically identifies and closes all related issues in the release |

**Example**: With `release_reconciliation: enabled`, when marking ABC-123 as done:

```
Release v1.2.0 includes:
- ABC-123 (primary)
- ABC-124 (related feature)
- ABC-125 (related bug fix)

Closing all three issues and adding release notes
```

### output_verbosity

**Controls**: The detail level of Agent output and reports.

| Value | Behavior |
|---|---|
| `minimal` | Only essential information: action taken, result, errors |
| `standard` | Summary of action, key decisions, verification results |
| `detailed` | Complete trace: all decisions, evidence, alternative paths considered |

## Execution Context (Layer 2)

Execution Context is an **optional, independent** local working-memory layer. It is NOT one of the seven Profile strategy items and never changes gate/state/branch/completion semantics. It is disabled by default.

```yaml
version: 1
profile: standard

execution_context:
  mode: auto            # disabled | auto | required
  root: .agent-work     # directory for context files (default .agent-work)
  format: execution_context_v1
```

### Modes

| Mode | Behavior |
|---|---|
| `disabled` | No Layer 2 files are created. Newly bound issues still get the minimal Layer 1 Workflow Binding (see below). |
| `auto` | After plan discovery, decide per issue whether to create a context (see Auto-decision). |
| `required` | Always create a context for newly managed issues. |

### Auto-decision (mode: auto)

The decision is made **once** after plan discovery and must not be re-evaluated on resume. Triggers for `enabled`:
- Spans multiple sessions
- ≥ 3 meaningful phases
- Multi-module / migration / rollback / unknowns
- User requests progress tracking
- Interrupted issue that is unreconstructable

A single simple change (e.g. a one-file spelling fix) → `not_needed`.

### Workspace hygiene

- `root` defaults to `.agent-work` and **must be gitignored** by the repo. The skill **verifies** but never edits `.gitignore`.
- `required` + unignored root → fail closed before any started-state write.
- `auto` + unignored root → explain the risk and require user direction before creating any context file.
- No Git repository → report that ignore status cannot be verified.

### Relationship to Workflow Binding (Layer 1)

Execution Context is Layer 2 (local working memory). The **Workflow Binding** is Layer 1: a frozen, per-issue governance record (profile + the seven resolved strategies + the resolved execution_context mode). It is created once for a newly managed issue, after plan convergence and the Context decision, and before any started-state write. Pre-v0.5 issues with no binding recover via the legacy flow without backfilling a historical binding. See [references/execution-context.md](references/execution-context.md) for the full protocol.

## Diagnosing Configuration

To see the effective configuration for your project:

```bash
linear-workflow config diagnose
```

**Output**:

```
Linear Workflow Configuration Diagnosis
========================================

Effective Profile: standard
Source: built-in default

Strategy Items:
  plan_confirmation: risk_based (from profile)
  review_gate: pr_ready (from profile)
  completion_gate: release_confirmed (from profile)
  audit_comments: summary (from profile)
  project_check: when_configured (from profile)
  release_reconciliation: on_request (from profile)
  output_verbosity: standard (from profile)

Invariants:
  ✓ Read-before-write verification enabled
  ✓ Write-back verification enabled
  ✓ Authorization check enabled
  ✓ Team boundary check enabled
  ✓ Reality check enabled

Warnings:
  None

Configuration File: /home/user/project/linear-workflow.config.yaml
Last Loaded: 2026-07-15T10:30:00Z
```

## Common Configurations

### Personal Project

```yaml
version: 1
profile: minimal
```

Fast, minimal overhead, no audit trail.

### Small Team with Audit Trail

```yaml
version: 1
profile: standard
```

Balanced safety and speed, brief audit trail.

### Enterprise with Full Traceability

```yaml
version: 1
profile: strict
```

Comprehensive confirmations, detailed audit trail, automatic coordination.

### Small Team with Production Deployment Verification

```yaml
version: 1
profile: standard
overrides:
  completion_gate: production_deployment
  audit_comments: summary
```

Standard profile (risk-based planning, PR-ready review) but require production deployment evidence before marking done. (Note: `minimal` cannot use `production_deployment` — see Forbidden Combinations.)

### Small Team with Explicit Planning

```yaml
version: 1
profile: standard
overrides:
  plan_confirmation: explicit
```

Standard profile but require explicit confirmation before starting work.

## Migration from v0.2.0

Linear Workflow v0.2.0 (no profiles) enforced strict confirmations and detailed audit trails. To migrate to v0.3.0:

1. **Identify current behavior**: Review current `mark-done.md` and `SKILL.md`
2. **Choose appropriate profile**: Map current behavior to minimal, standard, or strict
3. **Create configuration file**: Add `linear-workflow.config.yaml` with chosen profile
4. **Test with new profile**: Verify behavior matches expectations
5. **Adjust if needed**: Use overrides to fine-tune specific strategy items

### Migration Example

**v0.2.0 behavior**:
- Always require user confirmation before starting
- Always require user acceptance before moving to Review
- Always require production deployment evidence for Done
- Always add detailed audit comments

**Equivalent v0.3.0 configuration**:

```yaml
version: 1
profile: strict
```

No overrides needed; strict profile matches v0.2.0 behavior exactly.

## Troubleshooting

### Configuration Rejected

**Error**: "Forbidden combination: minimal profile cannot override completion_gate to production_deployment"

**Solution**: Use `standard` or `strict` profile instead of `minimal` if you need production deployment verification.

### Configuration Not Applied

**Check**:
1. Is the file named `linear-workflow.config.yaml`?
2. Is it in the project root?
3. Does it have valid YAML syntax?
4. Run `linear-workflow config diagnose` to see what's loaded

### Unexpected Behavior

**Debug**:
1. Run `linear-workflow config diagnose` to see effective configuration
2. Check which strategy items are different from expected
3. Verify overrides are spelled correctly
4. Check if the issue is in a different project or team

---

**For more details**, see:
- [references/invariants.md](references/invariants.md) — The five non-negotiable rules
- [references/configuration-schema.md](references/configuration-schema.md) — Complete schema definition
- [SKILL.md](SKILL.md) — Main skill documentation
