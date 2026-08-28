# Workflow Binding (Layer 1)

Host procedure for `read_binding` / `write_binding` / `read_back_binding`. Contract: [execution-context.md](execution-context.md). No Linear I/O in this file — at runtime the Agent **must use the discovered Linear MCP capabilities**.

| Step | MCP |
|---|---|
| Read | Linear MCP **get-issue**; Linear MCP **list-comments** |
| Write | Linear MCP **create-comment** |
| Read-back | Linear MCP **list-comments** again — fresh external read, not a cached pre-write result |

Discover tools per [capability-discovery.md](capability-discovery.md). No list+create → fail closed.

## Storage

Linear issue comment with envelope:

```text
---linear-workflow-binding---
schema_version: execution_binding_v1
issue_uuid / issue_identifier / team_id
profile / resolved_strategies / execution_context
configured_mode / context_decision
bound_at / payload_fingerprint
---end-linear-workflow-binding---
```

Serialize/parse via `scripts/binding-payload.mjs`. `issue_uuid` only when MCP exposes immutable UUID.

## Operations

### `read_binding(issue)`

1. Get issue → team_id, display ID, UUID (if available)
2. List comments (paginate); `parseBinding` each
3. `classifyBindings` by UUID or comment scope
4. Return; don't mutate

### `write_binding(issue, payload)`

Preconditions: plan converged, context decision made, start authorized. **Before** started-state write.

1. `validateBinding(payload)`
2. `serializeBinding` → envelope
3. Create comment via MCP
4. `read_back_binding` — don't claim success until verified

Written even when `audit_comments: none`.

### `read_back_binding(issue, expected)`

1. Fresh `read_binding` (fresh external read, not a cached pre-write result)
2. Expect exactly 1 match
3. `verifyBinding` — fingerprint/uuid/schema mismatch → report, don't overwrite

## Resolution

| Case | Action |
|---|---|
| 0, new issue | write + read_back → started write |
| 0, legacy | legacy flow |
| 0, context refs binding | fail closed |
| 1, match | reuse |
| 1, mismatch | stop; report conflict |
| >1 | user resolves |
| duplicate fingerprint | de-dup; no third comment |

## Fail-Closed

Unsupported capability · >1 binding · read-back mismatch · write failure → don't branch/code. Context conflict → report per [output-contracts.md](output-contracts.md).

Fingerprint detects duplicates/tampering. Authenticity out of scope (no signatures).
