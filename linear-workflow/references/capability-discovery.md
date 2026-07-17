# Capability Discovery and Safety Boundaries

Before performing the first Linear operation in a session, confirm and record capability mappings by capability rather than tool name:

| Capability | Purpose | Handling when missing |
| --- | --- | --- |
| Query team/workspace, projects, assignees, labels | Determine scope and display fields | Restrict query scope and explain; cannot guess team |
| List/search issues with pagination | Query backlog and candidates | Only report retrieved pages; cannot claim complete results |
| Get full issue by identifier/ID | Read before implementation and writes | Do not start implementation or writes on that issue |
| Create issue | Record confirmed needs/problems in Linear | Can analyze and draft content; must not claim creation |
| Get workflow states (with ID, name, type, order) | Map states | Cannot update state |
| Update issue state | Lifecycle changes | Continue read-only analysis; must not claim mutation |
| Get/add comments and association info | Context and audit comments | When state can be updated, separately report comment not done |
| Read/write/read-back Workflow Binding | Freeze per-issue governance (Layer 1) | If unsupported, fail closed: do not start implementation; never invent a historical binding |

On auth failure, insufficient permissions, timeout, or incomplete fields, do not substitute natural language for actual writes. After a tool timeout, **re-query** the target issue first before deciding whether to retry.
