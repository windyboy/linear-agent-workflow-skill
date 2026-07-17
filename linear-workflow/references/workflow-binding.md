# Workflow Binding: Read / Write / Read-back (Layer 1 Integration)

Concrete, host-executable procedure for the **Layer 1 Workflow Binding**. The
normative contract — payload shape, fingerprint, and the 0/1/>1/mismatch
resolution table — lives in [execution-context.md](execution-context.md). This
file specifies **how** the Agent host performs the three capabilities
(`read_binding`, `write_binding`, `read_back_binding`) against Linear.

This file performs **no** Linear I/O itself. At runtime, the Agent **must use
the discovered Linear MCP capabilities** to execute each read, write, and
read-back step; it must not simulate a Binding write with local files, a Node
helper, or prose. The host discovers the underlying MCP tools rather than
assuming a particular tool name (see
[capability-discovery.md](capability-discovery.md)).

In the current Linear MCP integration, the capability mapping is typically:

| Operation | MCP capability | Required use |
| --- | --- | --- |
| Resolve immutable issue data | Get issue | Read `id`/UUID and `teamId` before matching a Binding. |
| Read Binding comments | List issue comments | Paginate the issue's comments and parse only Binding envelopes. |
| Write a Binding | Create issue comment | Create one top-level comment whose body is the serialized envelope. |
| Read back | List issue comments again | Re-list comments after the write; never reuse the pre-write response. |

Tool names are runtime-specific (for example, `linear_get_issue`,
`linear_list_comments`, and `linear_save_comment` in the current MCP), so
capability discovery remains mandatory. If the Linear MCP does not expose both
comment listing and comment creation, Binding support is unavailable and the
workflow must fail closed.

> **Scope guardrails** (mirrors execution-context.md §3): no Hooks, no
> session-store readers, no host-private runtime, no automatic `.gitignore`
> edits, no automatic directory rename, no multi-agent locking. The Binding is
> Linear-side governance metadata only — never a workflow authority.

---

## 1. Storage model

The Binding is persisted as a **Linear issue comment** carrying a
machine-readable envelope. The envelope is the single source of truth; any
prose around it is advisory only.

```text
---linear-workflow-binding---
schema_version: execution_binding_v1
issue_uuid: <immutable Linear issue UUID>
team_id: <team UUID>
profile: minimal | standard | strict
resolved_strategies: {"plan_confirmation":..., "review_gate":..., "completion_gate":..., "audit_comments":..., "project_check":..., "release_reconciliation":..., "output_verbosity":...}
execution_context: {"mode": "disabled"|"auto"|"required", "root":..., "format":...}
configured_mode: disabled | auto | required
context_decision: enabled | not_needed
bound_at: <ISO-8601 timestamp>
payload_fingerprint: <sha256 hex>
---end-linear-workflow-binding---
```

- Envelope delimiters `---linear-workflow-binding---` … `---end-linear-workflow-binding---`
  are stable and unique, enabling **de-dup and forge detection**.
- `payload_fingerprint` is `SHA-256(canonicalJSON(frozen payload without bound_at
  and without payload_fingerprint))` — deterministic integrity, not authenticity
  (anyone who can write the comment can recompute it).
- The host serializes/parses with `serializeBinding` / `parseBinding` (the pure
  helpers in `scripts/binding-payload.mjs`) so every host produces an identical
  envelope.

---

## 2. Capability mapping (discover, don't assume)

| Capability | Underlying Linear capability | Discovered via |
| --- | --- | --- |
| `read_binding(issue)` | Linear MCP: get issue + list comments | `Get/add comments` (capability-discovery.md) |
| `write_binding(issue, payload)` | Linear MCP: create issue comment | `Get/add comments` (capability-discovery.md) |
| `read_back_binding(issue, expected)` | Linear MCP: list comments again + verify | same as `read_binding` |

If the host **cannot** list and add comments on the issue, the Binding
capability is **unsupported → fail closed**: do not start implementation, and
never invent a historical binding.

---

## 3. `read_binding(issue)`

Retrieve the Binding(s) for an issue.

1. Call the discovered Linear MCP **get-issue** capability and resolve the
   issue's immutable `issue_uuid` and `team_id` from its response
   (never trust a display id for matching).
