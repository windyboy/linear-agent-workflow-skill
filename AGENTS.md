# AGENTS.md

Any agent working in this project must follow these rules.

## Linear workflow policy

- For work involving a Linear issue, follow the `linear-workflow/` skill in this repository (the source of truth). The host runtime installs a copy at `.forge/skills/linear-workflow/`; edit the repository source, not the installed copy.
- Never claim an issue state changed unless the Linear MCP write succeeded and a read-back verified it.
- Do not claim or start an issue unless the user explicitly selects it and confirms the issue understanding.
- Move an issue to a `started` state only after the phase-2 workflow has been completed.
- Code completion or passing CI is not user verification. Move to In Review only when the user explicitly says they verified it (for example, “I tested it” or “verification passed”).
- Move an issue to `completed` only after an actual production release, deployment, or other release evidence has been confirmed.
- Resolve workflow states from the team via MCP. Use state IDs for writes and state types for semantic decisions; never assume state names or IDs.
- If MCP is unavailable or any required operation fails, stop the state change and report the failure.
- Prefer commit messages containing a complete Linear identifier such as `ABC-123`; extract identifiers with a boundary-safe match.

## General principles

- The skill defines the procedure; this file defines non-negotiable constraints. This file wins on conflict.
