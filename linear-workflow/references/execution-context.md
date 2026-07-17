# Execution Context & Workflow Binding (v0.5 Protocol)

This reference defines the optional Execution Context (Layer 2) and the durable
Workflow Binding (Layer 1) for the `linear-workflow` skill. It is the normative
source for the runtime contract; the Node helpers in `scripts/` only validate
payloads and fixtures and perform **no** Linear I/O.

> **Scope guardrails (§3 non-goals):** no Hooks, no session-store readers, no
> host-private runtime, no loop commands, no automatic `.gitignore` edits, no
> tracked logs/auto-archival, no automatic directory rename, no multi-agent
> locking, no local-phase-as-release-evidence, no new top-level issue template.

---

## 1. Two layers

| Layer | What | Storage | Authority |
|---|---|---|---|
| **Layer 1 — Workflow Binding** | Frozen per-issue governance record (profile + 7 resolved strategies + resolved execution_context mode) | Linear-side (comment/metadata) | Source of truth for *governance* |
| **Layer 2 — Execution Context** | Local working memory (`plan.md`, `findings.md`, `progress.md`) | Local `root` directory (default `.agent-work`) | Working memory only — **never** workflow authority |

The five non-negotiable invariants are unchanged. Execution Context adds **no**
sixth invariant and may not override the five.

---

## 2. Workflow Binding (Layer 1)

### 2.1 Capabilities (runtime contract)

The Agent host executes these via its Linear provider. The skill documents the
contract and the fail-closed terminal case.

| Capability | Purpose | Failure behavior |
|---|---|---|
| `read_binding(issue)` | Retrieve the binding(s) for an issue | 0 / 1 / >1 / mismatch → resolve per §2.4 |
| `write_binding(issue, payload)` | Persist a frozen binding | On failure, do **not** start implementation |
| `read_back_binding(issue)` | Verify the written binding matches | Mismatch → report, do not claim success |

The concrete host-executable procedure — storage model (Linear comment +
envelope), capability mapping, the exact `read` / `write` / `read-back` steps,
and the resolution tie-in — is in
[references/workflow-binding.md](workflow-binding.md). That file performs no
Linear I/O; the host executes the steps via its Linear provider.

### 2.2 Payload shape

```
schema_version:    execution_binding_v1
issue_uuid:        <immutable Linear issue UUID, when exposed by the MCP>
issue_identifier:  <required current display identifier snapshot>
team_id:           <team UUID>
profile:           minimal | standard | strict
resolved_strategies:
  plan_confirmation:   <resolved>
  review_gate:         <resolved>
  completion_gate:     <resolved>
  audit_comments:      <resolved>
  project_check:       <resolved>
  release_reconciliation: <resolved>
  output_verbosity:    <resolved>
execution_context: { mode: disabled|auto|required, root, format }
configured_mode:   disabled | auto | required      # the mode as configured
context_decision:  enabled | not_needed            # only meaningful when configured_mode = auto
bound_at:          <ISO timestamp>
payload_fingerprint: <sha256 hex>
```

The binding freezes **all seven** strategy items — never a subset. The minimal
Binding record is **never** suppressed, even when `audit_comments: none`.

### 2.3 Fingerprint (integrity, not authenticity)

```
payload_fingerprint =
  SHA-256( UTF-8( canonicalJSON( frozen_payload
            WITHOUT bound_at AND WITHOUT payload_fingerprint ) ) )
```

- Fixed key ordering (recursive sort) and UTF-8 encoding, so different hosts
  produce identical fingerprints.
- Provides **deterministic integrity and duplicate-consistency checking**. It
  does **NOT** provide authenticity or tamper-proofing — anyone who can write
  the comment can recompute the hash. Authenticity would require a signature or
  protected metadata, which is **out of scope** for v0.5.
- Machine-readable envelope delimiters: `---linear-workflow-binding---` …
  `---end-linear-workflow-binding---` (used for de-dup / forge detection).

### 2.4 Zero-record resolution (per issue)

| Scenario | Behavior |
|---|---|
| New issue, first authorized start, **0 bindings** | Create the binding (after plan convergence + Context decision, before started-state write) and `read_back_binding` to verify. |
| Explicitly **legacy** old issue, **0 bindings** | Recover via the legacy flow; do **not** backfill a historical binding. |
| v1 Context present that **references** a binding, but binding **missing** | **Fail closed** — do not treat as legacy. |
| Migrating an old issue to v0.5 | User must **explicitly trigger** migration; resume never auto-creates a binding. |
| **1 binding** | Verify schema and `payload_fingerprint`; verify `issue_uuid` when the MCP exposes one, otherwise rely on the Linear comment scope and report a stale `issue_identifier` snapshot without rewriting. |
| **>1 bindings** | **Fail closed**; require the user to resolve duplicates. |
| Payload mismatch (fingerprint/uuid/schema) | **Do not overwrite**; report a configuration/history conflict. |