2. Call the discovered Linear MCP **list-comments** capability for that issue.
   Paginate and only report retrieved pages — do not
   claim a complete set you did not fetch.
3. For each comment body, extract the Binding envelope via `parseBinding`.
   Comments without the envelope are ignored.
4. `classifyBindings(parsed, issue_uuid)` → `{ count, matches }` (0 / 1 / >1
   matches keyed by `issue_uuid`).
5. Return the classified result. Do **not** mutate anything.

---

## 4. `write_binding(issue, payload)`

Persist a frozen Binding. **Preconditions**: the implementation plan has
converged, the `execution_context` decision is made, and the user has authorized
start (per the effective `plan_confirmation`). This must run **before** any
started-state write.

1. `validateBinding(payload)` — fail closed if invalid (e.g., fingerprint
   mismatch, missing strategy, bad `configured_mode`).
2. `serializeBinding(payload)` → envelope text.
3. Call the discovered Linear MCP **create-comment** capability with the issue
   identifier and envelope as the comment body (an optional short advisory
   prose line above the envelope is allowed but not required).
4. Do **not** claim success yet — call `read_back_binding` to verify through a
   fresh Linear MCP comment-list response.

The minimal Binding record is written even when `audit_comments: none`; it is
Layer 1 governance, not an audit comment.

---

## 5. `read_back_binding(issue, expected)`

Verify the written Binding matches the intended frozen payload.

1. `read_binding(issue)` to re-list the issue's comments through Linear MCP;
   this is a fresh external read, not a cached pre-write result.
2. `parseBinding` each; `classifyBindings` by `issue_uuid`.
3. Expect exactly **1** match. If `count` is 0 or >1 → fail closed (report; see
   §7).
4. `verifyBinding(actual, expected)`:
   - `ok: true` → report success.
   - mismatch on `issue_uuid` / `schema_version` / `payload_fingerprint` →
     **report, do not claim success, do not overwrite**.

---

## 6. Resolution algorithm (ties execution-context.md §2.4 to the operations)

| Scenario | Operation |
| --- | --- |
| **0 bindings**, new issue, first authorized start | `write_binding` then `read_back_binding`; on verify ok → proceed to started-state write |
| **0 bindings**, legacy-marked issue | Recover via the legacy flow; **do not** backfill a historical Binding |
| **0 bindings**, a v1 Context references a Binding | **Fail closed** — this is **not** a legacy issue |
| **1 binding** | `read_binding`; `verifyBinding`; match → reuse (no rewrite); mismatch → report a config/history conflict and stop |
| **>1 bindings** | **Fail closed**; require the user to resolve the duplicate before proceeding |
| **payload mismatch** (frozen config differs from resolved) | **Do not overwrite**; report a config/history conflict and require user direction |

Idempotency: a second `write_binding` with an identical `payload_fingerprint`
for the same `issue_uuid` is a **duplicate** — de-dup, do not create a third
comment.

---

## 7. Fail-closed terminal cases

- **Unsupported Binding capability** → do not start implementation; never invent
  a historical binding.
- **>1 binding** → pause, require user resolution of the duplicate.
- **read-back mismatch** → report, do not claim success, do not overwrite.
- **write failure** → do not create the branch or modify code; report the
  failure truthfully.
- **context conflict / paused** → report in the current output; never auto-repair
  (see output-contracts.md).

Use the standard error format from output-contracts.md:

```text
Issue: <id>
Step: <read-back / write>
Result: <resolved | observed conflict>
Error reason: <capability unsupported | >1 binding | fingerprint mismatch | write failed>
Retryable: <yes|no>
Suggested action: <resolve duplicate | re-read baseline | obtain comment capability>
```

---

## 8. De-dup / forge detection

The envelope delimiters plus `payload_fingerprint` let the host detect duplicate
or forged Binding comments:

- **Duplicate**: a second comment with an identical `payload_fingerprint` for the
  same `issue_uuid` is a re-post — de-dup, never create a third.
- **Forged / tampered**: a comment whose recomputed `computeFingerprint` differs
  from its stated `payload_fingerprint` is untrustworthy — report it and never
  treat it as authoritative.

Authenticity is out of scope for v0.5 (no signature / protected metadata); the
fingerprint provides integrity and duplicate-consistency only.
