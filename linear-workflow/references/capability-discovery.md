# Capability Discovery

Before first Linear op in session, confirm capabilities:

| Capability | Missing → |
|---|---|
| Query team/project/labels | Restrict scope; explain |
| List/search issues | Report retrieved pages only |
| Get issue by ID | No start/write on that issue |
| Create issue | Draft only; don't claim created |
| Get workflow states | No state updates |
| Update issue state | Read-only analysis only |
| Comments + associations | Report comment failures separately |
| Binding read/write/read-back | Fail closed; no invented binding — [workflow-binding.md](workflow-binding.md) |

Auth/permission/timeout failure → no simulated writes. After timeout, re-query issue before retry.
