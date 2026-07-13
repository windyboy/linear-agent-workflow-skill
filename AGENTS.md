# AGENTS.md

Any agent working in this project must follow these rules.

## Linear workflow policy

- For work involving a Linear issue, follow `.forge/skills/linear-workflow/`.
- All Linear queries, creates, and writes default to the current code project's team/project. Cross-project writes require explicit user confirmation per issue.
- Never claim an issue state changed unless the Linear MCP write succeeded and a read-back verified it.
- Do not claim or start an issue unless the user explicitly selects it and confirms the issue understanding.
- Move an issue to a `started` state only after reading the full issue, producing an implementation plan, and receiving explicit user confirmation to begin (per `linear-workflow/SKILL.md` §3).
- Code completion or passing CI is not user verification. Move to In Review only when the user explicitly says they verified it (for example, “I tested it” or “verification passed”).
- Move an issue to `completed` only after an actual production release, deployment, or other release evidence has been confirmed.
- Resolve workflow states from the team via MCP. Use state IDs for writes and state types for semantic decisions; never assume state names or IDs.
- If MCP is unavailable or any required operation fails, stop the state change and report the failure.
- Prefer commit messages containing a complete Linear identifier such as `ABC-123`; extract identifiers with a boundary-safe match (`\b[A-Z]{1,5}-\d+\b`) so `ABC-12` does not match `ABC-123`.

## General principles

- The skill defines the procedure; this file defines non-negotiable constraints. This file wins on conflict.