### 2.5 `auto` split

When `configured_mode: auto`, the binding records both:
- `configured_mode: auto`
- `context_decision: enabled | not_needed`

The decision is made **once** after plan discovery and must not be re-evaluated
on resume. If `not_needed`, no Context file exists and the issue proceeds
without Context (legacy).

---

## 3. Execution Context file format (`execution_context_v1`)

### 3.1 `plan.md` frontmatter (restricted grammar)

```markdown
---
format: execution_context_v1
issue:
  uuid: <immutable issue UUID>
  display_id: <current display id; may be stale>
context_status: prepared | active | paused | abandoned | completed
context_revision: <integer, persisted in plan.md>
active_writer: <writer id | null>
plan_hash: <sha256 hex of plan body>
---

## Phases
### Design
Status: completed
### Implement
Status: in_progress
```

- Only the listed top-level keys are allowed; unknown or duplicate keys fail
  closed. The `issue:` block allows only `uuid` / `display_id`.
- `context_revision` is **persisted** in `plan.md`. `last_observed_plan_hash` is
  a **session-only** observation and is **never** written into frontmatter.

### 3.2 Phase statuses

Phases use their own vocabulary: `not_started`, `in_progress`, `completed`,
`excepted`. The context-state vocabulary (`prepared/active/paused/abandoned/
completed`) applies to `context_status` only — never conflate the two via a
whole-file keyword grep.

### 3.3 Context state machine (§9)

```
prepared ──▶ active ──▶ paused ──▶ active
   │           │           │
   ▼           ▼           ▼
abandoned   completed   abandoned
```

`completed` and `abandoned` are terminal. Illegal transitions (e.g.
`prepared → completed`, `completed → active`) are rejected.

---

## 4. Single-writer, lock-free, fail-closed (§10.1, v4 #5)

- Conflict detection uses `context_revision` + last-observed plan hash. **mtime
  is diagnostic only and is never the authoritative conflict detector.**
- On `context_revision` / hash mismatch:
  1. **Do not modify any Execution Context file.**
  2. Report `observed context conflict` in the current output.
  3. Require user selection or explicit takeover.
  4. Only after a new baseline is re-read and confirmed may the skill write
     `paused` / `active`.
- Cross-file updates are **not atomic**. Before writing any Context file,
  re-read and verify `plan.md`'s `context_revision` / hash. After a successful
  mutation, bump `context_revision`. If a recovery finds the log/revision
  inconsistent, report `context consistency uncertain` and **pause** — never
  auto-repair.

---

## 5. Auto-decision (§7.2)

Decide once after plan discovery. `enabled` if any trigger fires:
- Spans multiple sessions
- ≥ 3 meaningful phases
- Multi-module / migration / rollback / unknowns
- User requests progress tracking / staged plan / continuation
- Interrupted issue that is unreconstructable

Examples: a one-file spelling fix → `not_needed`; a DB connection-pool refactor
→ `enabled`.

---

## 6. Gitignore verification (§7.3, verify only)

| Mode | Root state | Action |
|---|---|---|
| any | no Git repo | report: ignore status cannot be verified |
| any | root does not exist | init (will be created) |
| `required` | exists, **not** ignored | **fail closed** before started-state write |
| `auto` | exists, **not** ignored | explain risk, require user direction |
| `disabled` | any | ok (no Layer 2 files created) |

The skill **never** edits `.gitignore`.

---

## 7. Resume, key change, and candidates (§12)

- Discover candidate contexts by **immutable `issue_uuid`**, not display id.
- Issue-key change: match by UUID, **report the stale display id, never
  auto-rename** the directory.
- Multiple candidate contexts → pause and require selection.
- Ghost branch / baseline drift → pause.
- Recovery summary must answer: **Goal? / Where am I? / What remains? / What was
  learned? / What was done and verified?** Externally-verifiable evidence
  (branch/commits/PR/CI/release/deployment) always wins over local memory.

---

## 8. Injection immunity (§8.2)

`findings.md` is working memory. Findings can **never** carry governance fields
(authorization / config / review / done). Injection of such text cannot alter
the Review gate, the completion criteria, or the Binding. This is structural:
the parser returns plain finding strings and performs no governance mutation.

---

## 9. Redaction (§8.3, best-effort)

Before any Context content is surfaced in comments or reports, redact
credential-like tokens (GitHub PAT, AWS key, OpenAI key) and personal absolute
paths. This is defense-in-depth; the authoritative source must never contain
secrets.

---

## 10. Negative constraints (§14)

- Creation templates (`idea-feature`, `bug-report`, `refactor`) receive **no**
  structural Execution Context fields.
- `finding.md` is **not** repurposed as raw local findings storage.
- `mark-done.md` is callable and correct with **zero** Execution Context present.
- When no Context exists, Review and Done behavior is unchanged (effective
  config only).
